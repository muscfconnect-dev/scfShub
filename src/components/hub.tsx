"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  MessageCircle,
  Bus,
  Utensils,
  Users,
  Dumbbell,
  Link as LinkIcon,
  Search,
  Home as HomeIcon,
  CalendarDays,
  MapPin,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  FileText,
  ShieldCheck,
  ShoppingBag,
  Heart,
  Palette,
  Code,
  Globe,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { HubData } from "@/lib/server";
import { money, type Entry, type Review, type Trip } from "@/lib/domain";
import {
  OFFICIAL_CHECKED_ON,
  SCHOOL_CONTACT,
  SCHOOL_SITE,
  toTel,
} from "@/lib/school";
import {
  api,
  Reveal,
  Modal,
  Notice,
  Empty,
  Submit,
  Honeypot,
  Captcha,
  useCatalog,
  useTabGlider,
  More,
} from "./ui";
import { Select } from "./select";
import { Recovery } from "./private-thread";
import { CourseCatalogue } from "./course-catalogue";
import {
  MenuSheet,
  RouteProgress,
  SiteFooter,
  SiteHeader,
  useRouteProgress,
  useScrolled,
  type NavItem,
} from "./site-shell";
const pages: Record<string, [string, string]> = {
  courses: [
    "What’s on your course list?",
    "Choose your faculty, department, level and semester to see the courses you’ll be taking.",
  ],
  archive: [
    "Looking for that past question?",
    "Search by course, pick what you need and download it. No need to scroll through weeks of group chat messages.",
  ],
  reviews: [
    "What’s this course actually like?",
    "Find your department, look up a course and hear what helped students get through it. Taken it already? Help the next person out.",
  ],
  freshers: [
    "New here? Let’s help you settle in.",
    "The things you’ll want to know before arriving, plus the official pages and forms you need to get started.",
  ],
  places: [
    "Eat, Drink & Shop.",
    "Find out where to eat, grab a drink or shop in school. Check the price range before you leave your room.",
  ],
  groups: [
    "Find your people.",
    "You don’t have to wait for someone to add you to a group. Find what interests you and check how to join.",
  ],
  sports: [
    "You can’t read all day.",
    "Want to join a team, find a training session or just move around a bit? Here’s what’s available.",
  ],
  news: [
    "What’s happening in school?",
    "School updates, events and the things you might have missed. Catch up here.",
  ],
  travel: [
    "Going home? Start here.",
    "Check the available destinations, fares and departure dates before booking your trip home.",
  ],
  "school-links": [
    "Need the official stuff?",
    "The portal, forms, school contacts and other links you keep asking for. Here’s where to click.",
  ],
  "ask-scf": [
    "Need help? Ask us.",
    "Something bothering you in school? Tell SCF what’s going on, or point us towards something that needs fixing.",
  ],
  issues: [
    "Something wrong? Let’s hear it.",
    "Having trouble with registration, a result or a course? Explain what’s happening so SCF can follow it up.",
  ],
  "hostel-complaints": [
    "Hostel wahala? Tell us.",
    "Something wrong in your hostel? Check the rules, explain the issue and let SCF know where help is needed.",
  ],
  explore: [
    "Go on, have a look around.",
    "All the places this hub can take you.",
  ],
  privacy: ["Your information.", "How the hub handles your information."],
  terms: ["Using the hub.", "What to know before using SCF Students’ Hub."],
};
const shortcuts = [
  [
    "archive",
    "Study materials",
    "Past questions, notes and resources.",
    BookOpen,
  ],
  ["reviews", "Course reviews", "Know what you’re getting into.", FileText],
  ["ask-scf", "Ask SCF", "Something wrong? Tell us.", MessageCircle],
  ["travel", "Travel home", "Routes, fares and departures.", Bus],
  ["places", "Eat, Drink & Shop", "What’s available, and how much?", Utensils],
  [
    "school-links",
    "Official school links",
    "Portals, forms and contacts.",
    LinkIcon,
  ],
] as const;
const nav = [
  ["archive", "Academics"],
  ["freshers", "Freshers’ guide"],
  ["places", "Eat, Drink & Shop"],
  ["groups", "Groups"],
  ["sports", "Sport & Fitness"],
  ["news", "News & Events"],
  ["travel", "Travel home"],
];
const categoryIcons: Record<string, typeof Users> = {
  "Academic & Tech": Code,
  "Faith & Fellowship": Heart,
  "Arts & Creativity": Palette,
  Volunteering: Heart,
  "Culture & Community": Globe,
};
const date = (value: string) =>
  value
    ? new Date(value).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="prose-paragraph">
            {p}
          </p>
        ))}
    </>
  );
}
function Image({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return src ? (
    <img src={src} alt={alt} className={className} loading="lazy" />
  ) : (
    <div className={`image-fallback ${className}`} aria-hidden="true">
      <span>SCF</span>
      <small>MADE FOR YOU</small>
    </div>
  );
}
const academicRoutes = new Set(["archive", "courses", "reviews", "issues"]);
function AcademicTabs({ active }: { active: string }) {
  // `target` is set on click so the highlight slides and the label recolours at once,
  // before the next page has finished loading.
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => setTarget(null), [active]);
  const shown = target ?? active;
  const { ref, ready, glider, slideTo } = useTabGlider<HTMLElement>(
    "academic-tabs",
    "a.selected",
    active,
  );
  return (
    <nav
      ref={ref}
      className={`tabs academic-tabs${ready ? " motion-tabs-ready" : ""}`}
      data-motion-tabs
      aria-label="Academic pages"
    >
      {glider}
      {[
        ["archive", BookOpen, "Academic Archive"],
        ["courses", BookOpen, "Course Catalogue"],
        ["reviews", FileText, "Course Reviews"],
        ["issues", MessageCircle, "Academic Issues"],
      ].map(([slug, Icon, label]) => (
        <Link
          key={slug as string}
          className={shown === slug ? "selected" : ""}
          aria-current={active === slug ? "page" : undefined}
          href={`/${slug}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
            setTarget(slug as string);
            slideTo(e.currentTarget);
          }}
        >
          {typeof Icon !== "string" && <Icon size={20} />}
          <span>{label as string}</span>
        </Link>
      ))}
    </nav>
  );
}
function Intro({
  route,
  data,
  title,
  description,
  children,
}: {
  route: string;
  data: HubData;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const page = data.entries.find((e) => e.kind === "page" && e.slug === route);
  return (
    <section
      className={`page-intro ${page?.image ? "has-image" : ""}`}
      style={
        page?.image
          ? {
              backgroundImage: `linear-gradient(90deg,rgba(14,32,72,.92),rgba(14,32,72,.48)),url("${page.image}")`,
            }
          : undefined
      }
    >
      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/">The Hub</Link>
          <ChevronRight size={14} />
          <span>{title || page?.title || pages[route]?.[0]}</span>
        </div>
        <h1>{title || page?.title || pages[route]?.[0]}</h1>
        <p className="lede">
          {description || page?.summary || pages[route]?.[1]}
        </p>
        {["archive", "courses", "reviews", "issues"].includes(route) && (
          <AcademicTabs active={route} />
        )}
        {children}
      </div>
    </section>
  );
}
function Ad({ data, placement }: { data: HubData; placement: string }) {
  const now = Date.now(),
    ads = data.entries.filter(
      (e) =>
        e.kind === "ad" &&
        e.data.placement === placement &&
        (!e.data.starts_at || new Date(e.data.starts_at).getTime() <= now) &&
        (!e.data.ends_at || new Date(e.data.ends_at).getTime() >= now),
    );
  return (
    <>
      {ads.map((ad) => (
        <aside className="ad" key={ad.id}>
          {ad.image && <img src={ad.image} alt="" />}
          <div>
            <span className="ad-label">Advertisement</span>
            <h3>{ad.title}</h3>
            <p>{ad.summary}</p>
          </div>
          <a
            className="btn navy"
            href={ad.data.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            {ad.data.cta || "Find out more"}
          </a>
        </aside>
      ))}
    </>
  );
}
function HomePage({
  data,
  onSearch,
}: {
  data: HubData;
  onSearch: (q: string) => void;
}) {
  const s = data.settings;
  return (
    <>
      <section className="home-hero">
        <div className="wrap home-hero-grid">
          <div className="home-hero-copy">
            <h1>
              <span>{s.hero_title}</span>
              <strong>
                {s.hero_emphasis.split("\n").map((l: string, i: number) => (
                  <span key={i}>
                    {l}
                    <br />
                  </span>
                ))}
              </strong>
            </h1>
            <p>{s.hero_text}</p>
            <form
              className="home-search"
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(String(new FormData(e.currentTarget).get("q") || ""));
              }}
            >
              <label className="sr-only" htmlFor="home-search">
                Search the hub
              </label>
              <input
                id="home-search"
                name="q"
                placeholder="What do you need?"
                maxLength={150}
              />
              <button aria-label="Search">
                <Search />
              </button>
            </form>
            <div className="home-hero-actions">
              <Link className="btn navy" href="/archive">
                Find study materials
              </Link>
              <Link className="link" href="/freshers">
                New here? Start here
              </Link>
            </div>
          </div>
          <figure className="home-campus-photo">
            <span className="home-design-stamp" aria-hidden="true">
              MADE
              <br />
              FOR YOU
            </span>
            <Image
              src={s.hero_image}
              alt="Maduka University campus garden and paths"
            />
            <figcaption>
              <span>{s.hero_caption}</span>
              <span>Made for you.</span>
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="home-quick-section">
        <div className="wrap home-quick-grid">
          {shortcuts.map(([url, title, text, Icon]) => (
            <Reveal key={url}>
              <Link href={`/${url}`}>
                <span className="quick-icon">
                  <Icon />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section home-updates">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <h2>{s.home_updates_title}</h2>
              <p>{s.home_updates_text}</p>
            </div>
            <Link className="link" href="/news">
              All news & events
            </Link>
          </Reveal>
          <div className="home-update-grid">
            <Reveal>
              <Link className="home-feature-update" href="/freshers">
                <Image
                  src={s.home_feature_image}
                  alt="Maduka University campus buildings"
                />
                <div>
                  <h3>{s.home_feature_title}</h3>
                  <p>{s.home_feature_text}</p>
                  <span className="inline-action">
                    Read the freshers’ guide
                  </span>
                </div>
              </Link>
            </Reveal>
            <div className="home-notice-list">
              {[
                [
                  "archive",
                  "Who has the past question?",
                  "Check the archive before you send that message.",
                  BookOpen,
                ],
                [
                  "hostel-complaints",
                  "Hostel wahala?",
                  "See the rules or tell SCF what needs fixing.",
                  HomeIcon,
                ],
                [
                  "school-links",
                  "Looking for your portal?",
                  "Find the school services in one place.",
                  LinkIcon,
                ],
              ].map(([url, title, text, Icon]) => (
                <Reveal key={url as string}>
                  <Link href={`/${url}`}>
                    <span className="notice-icon">
                      {typeof Icon !== "string" && <Icon />}
                    </span>
                    <div>
                      <h3>{title as string}</h3>
                      <p>{text as string}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="section home-campus-life">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <h2>{s.home_life_title}</h2>
              <p>{s.home_life_text}</p>
            </div>
            <Link className="link" href="/explore">
              Explore the hub
            </Link>
          </Reveal>
          <div className="home-life-grid">
            {[
              [
                "places",
                s.home_food_image,
                s.home_food_title,
                s.home_food_text,
                "Eat, Drink & Shop",
              ],
              [
                "groups",
                s.home_groups_image,
                s.home_groups_title,
                s.home_groups_text,
                "Meet the groups",
              ],
              [
                "sports",
                s.home_sports_image,
                s.home_sports_title,
                s.home_sports_text,
                "Sport & Fitness",
              ],
            ].map(([url, img, title, text, cta]) => (
              <Reveal key={url}>
                <Link className="home-life-card" href={`/${url}`}>
                  <div className="home-life-image">
                    <Image src={img} />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <span className="inline-action">{cta}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <div className="wrap">
        <Ad data={data} placement="home" />
      </div>
      <section className="section home-help-section">
        <div className="wrap home-help-grid">
          <Reveal className="home-help-copy">
            <h2>{s.help_title}</h2>
            <p>{s.help_text}</p>
            <Link className="btn navy" href="/ask-scf">
              Ask us
            </Link>
            <Link className="link" href="/issues">
              Academic complaints
            </Link>
          </Reveal>
          <Reveal className="home-travel-card">
            <div>
              <h2>{s.travel_cta_title}</h2>
              <p>{s.travel_cta_text}</p>
              <Link className="btn white" href="/travel">
                See travel home
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
function FilterSelect({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (s: string) => void;
  options: string[];
}) {
  return (
    <label>
      {label}
      <Select
        className="field"
        value={value}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">
          {label === "Faculty"
            ? "All faculties"
            : label === "Material type"
              ? "All materials"
              : `All ${label.toLowerCase()}s`}
        </option>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </Select>
    </label>
  );
}
const unique = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort();
function AcademicList({
  data,
  reviews = false,
}: {
  data: HubData;
  reviews?: boolean;
}) {
  const [q, setQ] = useState(""),
    [faculty, setFaculty] = useState(""),
    [department, setDepartment] = useState(""),
    [level, setLevel] = useState(""),
    [type, setType] = useState(""),
    [sort, setSort] = useState("recent"),
    [form, setForm] = useState<Review | boolean>(false);
  useEffect(
    () => setQ(new URLSearchParams(window.location.search).get("q") || ""),
    [],
  );
  const catalog = useCatalog(
    reviews
      ? data.reviews.filter((r) => r.kind === "course")
      : data.entries.filter((e) => e.kind === "resource"),
    reviews ? "type=review&kind=course" : "kind=resource",
  );
  const records = catalog.records;
  const facts = (r: any) => (reviews ? r : r.data);
  const faculties = unique([
    ...data.entries.filter((e) => e.kind === "faculty").map((e) => e.title),
    ...records.map((r) => facts(r).faculty),
  ]);
  const departments = unique([
    ...data.entries
      .filter(
        (e) =>
          e.kind === "department" && (!faculty || e.data.faculty === faculty),
      )
      .map((e) => e.title),
    ...records
      .filter((r) => !faculty || facts(r).faculty === faculty)
      .flatMap((r) =>
        reviews ? [facts(r).department] : facts(r).departments || [],
      ),
  ]);
  let filtered = records.filter((r: any) => {
    const d = facts(r);
    return (
      `${r.title} ${d.course_name || ""} ${d.course_code || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!faculty || d.faculty === faculty) &&
      (!department ||
        (reviews
          ? d.department === department
          : d.departments?.includes(department))) &&
      (!level || d.level === level) &&
      (!type || d.material_type === type)
    );
  });
  if (reviews)
    filtered = filtered.sort((a: any, b: any) =>
      sort === "rating"
        ? b.rating - a.rating
        : sort === "name"
          ? a.course_name.localeCompare(b.course_name)
          : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <div className="review-filter-panel">
        <div className="review-filter-top">
          <label>
            Course name or code
            <input
              className="field"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. COS 101 or Introduction to Computing"
            />
          </label>
          {reviews ? (
            <button className="btn navy" onClick={() => setForm(true)}>
              Review a course
            </button>
          ) : null}
        </div>
        <div className="review-filter-grid">
          <FilterSelect
            label="Faculty"
            value={faculty}
            set={(v) => {
              setFaculty(v);
              setDepartment("");
            }}
            options={faculties}
          />
          <FilterSelect
            label="Department"
            value={department}
            set={setDepartment}
            options={departments}
          />
          <FilterSelect
            label="Level"
            value={level}
            set={setLevel}
            options={["100", "200", "300", "400", "500", "600"]}
          />
          {reviews ? (
            <label>
              Sort by
              <Select
                className="field"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Most recent</option>
                <option value="rating">Highest rated</option>
                <option value="name">Course name A–Z</option>
              </Select>
            </label>
          ) : (
            <FilterSelect
              label="Material type"
              value={type}
              set={setType}
              options={["Past questions", "Notes", "Study materials"]}
            />
          )}
        </div>
        <button
          className="clear-review-filters"
          onClick={() => {
            setQ("");
            setFaculty("");
            setDepartment("");
            setLevel("");
            setType("");
          }}
        >
          Clear filters
        </button>
      </div>
      <p className="result-count" role="status">
        {filtered.length} {reviews ? "student reviews" : "resources"}
      </p>
      <div className={reviews ? "course-review-list" : "resource-list"}>
        {!filtered.length && (
          <Empty
            title={records.length ? "No matches found." : "Nothing here yet."}
            text={
              records.length
                ? "Try another search or clear a filter."
                : "SCF will publish verified resources and approved reviews here."
            }
          />
        )}
        {filtered.map((r) =>
          reviews ? (
            <ReviewCard
              key={r.id}
              review={r as Review}
              onAdd={() => setForm(r as Review)}
            />
          ) : (
            <Reveal key={r.id}>
              <article className="resource">
                <span className="file-icon">FILE</span>
                <div className="resource-details">
                  <h3>
                    {(r as Entry).data.course_code} · {r.title}
                  </h3>
                  <p>
                    {(r as Entry).data.material_type} ·{" "}
                    {(r as Entry).data.level} level ·{" "}
                    {(r as Entry).data.session}
                  </p>
                  <p className="resource-path">
                    {(r as Entry).data.faculty} ›{" "}
                    {(r as Entry).data.departments?.join(" · ")}
                  </p>
                  <p>{(r as Entry).summary}</p>
                </div>
                <div className="resource-actions">
                  <a
                    className="btn outline"
                    target="_blank"
                    rel="noreferrer"
                    href={`/api/files/${(r as Entry).data.file_id}?preview=1`}
                  >
                    Preview
                  </a>
                  <a
                    className="link"
                    href={`/api/files/${(r as Entry).data.file_id}`}
                  >
                    Download
                  </a>
                </div>
              </article>
            </Reveal>
          ),
        )}
      </div>
      <More catalog={catalog} />
      {reviews && form && (
        <Modal title="Help the next person out." onClose={() => setForm(false)}>
          <ReviewForm
            data={data}
            initial={typeof form === "object" ? form : undefined}
          />
        </Modal>
      )}
    </>
  );
}
function ReviewCard({
  review: r,
  onAdd,
}: {
  review: Review;
  onAdd?: () => void;
}) {
  return (
    <Reveal>
      <article className="course-review-card">
        <header className="course-review-head">
          <div>
            <span className="course-code">{r.course_code}</span>
            <h2>{r.course_name || r.title}</h2>
            {r.kind === "course" && (
              <p>
                {r.faculty} › {r.department} · {r.level} level
              </p>
            )}
          </div>
          <span className="rating-pill">
            {r.rating}
            <small>/5</small>
          </span>
        </header>
        {r.kind === "course" && (
          <div className="course-quick-facts">
            <div>
              <span>Difficulty</span>
              <strong>{r.difficulty}</strong>
            </div>
            <div>
              <span>Study time per week</span>
              <strong>{r.study_hours || "Not specified"}</strong>
            </div>
          </div>
        )}
        <div className="review-body">
          <h3>{r.title}</h3>
          <Paragraphs text={r.body} />
        </div>
        {r.helped && (
          <aside className="review-tip">
            <b>What helped</b>
            <blockquote className="tip-quote">“{r.helped}”</blockquote>
          </aside>
        )}
        <footer>
          <span>{r.author_name}</span>
          {onAdd && (
            <button className="link" onClick={onAdd}>
              Taken this course? Add yours
            </button>
          )}
        </footer>
      </article>
    </Reveal>
  );
}
function ReviewForm({
  data,
  initial,
  place,
}: {
  data: HubData;
  initial?: Review;
  place?: Entry;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [captcha, setCaptcha] = useState("");
  const faculties = unique(
      data.entries.filter((e) => e.kind === "faculty").map((e) => e.title),
    ),
    departments = unique(
      data.entries.filter((e) => e.kind === "department").map((e) => e.title),
    );
  return message ? (
    <Notice>{message}</Notice>
  ) : (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const res = await api("reviews", {
            ...f,
            kind: place ? "place" : "course",
            place_id: place?.id || null,
            rating: Number(f.rating),
            captcha,
          });
          setMessage(res.message);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Reviews are checked by SCF before publication. Share useful advice and
        avoid personal attacks.
      </p>
      {!place && (
        <>
          <div className="form-grid">
            <label>
              Course code
              <input
                name="course_code"
                required
                defaultValue={initial?.course_code}
                maxLength={30}
              />
            </label>
            <label>
              Course name
              <input
                name="course_name"
                required
                defaultValue={initial?.course_name}
                maxLength={160}
              />
            </label>
            <label>
              Faculty
              <input
                name="faculty"
                list="faculties"
                required
                defaultValue={initial?.faculty}
              />
              <datalist id="faculties">
                {faculties.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </datalist>
            </label>
            <label>
              Department
              <input
                name="department"
                list="departments"
                required
                defaultValue={initial?.department}
              />
              <datalist id="departments">
                {departments.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </datalist>
            </label>
            <label>
              Level
              <Select name="level" required defaultValue={initial?.level || ""}>
                <option value="">Choose a level</option>
                {["100", "200", "300", "400", "500", "600"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </label>
            <label>
              Difficulty
              <Select name="difficulty">
                {[
                  "Easy",
                  "Manageable",
                  "Moderate",
                  "Challenging",
                  "Very challenging",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </label>
            <label>
              Study time per week
              <input
                name="study_hours"
                maxLength={60}
                placeholder="e.g. 3–5 hours"
              />
            </label>
          </div>
        </>
      )}
      <div className="form-grid">
        <label>
          Your display name
          <input name="author_name" required maxLength={80} />
        </label>
        <label>
          Overall experience
          <Select name="rating" required>
            <option value="">Choose a rating</option>
            {[5, 4, 3, 2, 1].map((v) => (
              <option key={v} value={v}>
                {v}/5
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label>
        Give your review a title
        <input name="title" required minLength={3} maxLength={160} />
      </label>
      <label>
        {place ? "How was your visit?" : "What should someone expect?"}
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
        />
      </label>
      {!place && (
        <label>
          What helped?
          <textarea name="helped" maxLength={1500} rows={3} />
        </label>
      )}
      <Honeypot />
      <Captcha onToken={setCaptcha} />
      {error && <Notice error>{error}</Notice>}
      <Submit busy={busy}>Submit review</Submit>
    </form>
  );
}
function ContentList({
  data,
  kind,
}: {
  data: HubData;
  kind: "place" | "group" | "sport" | "news" | "link";
}) {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [price, setPrice] = useState("");
  const chipBar = useTabGlider<HTMLDivElement>(
    `chips-${kind}`,
    "button.active",
    category,
    false,
  );
  const catalog = useCatalog(
    data.entries.filter((e) => e.kind === kind),
    `kind=${kind}`,
    data.entries.length < 500,
  );
  const entries = catalog.records.filter(
    (e) =>
      kind !== "link" || ["directory", "whatsapp"].includes(e.data.placement),
  );
  const categories = unique(entries.map((e) => e.data.category));
  const list = entries.filter(
    (e) =>
      `${e.title} ${e.summary} ${e.data.location || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!category || e.data.category === category) &&
      (!price || Number(e.data.price_min) <= Number(price)),
  );
  return (
    <>
      <div className="filters">
        <label className="sr-only" htmlFor="listing-search">
          Search listings
        </label>
        <input
          id="listing-search"
          type="search"
          placeholder="What are you looking for?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {kind === "place" && (
          <Select
            aria-label="Starting price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          >
            <option value="">Any price range</option>
            <option value="1000">Starts at ₦1,000 or less</option>
            <option value="2000">Starts at ₦2,000 or less</option>
            <option value="5000">Starts at ₦5,000 or less</option>
          </Select>
        )}
      </div>
      <div
        ref={chipBar.ref}
        className={`chips scroll-tabs${chipBar.ready ? " motion-tabs-ready" : ""}`}
        data-motion-tabs
        role="group"
        aria-label="Categories"
      >
        {chipBar.glider}
        {["", ...categories].map((v) => (
          <button
            className={`chip ${category === v ? "active" : ""}`}
            key={v}
            aria-pressed={category === v}
            onClick={() => setCategory(v)}
          >
            {v || "All"}
          </button>
        ))}
      </div>
      <p className="result-count" role="status">
        {list.length} {kind === "link" ? "links" : "listings"}
      </p>
      {!list.length && <Empty />}
      <div
        className={
          kind === "link"
            ? "official-link-grid"
            : kind === "group"
              ? "listing-grid"
              : "cards"
        }
      >
        {list.map((e) => {
          const Icon = categoryIcons[e.data.category] || Users;
          const published = data.reviews.filter((r) => r.place_id === e.id),
            rating = published.length
              ? (
                  published.reduce((a, r) => a + r.rating, 0) / published.length
                ).toFixed(1)
              : null;
          return (
            <Reveal key={e.id}>
              {kind === "link" ? (
                <article className="official-link-card">
                  <span className="official-link-icon">
                    <LinkIcon />
                  </span>
                  <h2>{e.title}</h2>
                  <p>{e.summary}</p>
                  {e.data.instructions && (
                    <div className="where-to-click">
                      <b>Where to click</b>
                      <p>{e.data.instructions}</p>
                    </div>
                  )}
                  <a
                    className="btn outline"
                    href={e.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open {e.title}
                  </a>
                </article>
              ) : kind === "group" ? (
                <article className="group-listing">
                  <div className="group-symbol">
                    <Icon />
                  </div>
                  <div>
                    <span>{e.data.category}</span>
                    <h3>
                      <Link href={`/group/${e.slug}`}>{e.title}</Link>
                    </h3>
                    <p>{e.summary}</p>
                    <Link className="link" href={`/group/${e.slug}`}>
                      Meet the group
                    </Link>
                  </div>
                </article>
              ) : (
                <article className="card">
                  <Link
                    href={`/${kind === "news" ? "story" : kind}/${e.slug}`}
                    tabIndex={-1}
                  >
                    <Image src={e.image} />
                  </Link>
                  <div className="card-body">
                    <span className="tag">
                      {e.data.category}
                      {e.data.sponsored ? " · Sponsored" : ""}
                    </span>
                    <h3>
                      <Link
                        href={`/${kind === "news" ? "story" : kind}/${e.slug}`}
                      >
                        {e.title}
                      </Link>
                    </h3>
                    {kind === "place" && (
                      <>
                        <b>
                          {money(e.data.price_min)}–{money(e.data.price_max)}
                        </b>
                        <p>
                          {rating
                            ? `${rating}/5 · ${published.length} student reviews`
                            : "No ratings yet"}
                        </p>
                      </>
                    )}
                    <p>{e.summary}</p>
                    {e.data.location && (
                      <p>
                        <MapPin size={15} /> {e.data.location}
                      </p>
                    )}
                    {e.data.event_at && <p>{date(e.data.event_at)}</p>}
                    <Link
                      className="link"
                      href={`/${kind === "news" ? "story" : kind}/${e.slug}`}
                    >
                      {kind === "news" ? "Read story" : "Explore"}
                    </Link>
                  </div>
                </article>
              )}
            </Reveal>
          );
        })}
      </div>
      <More catalog={catalog} />
    </>
  );
}
function Detail({ data, entry: e }: { data: HubData; entry: Entry }) {
  const [review, setReview] = useState(false),
    related = data.entries
      .filter((r) => r.kind === e.kind && r.id !== e.id)
      .slice(0, 3);
  const d = e.data,
    route =
      e.kind === "news"
        ? "news"
        : e.kind === "place"
          ? "places"
          : e.kind === "group"
            ? "groups"
            : "sports";
  const activities = (d.activities || "").split("\n").filter(Boolean);
  return (
    <>
      <Intro
        route={route}
        data={data}
        title={e.title}
        description={e.summary}
      />
      <section className="section">
        <div className="wrap">
          {e.kind === "news" ? (
            <article className="article-reading">
              <Image src={e.image} alt={e.title} className="article-cover" />
              <p className="article-meta">
                {d.category} · {date(e.created_at)}
                {d.event_at && ` · Event: ${date(d.event_at)}`}
              </p>
              {d.location && (
                <p>
                  <MapPin size={18} />
                  {d.location}
                </p>
              )}
              <Paragraphs text={e.body} />
              <Link className="link" href="/news">
                Back to news & events
              </Link>
            </article>
          ) : (
            <>
              <div className="detail-hero-grid">
                <div
                  className={
                    e.kind === "group"
                      ? "group-profile-art"
                      : "spot-profile-visual"
                  }
                >
                  <Image
                    src={
                      e.image ||
                      (e.kind === "group"
                        ? data.settings.home_groups_image
                        : "")
                    }
                    alt={e.title}
                  />
                </div>
                <aside className="detail-side-card">
                  <h2>
                    {e.kind === "place"
                      ? "Before you head out."
                      : e.kind === "group"
                        ? "Sounds like your kind of people?"
                        : "Where and when?"}
                  </h2>
                  <dl>
                    {[
                      ["Category", d.category],
                      ["Location", d.location],
                      ["Opening hours", d.hours],
                      ["Meeting time", d.meeting_time],
                      ["Schedule", d.schedule],
                      [
                        "Price range",
                        e.kind === "place"
                          ? `${money(d.price_min)}–${money(d.price_max)}`
                          : "",
                      ],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {d.join_url && (
                    <a
                      className="btn navy"
                      target="_blank"
                      rel="noreferrer"
                      href={d.join_url}
                    >
                      Join this group
                    </a>
                  )}
                  {d.contact_url && (
                    <a
                      className="btn outline"
                      target="_blank"
                      rel="noreferrer"
                      href={d.contact_url}
                    >
                      Contact & information
                    </a>
                  )}
                  {e.kind === "place" && (
                    <button
                      className="btn navy"
                      onClick={() => setReview(true)}
                    >
                      Been here? Leave a review
                    </button>
                  )}
                </aside>
              </div>
              {activities.length > 0 && (
                <>
                  <div className="detail-section-heading">
                    <h2>What goes on here?</h2>
                  </div>
                  <div className="detail-activity-grid">
                    {activities.map((a: string, i: number) => {
                      const [title, ...desc] = a.split("|");
                      return (
                        <Reveal key={i}>
                          <article>
                            <span className="activity-icon">
                              {e.kind === "sport" ? <Dumbbell /> : <Users />}
                            </span>
                            <h3>{title}</h3>
                            <p>{desc.join("|")}</p>
                          </article>
                        </Reveal>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="detail-content-grid">
                <section className="detail-body-panel">
                  <h2>Good to know.</h2>
                  <Paragraphs text={e.body || e.summary} />
                </section>
                {d.menu && (
                  <section>
                    <h2>What’s on offer?</h2>
                    <div className="spot-menu-list">
                      {d.menu
                        .split("\n")
                        .filter(Boolean)
                        .map((a: string, i: number) => {
                          const [title, value] = a.split("|");
                          return (
                            <div key={i}>
                              <span>{title}</span>
                              <b>{value}</b>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                )}
              </div>
              {e.kind === "place" && (
                <section className="spot-reviews-section">
                  <div className="section-head">
                    <div>
                      <h2>How was it?</h2>
                      <p>
                        Student experiences. Paid placements don’t change
                        ratings.
                      </p>
                    </div>
                    <button
                      className="btn navy"
                      onClick={() => setReview(true)}
                    >
                      Write a review
                    </button>
                  </div>
                  {data.reviews.filter((r) => r.place_id === e.id).length ? (
                    data.reviews
                      .filter((r) => r.place_id === e.id)
                      .map((r) => <ReviewCard key={r.id} review={r} />)
                  ) : (
                    <Empty
                      title="No reviews yet."
                      text="Been here? Tell the next person what to expect."
                    />
                  )}
                </section>
              )}
            </>
          )}
          {related.length > 0 && (
            <>
              <div className="detail-section-heading">
                <h2>Keep looking around.</h2>
              </div>
              <div className="related-detail-grid">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/${r.kind === "news" ? "story" : r.kind}/${r.slug}`}
                  >
                    <div>
                      <h3>{r.title}</h3>
                      <p>{r.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
          <Ad data={data} placement={route} />
        </div>
      </section>
      {review && (
        <Modal title={`How was ${e.title}?`} onClose={() => setReview(false)}>
          <ReviewForm data={data} place={e} />
        </Modal>
      )}
    </>
  );
}
const guideIcons = [
  Bus,
  CircleCheck,
  FileText,
  HomeIcon,
  LinkIcon,
  FileText,
  BookOpen,
  MessageCircle,
];
function ExternalNote() {
  return <span className="sr-only"> (official website, opens in a new tab)</span>;
}
function OfficialLinks({ data }: { data: HubData }) {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("");
  const catalog = useCatalog(
    data.entries.filter((e) => e.kind === "link"),
    "kind=link",
    data.entries.length < 500,
  );
  const links = catalog.records.filter((e) =>
    ["directory", "whatsapp"].includes(e.data.placement),
  );
  const categories = unique(links.map((e) => e.data.category));
  const list = links.filter(
    (e) =>
      `${e.title} ${e.summary} ${e.data.instructions || ""} ${e.data.category}`
        .toLowerCase()
        .includes(q.trim().toLowerCase()) &&
      (!category || e.data.category === category),
  );
  const urlOf = (slug: string, fallback: string) =>
    links.find((e) => e.slug === slug)?.data.url || fallback;
  return (
    <>
      <div className="official-source-note">
        <p>
          <b>From Maduka University’s official website.</b> Links checked
          against the published website on {OFFICIAL_CHECKED_ON}. Requirements
          can change; read the current official instructions before acting.
        </p>
        <a href={SCHOOL_SITE} target="_blank" rel="noopener noreferrer">
          Visit Maduka’s website
          <ExternalNote />
        </a>
      </div>
      <div className="filters">
        <label className="sr-only" htmlFor="school-link-search">
          Search school links
        </label>
        <input
          id="school-link-search"
          type="search"
          placeholder="Search for a portal, form, result or contact…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          aria-label="Filter school links by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All school links</option>
          {categories.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Select>
      </div>
      <p className="result-count" role="status" aria-live="polite">
        {list.length} official {list.length === 1 ? "link" : "links"}
      </p>
      {!list.length && (
        <Empty
          title="No matching links."
          text="Try “forms”, “results”, “fees” or clear the category filter."
        />
      )}
      <div className="official-link-grid">
        {list.map((e) => (
          <Reveal key={e.id}>
            <article className="official-link-card">
              <h2>{e.title}</h2>
              <p>{e.summary}</p>
              {e.data.instructions && (
                <div className="where-to-click">
                  <b>Where to click</b>
                  <p>{e.data.instructions}</p>
                </div>
              )}
              <a
                className="btn navy"
                href={e.data.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {e.title.toLowerCase()}
                <ExternalNote />
              </a>
            </article>
          </Reveal>
        ))}
      </div>
      <More catalog={catalog} />
      <section className="school-contact-panel">
        <div>
          <h2>Still need someone to ask?</h2>
          <p>Use the university’s published contacts for official help.</p>
          <address>{SCHOOL_CONTACT.address}</address>
        </div>
        <div className="school-contact-options">
          <a href={`mailto:${SCHOOL_CONTACT.generalEmail}`}>
            General enquiries: {SCHOOL_CONTACT.generalEmail}
          </a>
          <a href={`mailto:${SCHOOL_CONTACT.admissionsEmail}`}>
            Admissions: {SCHOOL_CONTACT.admissionsEmail}
          </a>
          {SCHOOL_CONTACT.phones.map((n) => (
            <a key={n} href={toTel(n)}>
              {n}
            </a>
          ))}
          <a
            className="link"
            href={urlOf("contact", `${SCHOOL_SITE}/contact`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View official contact page
            <ExternalNote />
          </a>
        </div>
      </section>
      <p className="school-source-footer">
        Sources:{" "}
        <a
          className="source-link"
          href={urlOf("contact", `${SCHOOL_SITE}/contact`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact page
        </a>{" "}
        ·{" "}
        <a
          className="source-link"
          href={urlOf("portal", "https://portal.madukauniversity.edu.ng/login")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Student portal
        </a>{" "}
        ·{" "}
        <a
          className="source-link"
          href={urlOf("prospectus", `${SCHOOL_SITE}/prospectus`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Prospectus
        </a>{" "}
        ·{" "}
        <a href={SCHOOL_SITE} target="_blank" rel="noopener noreferrer">
          University website
        </a>
        . Some services require school login details. SCF Students’ Hub is
        separate from these university systems.
      </p>
    </>
  );
}
function Freshers({ data }: { data: HubData }) {
  const guides = data.entries.filter((e) => e.kind === "guide");
  const slugs = guides.map((e) => e.slug).join("|");
  const [open, setOpen] = useState(guides[0]?.slug ?? "");
  const urlOf = (slug: string) =>
    data.entries.find((e) => e.kind === "link" && e.slug === slug)?.data.url;
  useEffect(() => {
    // Deep links such as /freshers#guide-fees-payments open that section.
    const fromHash = () => {
      const m = location.hash.match(/^#guide-(.+)$/);
      if (m && slugs.split("|").includes(m[1])) setOpen(m[1]);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [slugs]);
  return (
    <>
      <div className="official-source-note">
        <p>
          <b>Start with the school’s instructions.</b> This guide points you to
          Maduka’s official information. Checked on {OFFICIAL_CHECKED_ON};
          always read the latest requirements for your session.
        </p>
        <Link className="btn navy" href="/school-links">
          All school links
        </Link>
      </div>
      <div className="guide-layout">
        <aside className="guide-nav" aria-label="Freshers’ guide sections">
          {guides.map((e, i) => {
            const Icon = guideIcons[i % guideIcons.length];
            return (
              <a
                key={e.id}
                href={`#guide-${e.slug}`}
                className={open === e.slug ? "current" : ""}
                aria-current={open === e.slug ? "true" : undefined}
                onClick={(ev) => {
                  ev.preventDefault();
                  setOpen(e.slug);
                  history.replaceState(null, "", `#guide-${e.slug}`);
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`guide-${e.slug}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
              >
                <Icon className="hub-icon" aria-hidden="true" />
                <span>{e.title}</span>
              </a>
            );
          })}
        </aside>
        <div>
          <Image
            className="sport-banner"
            src="/assets/mu-hostels.webp"
            alt="A hostel building at Maduka University"
          />
          {!guides.length && (
            <Empty
              title="The guide is being prepared."
              text="Use the official school links or ask SCF while we add verified guidance."
            />
          )}
          {guides.map((e, i) => {
            const Icon = guideIcons[i % guideIcons.length];
            return (
              <details
                id={`guide-${e.slug}`}
                key={e.id}
                className="motion-details"
                open={open === e.slug}
                onToggle={(ev) => {
                  const isOpen = ev.currentTarget.open;
                  setOpen((cur) =>
                    isOpen ? e.slug : cur === e.slug ? "" : cur,
                  );
                }}
              >
                <summary>
                  <span className="summary-icon">
                    <Icon className="hub-icon" aria-hidden="true" />
                  </span>
                  <span className="summary-label">{e.title}</span>
                </summary>
                <div className="accordion-content guide-body">
                  <p>{e.summary}</p>
                  <Paragraphs text={e.body} />
                  <div className="guide-official-link">
                    {e.data.link_url && (
                      <a
                        className="btn navy"
                        href={e.data.link_url}
                        target={
                          e.data.link_url.startsWith("/") ? undefined : "_blank"
                        }
                        rel="noopener noreferrer"
                      >
                        {e.data.link_label || "Find out more"}
                        {!e.data.link_url.startsWith("/") && <ExternalNote />}
                      </a>
                    )}
                    {e.slug.includes("portal") && urlOf("results") && (
                      <a
                        className="btn outline"
                        href={urlOf("results")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open the results portal
                        <ExternalNote />
                      </a>
                    )}
                    {e.slug.includes("learning") && urlOf("library") && (
                      <a
                        className="btn outline"
                        href={urlOf("library")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Find library resources
                        <ExternalNote />
                      </a>
                    )}
                    {e.slug.includes("hostel") && (
                      <Link className="btn outline" href="/hostel-complaints">
                        Hostel complaints
                      </Link>
                    )}
                    {e.slug.includes("help") && (
                      <Link className="btn outline" href="/ask-scf">
                        Ask us
                      </Link>
                    )}
                  </div>
                  {e.slug.includes("learning") && (
                    <p>
                      <Link className="link" href="/archive">
                        Academic Archive
                      </Link>
                    </p>
                  )}
                </div>
              </details>
            );
          })}
          <div className="guide-extra-help">
            <h3>Looking for a room number or a campus shortcut?</h3>
            <p>
              We’ll add verified local directions and student tips as SCF
              confirms them. For now,{" "}
              <a
                className="source-link"
                href={urlOf("contact") || `${SCHOOL_SITE}/contact`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ask the university
                <ExternalNote />
              </a>{" "}
              for exact office locations and accommodation help.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
function Support({
  data,
  kind,
}: {
  data: HubData;
  kind: "general" | "academic" | "hostel";
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [captcha, setCaptcha] = useState("");
  const categories =
    kind === "hostel"
      ? [
          "Water or power",
          "Room or maintenance",
          "Cleanliness or sanitation",
          "Room allocation",
          "Hostel rules or conduct",
          "Other hostel concern",
        ]
      : kind === "academic"
        ? [
            "Course registration",
            "Results or assessment",
            "Timetable clash",
            "Learning resources",
            "Other academic concern",
          ]
        : [
            "Student welfare",
            "Campus facilities",
            "Student services",
            "Suggestion",
            "Other concern",
          ];
  const rules = data.entries.filter((e) => e.kind === "rule");
  const heading =
    kind === "hostel"
      ? "Make a hostel complaint."
      : kind === "academic"
        ? "Raise an academic issue."
        : "Tell us what’s up.";
  const faq = (Icon: typeof ShieldCheck, title: string, text: string) => (
    <details className="motion-details">
      <summary>
        <span className="summary-icon">
          <Icon className="hub-icon" aria-hidden="true" />
        </span>
        <span className="summary-label">{title}</span>
      </summary>
      <div className="accordion-content">
        <p>{text}</p>
      </div>
    </details>
  );
  return (
    <>
      <div className="scf-support-banner">
        <div>
          <span className="support-dot" aria-hidden="true" />
          <b>SCF support, 24/7.</b>
        </div>
        <p>
          You can reach us any time. The first available member of the team can
          pick up your complaint and reply.
        </p>
      </div>
      {kind === "hostel" && (
        <section className="hostel-rules-panel" id="hostel-rules">
          <h2>Hostel rules.</h2>
          <p>Read the rules here, or go straight to the complaint form below.</p>
          {rules.length ? (
            rules.map((e) => (
              <article key={e.id}>
                <h3>{e.title}</h3>
                <p>{e.summary}</p>
                <Paragraphs text={e.body} />
                {(e.data.file_id || e.data.link_url) && (
                  <a
                    className="btn outline"
                    href={
                      e.data.file_id
                        ? `/api/files/${e.data.file_id}`
                        : e.data.link_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the rules
                  </a>
                )}
              </article>
            ))
          ) : (
            <div className="rules-empty">
              <b>No hostel rules uploaded yet.</b>
              <p>
                SCF will add the approved documents here. You can still raise a
                complaint below.
              </p>
            </div>
          )}
          <div className="guide-official-link">
            <a
              className="btn outline"
              href={`${SCHOOL_SITE}/prospectus`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the university prospectus
              <ExternalNote />
            </a>
            <a className="btn navy" href="#complaint-form-heading">
              Make a hostel complaint
            </a>
          </div>
        </section>
      )}
      <div className="complaint-layout">
        <aside className="complaint-side">
          <h2>We’re listening.</h2>
          <p>
            Every SCF member is notified when you raise a complaint, so the
            first one available can pick it up.
          </p>
          <ol>
            <li>Tell us what happened.</li>
            <li>Confirm your email to open your private case.</li>
            <li>We reply through your case and email.</li>
          </ol>
          <p>
            The member handling it will be shown on the case so you don’t get
            crossed replies.
          </p>
          {kind === "general" && (
            <div className="complaint-other-routes">
              <Link className="btn outline" href="/issues">
                Academic complaints
              </Link>
              <Link className="btn outline" href="/hostel-complaints">
                Hostel complaints
              </Link>
            </div>
          )}
          <a
            className="link"
            href={`${SCHOOL_SITE}/contact`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Need the university directly?
            <ExternalNote />
          </a>
        </aside>
        <div>
          <h2 id="complaint-form-heading">{heading}</h2>
          {message ? (
            <div className="complaint-confirmation" role="status">
              <b>Thanks, we’ve got it.</b>
              <p>{message}</p>
              <button
                type="button"
                className="btn navy"
                onClick={() => setMessage("")}
              >
                Back to the form
              </button>
            </div>
          ) : (
            <form
              className="issue-form scf-complaint-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<
                    string,
                    string
                  >;
                  const detail = (f.hostel || f.course?.toUpperCase() || "").trim();
                  const v = await api("cases", {
                    kind,
                    category: f.category,
                    // The subject is built for them, so there is one less box to fill.
                    subject: detail ? `${f.category} · ${detail}` : f.category,
                    email: f.email,
                    message: f.message,
                    hostel: f.hostel || "",
                    location: f.location || "",
                    website: f.website || "",
                    captcha,
                  });
                  setMessage(`${v.message} Your reference is ${v.reference}.`);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                What’s it about?
                <Select className="field" name="category" required defaultValue="">
                  <option value="">Choose a category</option>
                  {categories.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </label>
              {kind === "academic" && (
                <label>
                  Course code, if relevant
                  <input
                    className="field"
                    name="course"
                    maxLength={30}
                    placeholder="e.g. COS 101"
                  />
                </label>
              )}
              {kind === "hostel" && (
                <>
                  <label>
                    Hostel or block
                    <input
                      className="field"
                      name="hostel"
                      required
                      maxLength={120}
                      placeholder="e.g. Block B, Male Hostel"
                    />
                  </label>
                  <label>
                    Room or location, if relevant
                    <input
                      className="field"
                      name="location"
                      maxLength={200}
                      placeholder="e.g. Room 12 or the ground-floor corridor"
                    />
                  </label>
                </>
              )}
              <label>
                Tell us what happened
                <textarea
                  className="field"
                  name="message"
                  required
                  minLength={20}
                  maxLength={5000}
                  placeholder="Explain the issue and what you need help with."
                />
              </label>
              <label>
                Where should we reply?
                <input
                  className="field"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
              <Honeypot />
              <Captcha onToken={setCaptcha} />
              {error && <Notice error>{error}</Notice>}
              <Submit busy={busy}>Send to SCF</Submit>
              <p className="form-fine-print">
                By sending this you agree to SCF using these details to handle
                your request.{" "}
                <Link href="/privacy" target="_blank">
                  Privacy information
                </Link>
                .
              </p>
            </form>
          )}
          {faq(
            ShieldCheck,
            "Who will see my complaint?",
            "Authorised SCF members are emailed a notification with a link to the secured complaint inbox. Your details stay in that inbox, with access managed through staff accounts, and one member claims your case before replying.",
          )}
          {faq(
            MessageCircle,
            "What happens after I send it?",
            "We email you a link to confirm your address and open your private case page. Keep that email: it is how you follow replies. If you lose it, use the recovery option at the bottom of this page.",
          )}
        </div>
      </div>
      <Recovery kind="case" />
    </>
  );
}
function Travel({ data, trip }: { data: HubData; trip?: Trip }) {
  const [booking, setBooking] = useState<Trip | null>(null);
  const records = trip ? [trip] : data.trips;
  return (
    <>
      <div className="trips">
        {!records.length && (
          <Empty
            title="No trips announced yet."
            text="Confirmed routes, fares and departure dates will appear here."
          />
        )}
        {records.map((t) => (
          <Reveal key={t.id}>
            <article className="trip">
              <div>
                <span className="tag">MADUKA UNIVERSITY → {t.destination}</span>
                <h2>{t.title}</h2>
                <p>
                  {date(t.departure_at)} · {t.capacity - t.confirmed_count}{" "}
                  seats remaining
                </p>
                <p>Meeting point: {t.meeting_point || "To be announced"}</p>
                <p>Booking closes: {date(t.booking_closes_at)}</p>
                {trip && <Paragraphs text={t.instructions} />}
              </div>
              <div>
                <strong>{money(t.fare)}</strong>
                {trip ? (
                  <button
                    className="btn navy"
                    disabled={
                      t.status !== "published" ||
                      new Date(t.booking_closes_at) <= new Date() ||
                      t.confirmed_count >= t.capacity
                    }
                    onClick={() => setBooking(t)}
                  >
                    Request a booking
                  </button>
                ) : (
                  <Link className="btn navy" href={`/trip/${t.slug}`}>
                    View trip
                  </Link>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <section className="detail-body-panel">
        <h2>How payments and seats work.</h2>
        <p>
          Select a trip, verify your email and open your private booking page.
          Pay using the verified bank details there, then upload your transfer
          receipt. A transport officer checks payment before confirming your
          seat.
        </p>
        <p>
          A booking request does not reserve a seat. Check the remaining
          capacity before paying.
        </p>
        <Paragraphs text={data.settings.transport_terms} />
      </section>
      <Recovery kind="booking" />
      {booking && (
        <Modal
          title={`Going to ${booking.destination}?`}
          onClose={() => setBooking(null)}
        >
          <BookingForm trip={booking} />
        </Modal>
      )}
    </>
  );
}
function BookingForm({ trip }: { trip: Trip }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [captcha, setCaptcha] = useState("");
  return message ? (
    <Notice>{message}</Notice>
  ) : (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const v = await api("bookings", {
            ...f,
            trip_id: trip.id,
            consent: true,
            captcha,
          });
          setMessage(`${v.message} Reference: ${v.reference}`);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        {trip.title} · {money(trip.fare)} · {date(trip.departure_at)}
      </p>
      <label>
        Your full name
        <input name="name" required maxLength={100} />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Phone number
        <input name="phone" type="tel" required minLength={7} maxLength={30} />
      </label>
      <label className="check-label">
        <input type="checkbox" name="consent" required />I agree to the{" "}
        <Link href="/terms" target="_blank">
          booking terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank">
          privacy information
        </Link>
        . I understand payment must be verified before a seat is confirmed.
      </label>
      <Honeypot />
      <Captcha onToken={setCaptcha} />
      {error && <Notice error>{error}</Notice>}
      <Submit busy={busy}>Continue by email</Submit>
    </form>
  );
}
export function Hub({ route, data }: { route: string; data: HubData }) {
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState<string | null>(null),
    [remote, setRemote] = useState<Entry[]>([]);
  useEffect(() => {
    let active = true;
    if (!data.connected || !search || search.length < 2) {
      setRemote([]);
      return;
    }
    const timer = setTimeout(() => {
      void api(`search?q=${encodeURIComponent(search.slice(0, 100))}`)
        .then((v) => {
          if (active) setRemote(v.rows);
        })
        .catch(() => {});
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, data.connected]);
  const reduced = useReducedMotion();
  const [base, slug] = route.split("/");
  const configuredNav = data.entries.filter(
    (e) => e.kind === "link" && e.data.placement === "navigation",
  );
  const menuItems: NavItem[] = configuredNav.length
    ? configuredNav.map((e) => [String(e.data.url), e.title] as const)
    : nav.map(([url, label]) => [`/${url}`, label] as const);
  const scrolled = useScrolled(),
    progress = useRouteProgress(route, data),
    closeMenu = useCallback(() => setMenu(false), []);
  const detailKind = (
    { place: "place", group: "group", sport: "sport", story: "news" } as Record<
      string,
      string
    >
  )[base];
  const detail = detailKind
    ? data.entries.find((e) => e.kind === detailKind && e.slug === slug)
    : null;
  const trip =
    base === "trip" ? data.trips.find((t) => t.slug === slug) : undefined;
  const custom =
    base === "p"
      ? data.entries.find((e) => e.kind === "page" && e.slug === slug)
      : null;
  const known = !route || !!pages[route] || !!detail || !!trip || !!custom;
  useEffect(() => setMenu(false), [route]);
  const searchResults =
    search === null
      ? []
      : [
          ...Object.entries(pages).map(([slug, [title, summary]]) => ({
            id: slug,
            title,
            summary,
            url: `/${slug}`,
          })),
          ...[
            ...new Map(
              [...data.entries, ...remote].map((e) => [e.id, e]),
            ).values(),
          ]
            .filter(
              (e) => !["page", "ad", "faculty", "department"].includes(e.kind),
            )
            .map((e) => ({
              id: e.id,
              title: e.title,
              summary:
                e.kind === "course"
                  ? `${e.data.course_code} · ${e.summary}`
                  : e.summary,
              url:
                e.kind === "resource"
                  ? `/archive?q=${encodeURIComponent(e.data.course_code)}`
                  : e.kind === "course"
                    ? `/courses?q=${encodeURIComponent(e.data.course_code)}`
                    : e.kind === "link"
                      ? e.data.url
                      : e.kind === "guide"
                        ? `/freshers#guide-${e.slug}`
                        : e.kind === "rule"
                          ? "/hostel-complaints"
                          : `/${e.kind === "news" ? "story" : e.kind}/${e.slug}`,
            })),
        ]
          .filter((e) =>
            `${e.title} ${e.summary}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .slice(0, 20);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <RouteProgress state={progress} />
      <SiteHeader
        data={data}
        items={menuItems}
        route={route}
        scrolled={scrolled}
        menuOpen={menu}
        onMenu={() => setMenu((open) => !open)}
        onSearch={() => setSearch("")}
      />
      <MenuSheet
        open={menu}
        onClose={closeMenu}
        items={menuItems}
        route={route}
        data={data}
        onSearch={() => setSearch("")}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main-content"
          tabIndex={-1}
          key={academicRoutes.has(route.split("/")[0]) ? "academic" : route}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          {!known ? (
            <div className="wrap standalone">
              <h1>This page wandered off.</h1>
              <Link className="btn navy" href="/">
                Back to the hub
              </Link>
            </div>
          ) : !route ? (
            <HomePage data={data} onSearch={setSearch} />
          ) : detail ? (
            <Detail data={data} entry={detail} />
          ) : trip ? (
            <>
              <Intro route="travel" data={data} title={trip.title} />
              <section className="section">
                <div className="wrap">
                  <Travel data={data} trip={trip} />
                </div>
              </section>
            </>
          ) : custom ? (
            <>
              <Intro
                route={slug}
                data={data}
                title={custom.title}
                description={custom.summary}
              />
              <section className="section">
                <div className="wrap article-reading">
                  <Paragraphs text={custom.body} />
                </div>
              </section>
            </>
          ) : (
            <>
              <Intro route={route} data={data} />
              <section className="section">
                <div className="wrap">
                  {data.entries.find(
                    (e) => e.kind === "page" && e.slug === route,
                  )?.body && (
                    <div className="page-body">
                      <Paragraphs
                        text={
                          data.entries.find(
                            (e) => e.kind === "page" && e.slug === route,
                          )!.body
                        }
                      />
                    </div>
                  )}
                  {route === "archive" ? (
                    <>
                      <div className="curriculum-archive-link">
                        <BookOpen size={24} />
                        <div>
                          <h2>Looking for your course list?</h2>
                          <p>
                            See the courses for your faculty, department, level
                            and semester.
                          </p>
                        </div>
                        <Link href="/courses" className="btn outline">
                          Browse courses
                        </Link>
                      </div>
                      <AcademicList data={data} />
                    </>
                  ) : route === "courses" ? (
                    <CourseCatalogue data={data} />
                  ) : route === "reviews" ? (
                    <AcademicList data={data} reviews />
                  ) : route === "freshers" ? (
                    <Freshers data={data} />
                  ) : route === "school-links" ? (
                    <OfficialLinks data={data} />
                  ) : [
                      "places",
                      "groups",
                      "sports",
                      "news",
                    ].includes(route) ? (
                    <ContentList
                      key={route}
                      data={data}
                      kind={
                        (
                          {
                            places: "place",
                            groups: "group",
                            sports: "sport",
                            news: "news",
                          } as const
                        )[route as "places"]
                      }
                    />
                  ) : ["ask-scf", "issues", "hostel-complaints"].includes(
                      route,
                    ) ? (
                    <Support
                      key={route}
                      data={data}
                      kind={
                        route === "issues"
                          ? "academic"
                          : route === "hostel-complaints"
                            ? "hostel"
                            : "general"
                      }
                    />
                  ) : route === "travel" ? (
                    <Travel data={data} />
                  ) : route === "privacy" || route === "terms" ? (
                    <div className="article-reading">
                      <Paragraphs
                        text={
                          data.settings[
                            route === "privacy" ? "privacy_text" : "terms_text"
                          ]
                        }
                      />
                    </div>
                  ) : route === "explore" ? (
                    <div className="explore-index-grid">
                      {Object.entries(pages)
                        .filter(
                          ([slug]) =>
                            !["explore", "privacy", "terms"].includes(slug),
                        )
                        .map(([slug, [title, description]]) => (
                          <Link
                            className="explore-index-card"
                            key={slug}
                            href={`/${slug}`}
                          >
                            <div>
                              <h2>{title}</h2>
                              <p>{description}</p>
                              <span>Explore</span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  ) : null}
                  <Ad data={data} placement={route} />
                </div>
              </section>
            </>
          )}
        </motion.main>
      </AnimatePresence>
      <SiteFooter data={data} />
      {search !== null && (
        <Modal title="What do you need?" onClose={() => setSearch(null)}>
          <label className="sr-only" htmlFor="global-search">
            Search the hub
          </label>
          <input
            id="global-search"
            className="field"
            type="search"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Course, group, campus spot…"
          />
          <div className="search-results">
            {searchResults.length ? (
              searchResults.map((r) => (
                <Link key={r.id} href={r.url} onClick={() => setSearch(null)}>
                  <h3>{r.title}</h3>
                  <p>{r.summary}</p>
                </Link>
              ))
            ) : (
              <Empty title="No matches found." text="Try a different search." />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
