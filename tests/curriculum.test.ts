import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  courseSchema,
  entrySchema,
  kindModule,
  hasPermission,
  type Entry,
  type CourseData,
} from "../src/lib/domain";
import {
  publishedCourses,
  filterCourses,
  groupCourses,
  resolveCourseReferences,
  makeCourseSlug,
} from "../src/lib/curriculum";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function entry(
  n: number,
  kind: Entry["kind"],
  title: string,
  data: Record<string, any> = {},
  status: Entry["status"] = "published",
): Entry {
  return {
    id: id(n),
    kind,
    title,
    slug: `entry-${n}`,
    summary: "",
    body: "",
    image: "",
    status,
    sort_order: 0,
    data,
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  };
}
const faculty = entry(1, "faculty", "Computing"),
  otherFaculty = entry(2, "faculty", "Science");
const software = entry(3, "department", "Software Engineering", {
  faculty_id: faculty.id,
  faculty: faculty.title,
});
const computer = entry(4, "department", "Computer Science", {
  faculty_id: faculty.id,
  faculty: faculty.title,
});
const biology = entry(5, "department", "Biology", {
  faculty_id: otherFaculty.id,
  faculty: otherFaculty.title,
});
const directory = [faculty, otherFaculty, software, computer, biology];
const courseData: CourseData = {
  course_code: "COS 101",
  faculty_id: faculty.id,
  department_ids: [software.id, computer.id],
  faculty: faculty.title,
  departments: [software.title, computer.title],
  level: "100",
  semester: "First semester",
  units: 3,
  course_type: "Compulsory",
  session: "",
};
const shared = entry(10, "course", "Introduction to Computing", courseData);
const second = entry(11, "course", "Programming practice", {
  ...courseData,
  course_code: "COS 102",
  department_ids: [software.id],
  semester: "Second semester",
  course_type: "Elective",
  units: 2,
  session: "2026/27",
});
const year = entry(12, "course", "Study skills", {
  ...courseData,
  course_code: "GST 100",
  department_ids: [software.id],
  semester: "Full year",
  units: 0,
});
const science = entry(13, "course", "Introduction to Biology", {
  ...courseData,
  course_code: "BIO 101",
  faculty_id: otherFaculty.id,
  department_ids: [biology.id],
  units: 4,
});
const higher = entry(14, "course", "Software development", {
  ...courseData,
  course_code: "SEN 201",
  department_ids: [software.id],
  level: "200",
  units: 4,
});
const fixtures = [...directory, shared, second, year, science, higher];
test("courses validate real curriculum fields and normalise shared department IDs", () => {
  const data = courseSchema.parse({
    ...courseData,
    course_code: "cos   101",
    department_ids: [software.id, computer.id, software.id],
  });
  assert.equal(data.course_code, "COS 101");
  assert.equal(data.department_ids.length, 2);
  assert.equal(entrySchema.safeParse(shared).success, true);
  for (const invalid of [
    { units: -1 },
    { units: 1.5 },
    { semester: "Third semester" },
    { department_ids: [] },
    { faculty_id: "Computing" },
  ])
    assert.equal(
      courseSchema.safeParse({ ...courseData, ...invalid }).success,
      false,
    );
});
test("a course cannot be published under a department from a different faculty", () => {
  assert.throws(
    () =>
      resolveCourseReferences(
        { ...courseData, department_ids: [biology.id] },
        directory,
        true,
      ),
    /belong to the selected faculty/,
  );
});
test("publication waits for published taxonomy while completed courses can be saved as drafts", () => {
  const draft = directory.map((e) =>
    e.id === software.id ? { ...e, status: "draft" as const } : e,
  );
  assert.throws(
    () =>
      resolveCourseReferences(
        { ...courseData, department_ids: [software.id] },
        draft,
        true,
      ),
    /Publish the selected faculty/,
  );
  assert.equal(
    resolveCourseReferences(
      { ...courseData, department_ids: [software.id] },
      draft,
      false,
    ).departments[0],
    software.title,
  );
});
test("faculty and department renames keep courses attached through stable identifiers", () => {
  const changed = fixtures.map((e) =>
    e.id === faculty.id
      ? { ...e, title: "Faculty of Computing" }
      : e.id === software.id
        ? { ...e, title: "Software & Systems Engineering" }
        : e,
  );
  const records = publishedCourses(changed);
  assert.equal(
    records.find((c) => c.id === shared.id)?.data.faculty,
    "Faculty of Computing",
  );
  assert.ok(
    records
      .find((c) => c.id === shared.id)
      ?.data.departments.includes("Software & Systems Engineering"),
  );
});
test("draft courses stay hidden and archiving one department preserves shared courses for the others", () => {
  const changed = [
    ...fixtures.map((e) =>
      e.id === software.id ? { ...e, status: "archived" as const } : e,
    ),
    entry(20, "course", "Not yet approved", courseData, "draft"),
  ];
  const records = publishedCourses(changed);
  assert.deepEqual(
    records.find((c) => c.id === shared.id)?.data.department_ids,
    [computer.id],
  );
  assert.equal(
    records.some((c) => c.id === second.id),
    false,
  );
  assert.equal(
    records.some((c) => c.id === id(20)),
    false,
  );
});
test("student selections isolate the correct programme and level", () => {
  const records = publishedCourses(fixtures);
  const result = filterCourses(records, {
    faculty: faculty.id,
    department: software.id,
    level: "100",
  });
  assert.deepEqual(
    result.map((c) => c.id),
    [shared.id, second.id, year.id],
  );
  assert.equal(
    result.reduce((sum, c) => sum + c.data.units, 0),
    5,
  );
  assert.equal(
    result.some((c) => c.id === science.id || c.id === higher.id),
    false,
  );
  assert.deepEqual(
    filterCourses(records, { faculty: faculty.id, department: biology.id }),
    [],
  );
});
test("full-year courses appear once in each semester view and grouping preserves the level", () => {
  const records = filterCourses(publishedCourses(fixtures), {
    department: software.id,
    level: "100",
    semester: "Second semester",
  });
  assert.deepEqual(
    records.map((c) => c.id),
    [second.id, year.id],
  );
  assert.deepEqual(
    groupCourses(records).map((g) => [g.level, g.semester, g.courses.length]),
    [
      ["100", "Second semester", 1],
      ["100", "Full year", 1],
    ],
  );
});
test("course-code searches ignore spaces and session filters include generally applicable courses", () => {
  const records = publishedCourses(fixtures);
  assert.deepEqual(
    filterCourses(records, { query: "cos101" }).map((c) => c.id),
    [shared.id],
  );
  assert.equal(
    filterCourses(records, {
      department: software.id,
      session: "2025/26",
    }).some((c) => c.id === second.id),
    false,
  );
  assert.equal(
    filterCourses(records, {
      department: software.id,
      session: "2025/26",
    }).some((c) => c.id === shared.id),
    true,
  );
});
test("course administration uses the existing academic resources permission", () => {
  assert.equal(kindModule("course"), "resources");
  assert.equal(
    hasPermission(
      {
        id: id(100),
        display_name: "Editor",
        email: "editor@example.test",
        role: "staff",
        permissions: ["content"],
        active: true,
      },
      kindModule("course"),
    ),
    false,
  );
});
test("new course slugs distinguish curricula and stay stable when department order changes", () => {
  assert.equal(
    makeCourseSlug(courseData),
    makeCourseSlug({
      ...courseData,
      department_ids: [...courseData.department_ids].reverse(),
    }),
  );
  assert.notEqual(
    makeCourseSlug(courseData),
    makeCourseSlug({ ...courseData, semester: "Second semester" }),
  );
});
test("the upgrade preserves existing records, links legacy departments, and enforces course data in PostgreSQL", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);",
    );
    await pg.exec(
      await readFile("supabase/migrations/202610210001_hub.sql", "utf8"),
    );
    await pg.exec(
      await readFile(
        "supabase/migrations/202610210002_starter_content.sql",
        "utf8",
      ),
    );
    await pg.query(
      "insert into entries(id,kind,title,slug,status,data) values($1,'faculty','Computing','computing','published','{}'),($2,'department','Software Engineering','software-engineering','published',$3)",
      [faculty.id, software.id, { faculty: "Computing" }],
    );
    const before = (
      await pg.query<{ n: number }>("select count(*)::int as n from entries")
    ).rows[0].n;
    await pg.exec(
      await readFile(
        "supabase/migrations/202610220001_course_catalogue.sql",
        "utf8",
      ),
    );
    assert.equal(
      (await pg.query<{ n: number }>("select count(*)::int as n from entries"))
        .rows[0].n,
      before + 1,
    );
    assert.equal(
      (
        await pg.query<{ data: { faculty_id: string } }>(
          "select data from entries where id=$1",
          [software.id],
        )
      ).rows[0].data.faculty_id,
      faculty.id,
    );
    const data = {
      ...courseData,
      department_ids: [software.id],
      departments: [software.title],
    };
    await pg.query(
      "insert into entries(kind,title,slug,status,data) values('course','Introduction to Computing','cos-101','published',$1)",
      [data],
    );
    await assert.rejects(
      pg.query(
        "insert into entries(kind,title,slug,status,data) values('course','Bad units','bad-units','draft',$1)",
        [{ ...data, units: -2 }],
      ),
      /entries_course_data_check/,
    );
    await assert.rejects(
      pg.query(
        "insert into entries(kind,title,slug,status,data) values('course','No departments','no-departments','draft',$1)",
        [{ ...data, department_ids: [] }],
      ),
      /entries_course_data_check/,
    );
    assert.equal(
      (
        await pg.query<{ ok: boolean }>(
          "select has_table_privilege('anon','public.entries','INSERT') as ok",
        )
      ).rows[0].ok,
      false,
    );
    await pg.query(
      "update entries set status='archived' where kind='course' and slug='cos-101'",
    );
    assert.equal(
      (
        await pg.query<{ n: number }>(
          "select count(*)::int as n from entries where kind='course' and status='published'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await pg.close();
  }
});
