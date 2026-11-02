import {
  courseSchema,
  courseSemesters,
  slugify,
  type CourseData,
  type Entry,
} from "./domain";
export type Course = Entry & { data: CourseData };
export type CurriculumFilters = {
  query?: string;
  faculty?: string;
  department?: string;
  level?: string;
  semester?: string;
  session?: string;
};
export function departmentBelongsTo(department: Entry, faculty: Entry) {
  return (
    department.kind === "department" &&
    (department.data.faculty_id
      ? department.data.faculty_id === faculty.id
      : department.data.faculty === faculty.title)
  );
}
export function resolveCourseReferences(
  input: CourseData,
  entries: Entry[],
  publishing: boolean,
): CourseData {
  const faculty = entries.find(
    (e) =>
      e.id === input.faculty_id &&
      e.kind === "faculty" &&
      e.status !== "archived",
  );
  if (!faculty) throw new Error("Choose an existing faculty.");
  const departments = input.department_ids.map((id) =>
    entries.find(
      (e) => e.id === id && e.kind === "department" && e.status !== "archived",
    ),
  );
  if (departments.some((d) => !d || !departmentBelongsTo(d, faculty)))
    throw new Error("Choose departments that belong to the selected faculty.");
  if (
    publishing &&
    (faculty.status !== "published" ||
      departments.some((d) => d!.status !== "published"))
  )
    throw new Error(
      "Publish the selected faculty and departments before publishing their courses.",
    );
  return {
    ...input,
    faculty: faculty.title,
    departments: departments.map((d) => d!.title),
  };
}
export function publishedCourses(entries: Entry[]): Course[] {
  const result: Course[] = [];
  for (const entry of entries) {
    if (entry.kind !== "course" || entry.status !== "published") continue;
    const parsed = courseSchema.safeParse(entry.data);
    if (!parsed.success) continue;
    try {
      const faculty = entries.find(
        (e) =>
          e.id === parsed.data.faculty_id &&
          e.kind === "faculty" &&
          e.status === "published",
      );
      if (!faculty) continue;
      const activeIds = parsed.data.department_ids.filter((id) =>
        entries.some(
          (d) =>
            d.id === id &&
            d.status === "published" &&
            departmentBelongsTo(d, faculty),
        ),
      );
      if (!activeIds.length) continue;
      result.push({
        ...entry,
        data: resolveCourseReferences(
          { ...parsed.data, department_ids: activeIds },
          entries,
          true,
        ),
      });
    } catch {
      /* Draft/archived/unmatched departments are not advertised as current courses. */
    }
  }
  return result;
}
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
export function filterCourses(
  courses: Course[],
  filters: CurriculumFilters = {},
) {
  const {
    query = "",
    faculty = "",
    department = "",
    level = "",
    semester = "",
    session = "",
  } = filters;
  return courses
    .filter(
      (c) =>
        (!query ||
          normalize(`${c.data.course_code} ${c.title} ${c.summary}`).includes(
            normalize(query),
          )) &&
        (!faculty || c.data.faculty_id === faculty) &&
        (!department || c.data.department_ids.includes(department)) &&
        (!level || c.data.level === level) &&
        (!semester ||
          c.data.semester === semester ||
          c.data.semester === "Full year") &&
        (!session || !c.data.session || c.data.session === session),
    )
    .sort(
      (a, b) =>
        Number(a.data.level) - Number(b.data.level) ||
        courseSemesters.indexOf(a.data.semester) -
          courseSemesters.indexOf(b.data.semester) ||
        a.data.course_code.localeCompare(b.data.course_code, undefined, {
          numeric: true,
        }) ||
        a.title.localeCompare(b.title),
    );
}
export function groupCourses(courses: Course[]) {
  const groups = new Map<
    string,
    { level: string; semester: string; courses: Course[] }
  >();
  for (const course of courses) {
    const key = `${course.data.level}:${course.data.semester}`;
    if (!groups.has(key))
      groups.set(key, {
        level: course.data.level,
        semester: course.data.semester,
        courses: [],
      });
    groups.get(key)!.courses.push(course);
  }
  return [...groups.values()];
}
export function makeCourseSlug(data: Partial<CourseData>) {
  const signature = [
    data.course_code,
    data.faculty_id,
    ...[...(data.department_ids || [])].sort(),
    data.level,
    data.semester,
    data.course_type,
    data.session,
  ].join("|");
  let hash = 2166136261;
  for (const character of signature) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${slugify(`${data.course_code || "course"}-${data.level || ""}-${data.semester || ""}`).slice(0, 140)}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
