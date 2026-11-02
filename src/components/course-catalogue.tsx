"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Search,
  ChevronRight,
} from "lucide-react";
import type { HubData } from "@/lib/server";
import { courseLevels, courseSemesters } from "@/lib/domain";
import {
  publishedCourses,
  filterCourses,
  groupCourses,
  departmentBelongsTo,
  type CurriculumFilters,
} from "@/lib/curriculum";
import { Empty } from "./ui";
import { Select } from "./select";
function CourseCatalogueContent({ data }: { data: HubData }) {
  const params = useSearchParams(),
    signature = params.toString();
  const [filters, setFilters] = useState<CurriculumFilters>({});
  useEffect(() => {
    const p = new URLSearchParams(signature);
    setFilters({
      query: p.get("q") || "",
      faculty: p.get("faculty") || "",
      department: p.get("department") || "",
      level: p.get("level") || "",
      semester: p.get("semester") || "",
      session: p.get("session") || "",
    });
  }, [signature]);
  const courses = useMemo(() => publishedCourses(data.entries), [data.entries]);
  const faculties = data.entries.filter((e) => e.kind === "faculty");
  const faculty = faculties.find((e) => e.id === filters.faculty);
  const departments = data.entries.filter(
    (e) =>
      e.kind === "department" && (!faculty || departmentBelongsTo(e, faculty)),
  );
  const department = departments.find((e) => e.id === filters.department);
  const sessions = [
    ...new Set(
      courses
        .filter((c) => !faculty || c.data.faculty_id === faculty.id)
        .map((c) => c.data.session)
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
  const results = filterCourses(courses, filters),
    groups = groupCourses(results);
  const browsing = !!((faculty && department) || filters.query?.trim());
  const set = (key: keyof CurriculumFilters, value: string) =>
    setFilters((old) => ({
      ...old,
      [key]: value,
      ...(key === "faculty" ? { department: "", session: "" } : {}),
    }));
  return (
    <div className="course-catalogue">
      <div className="course-catalogue-intro">
        <GraduationCap size={32} />
        <div>
          <h2>Your department. Your courses.</h2>
          <p>
            Find your programme’s course list before the semester starts. Choose
            a level or semester to narrow it down.
          </p>
        </div>
      </div>
      <div className="review-filter-panel curriculum-filters">
        <label className="curriculum-search">
          Course name or code
          <div className="curriculum-search-field">
            <Search size={19} />
            <input
              type="search"
              value={filters.query || ""}
              maxLength={150}
              onChange={(e) => set("query", e.target.value)}
              placeholder="e.g. COS 101 or Introduction to Computing"
            />
          </div>
        </label>
        <div className="curriculum-filter-grid">
          <label>
            Faculty
            <Select
              value={filters.faculty || ""}
              onChange={(e) => set("faculty", e.target.value)}
            >
              <option value="">Choose your faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Department
            <Select
              value={filters.department || ""}
              onChange={(e) => set("department", e.target.value)}
              disabled={!faculty}
            >
              <option value="">
                {faculty ? "Choose your department" : "Choose a faculty first"}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Level
            <Select
              value={filters.level || ""}
              onChange={(e) => set("level", e.target.value)}
            >
              <option value="">All levels</option>
              {courseLevels.map((v) => (
                <option key={v} value={v}>
                  {v} level
                </option>
              ))}
            </Select>
          </label>
          <label>
            Semester
            <Select
              value={filters.semester || ""}
              onChange={(e) => set("semester", e.target.value)}
            >
              <option value="">All semesters</option>
              {courseSemesters.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          </label>
          {sessions.length > 0 && (
            <label>
              Academic session
              <Select
                value={filters.session || ""}
                onChange={(e) => set("session", e.target.value)}
              >
                <option value="">All sessions</option>
                {sessions.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <button className="clear-review-filters" onClick={() => setFilters({})}>
          Clear filters
        </button>
      </div>
      {!browsing ? (
        <>
          <div className="section-head">
            <div>
              <h2>
                {faculty ? "Pick your department." : "Start with your faculty."}
              </h2>
              <p>
                {faculty
                  ? "Choose your department to see its published curriculum."
                  : "Your courses are organised by what you study."}
              </p>
            </div>
            {faculty && (
              <button className="link" onClick={() => set("faculty", "")}>
                All faculties
              </button>
            )}
          </div>
          <div className="curriculum-directory">
            {faculty
              ? departments.map((d) => {
                  const count = courses.filter((c) =>
                    c.data.department_ids.includes(d.id),
                  ).length;
                  return (
                    <button
                      className="curriculum-directory-card"
                      key={d.id}
                      onClick={() => set("department", d.id)}
                    >
                      <BookOpen />
                      <span>
                        <strong>{d.title}</strong>
                        <small>
                          {count} {count === 1 ? "course" : "courses"} listed
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  );
                })
              : faculties.map((f) => {
                  const count = data.entries.filter(
                    (e) => e.kind === "department" && departmentBelongsTo(e, f),
                  ).length;
                  return (
                    <button
                      className="curriculum-directory-card"
                      key={f.id}
                      onClick={() => set("faculty", f.id)}
                    >
                      <Building2 />
                      <span>
                        <strong>{f.title}</strong>
                        <small>
                          {count} {count === 1 ? "department" : "departments"}
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  );
                })}
          </div>
          {(!faculties.length || (faculty && !departments.length)) && (
            <Empty
              title="The course list is being prepared."
              text="SCF will add the approved faculties, departments and their courses here."
            />
          )}
        </>
      ) : (
        <>
          <div className="curriculum-results-header">
            <div>
              <h2>{department?.title || "Matching courses"}</h2>
              {faculty && <p>{faculty.title}</p>}
            </div>
            <p className="result-count" role="status" aria-live="polite">
              {results.length} {results.length === 1 ? "course" : "courses"} ·{" "}
              {results.reduce((sum, c) => sum + c.data.units, 0)} units listed
            </p>
          </div>
          {results.length > 0 && (
            <p className="curriculum-note">
              Compulsory and elective courses are marked separately. Confirm
              your final registration with your department.
              {filters.semester &&
                " Full-year courses are included in both semester views."}
            </p>
          )}
          {!results.length && (
            <Empty
              title="No courses listed for this selection yet."
              text={
                courses.length
                  ? "Try another level, semester or search, or check back after SCF updates the catalogue."
                  : "SCF will publish the approved curriculum here."
              }
            />
          )}
          {groups.map((group) => (
            <section
              className="curriculum-group"
              key={`${group.level}-${group.semester}`}
              aria-label={`${group.level} level, ${group.semester}`}
            >
              <div className="curriculum-group-heading">
                <h3>
                  {group.level} level <span>·</span> {group.semester}
                </h3>
                <span>
                  {group.courses.length}{" "}
                  {group.courses.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <div className="curriculum-courses">
                {group.courses.map((course) => (
                  <article className="curriculum-course" key={course.id}>
                    <div className="curriculum-course-heading">
                      <span className="course-code">
                        {course.data.course_code}
                      </span>
                      <span
                        className={`curriculum-type ${course.data.course_type === "Elective" ? "elective" : ""}`}
                      >
                        {course.data.course_type}
                      </span>
                    </div>
                    <h4>{course.title}</h4>
                    <div className="curriculum-course-meta">
                      <b>
                        {course.data.units}{" "}
                        {course.data.units === 1 ? "unit" : "units"}
                      </b>
                      {course.data.session && (
                        <span>{course.data.session}</span>
                      )}
                    </div>
                    {!department && (
                      <p className="curriculum-course-programme">
                        {course.data.faculty} ·{" "}
                        {course.data.departments.join(" · ")}
                      </p>
                    )}
                    {(course.summary || course.body) && (
                      <details>
                        <summary>About this course</summary>
                        {[course.summary, course.body]
                          .filter(Boolean)
                          .map((text, index) => (
                            <p key={index} className="prose-paragraph">
                              {text}
                            </p>
                          ))}
                      </details>
                    )}
                    <div className="curriculum-course-links">
                      <Link
                        href={`/archive?q=${encodeURIComponent(course.data.course_code)}`}
                      >
                        Study materials
                      </Link>
                      <Link
                        href={`/reviews?q=${encodeURIComponent(course.data.course_code)}`}
                      >
                        Student reviews
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
export function CourseCatalogue({ data }: { data: HubData }) {
  return (
    <Suspense fallback={<p role="status">Loading the course catalogue…</p>}>
      <CourseCatalogueContent data={data} />
    </Suspense>
  );
}
