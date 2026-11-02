"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  LogOut,
  Menu,
  X,
  Plus,
  RefreshCw,
  Search,
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Bus,
  Users,
  Settings,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api, Modal, Notice, Submit, FileInput, Empty } from "./ui";
import { Select } from "./select";
import { makeCourseSlug } from "@/lib/curriculum";
import {
  defaultSettings,
  hasPermission,
  kindModule,
  courseLevels,
  courseSemesters,
  modules,
  slugify,
  money,
  type Entry,
  type Kind,
  type Staff,
  type Trip,
} from "@/lib/domain";
const kindLabels: Record<Kind, string> = {
  page: "Pages & banners",
  resource: "Study resources",
  course: "Course Catalogue",
  place: "Campus spots",
  group: "Student groups",
  sport: "Sport & Fitness",
  news: "News & events",
  link: "School & WhatsApp links",
  guide: "Freshers’ guide",
  rule: "Hostel rules",
  ad: "Adverts",
  faculty: "Faculties",
  department: "Departments",
};
type Field = {
  key: string;
  label: string;
  type?:
    | "textarea"
    | "number"
    | "checkbox"
    | "select"
    | "file"
    | "lines"
    | "datetime"
    | "departments";
  options?: string[];
  hint?: string;
};
const fields: Record<Kind, Field[]> = {
  page: [],
  course: [
    {
      key: "course_code",
      label: "Course code",
      hint: "For example COS 101. The title above is the course name.",
    },
    { key: "faculty_id", label: "Faculty" },
    {
      key: "department_ids",
      label: "Departments offering this course",
      type: "departments",
      hint: "Choose every department taking this course with these units, level, semester and course status.",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [...courseLevels],
    },
    {
      key: "semester",
      label: "Semester",
      type: "select",
      options: [...courseSemesters],
    },
    { key: "units", label: "Course units", type: "number" },
    {
      key: "course_type",
      label: "Course status",
      type: "select",
      options: ["Compulsory", "Elective"],
    },
    {
      key: "session",
      label: "Academic session (optional)",
      hint: "For example 2026/27. Leave empty if this listing applies across sessions.",
    },
  ],
  resource: [
    { key: "course_code", label: "Course code" },
    { key: "faculty", label: "Faculty" },
    {
      key: "departments",
      label: "Departments",
      type: "lines",
      hint: "One department per line. A resource can appear in several departments.",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: ["100", "200", "300", "400", "500", "600"],
    },
    { key: "session", label: "Academic session" },
    {
      key: "material_type",
      label: "Material type",
      type: "select",
      options: ["Past questions", "Notes", "Study materials"],
    },
    { key: "file_id", label: "Resource document", type: "file" },
  ],
  place: [
    {
      key: "category",
      label: "Category",
      type: "select",
      options: ["Food", "Drink", "Shop"],
    },
    { key: "location", label: "Location" },
    { key: "hours", label: "Opening hours" },
    { key: "price_min", label: "Starting price (₦)", type: "number" },
    { key: "price_max", label: "Upper price (₦)", type: "number" },
    { key: "contact_url", label: "Contact / directions link" },
    { key: "sponsored", label: "Sponsored listing", type: "checkbox" },
    {
      key: "menu",
      label: "Menu or products",
      type: "textarea",
      hint: "One item per line: Item name | Price",
    },
  ],
  group: [
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        "Academic & Tech",
        "Faith & Fellowship",
        "Arts & Creativity",
        "Volunteering",
        "Culture & Community",
      ],
    },
    { key: "meeting_time", label: "Meeting time" },
    { key: "location", label: "Location" },
    { key: "join_url", label: "Joining link (including WhatsApp)" },
    { key: "contact_url", label: "Contact link" },
    {
      key: "activities",
      label: "Activities",
      type: "textarea",
      hint: "One per line: Activity title | Description",
    },
  ],
  sport: [
    { key: "category", label: "Category" },
    { key: "location", label: "Location" },
    { key: "schedule", label: "Training / fixture schedule", type: "textarea" },
    { key: "contact_url", label: "Contact / joining link" },
    {
      key: "activities",
      label: "Activities",
      type: "textarea",
      hint: "One per line: Activity title | Description",
    },
  ],
  news: [
    { key: "category", label: "Category" },
    { key: "event_at", label: "Event date (optional)", type: "datetime" },
    { key: "location", label: "Event location" },
  ],
  link: [
    {
      key: "url",
      label: "Destination URL",
      hint: "Use https://wa.me/… or https://chat.whatsapp.com/… for WhatsApp.",
    },
    {
      key: "category",
      label: "Category",
      hint: "For example Learning, Student services, Class groups or Getting started.",
    },
    {
      key: "placement",
      label: "Show this link in",
      type: "select",
      options: ["directory", "whatsapp", "navigation", "footer"],
    },
    {
      key: "instructions",
      label: "Where to click / what to know",
      type: "textarea",
    },
  ],
  guide: [
    { key: "link_url", label: "Related link" },
    { key: "link_label", label: "Button text" },
  ],
  rule: [
    { key: "file_id", label: "Rules document (PDF)", type: "file" },
    { key: "link_url", label: "Alternative rules link" },
  ],
  ad: [
    { key: "url", label: "Advert destination URL" },
    {
      key: "placement",
      label: "Placement",
      type: "select",
      options: [
        "home",
        "archive",
        "reviews",
        "freshers",
        "places",
        "groups",
        "sports",
        "news",
        "travel",
      ],
    },
    { key: "starts_at", label: "Start date (optional)", type: "datetime" },
    { key: "ends_at", label: "End date (optional)", type: "datetime" },
    { key: "cta", label: "Button text" },
  ],
  faculty: [],
  department: [{ key: "faculty_id", label: "Faculty" }],
};
const localTime = (v: string) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
};
function Login({ reason, onDone }: { reason: string; onDone: () => void }) {
  const [forgot, setForgot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <main className="auth-page">
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const result = await api(forgot ? "auth/forgot" : "auth/login", f);
            if (forgot) setMessage(result.message);
            else onDone();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Link href="/" className="wordmark">
          <strong>SCF</strong>
          <b>
            STUDENTS’
            <br />
            HUB
          </b>
        </Link>
        <h1>{forgot ? "Reset your password." : "Staff, this way."}</h1>
        <p>Access is for authorised SCF members.</p>
        {reason && !reason.includes("sign in") && (
          <Notice error>{reason}</Notice>
        )}
        <label>
          Email
          <input type="email" name="email" required autoComplete="username" />
        </label>
        {!forgot && (
          <label>
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
        )}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <Submit busy={busy}>
          {forgot ? "Send recovery email" : "Sign in"}
        </Submit>
        <button
          type="button"
          className="link"
          onClick={() => {
            setForgot(!forgot);
            setError("");
            setMessage("");
          }}
        >
          {forgot ? "Back to sign in" : "Forgot your password?"}
        </button>
      </form>
    </main>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
function CsvButton({ rows, name }: { rows: any[]; name: string }) {
  return (
    <button
      className="btn outline small"
      onClick={() => {
        if (!rows.length) return;
        const keys = Object.keys(rows[0]);
        const cell = (v: unknown) => {
          let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
          if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        };
        const csv = [
          keys.map(cell).join(","),
          ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
        ].join("\r\n");
        const url = URL.createObjectURL(
            new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
          ),
          a = document.createElement("a");
        a.href = url;
        a.download = `scf-${name}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      Export CSV
    </button>
  );
}
export function Admin({ section }: { section: string[] }) {
  const [data, setData] = useState<any>(null),
    [reason, setReason] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [q, setQ] = useState(""),
    [editor, setEditor] = useState<any>(null),
    [caseView, setCaseView] = useState<any>(null);
  const area = section[0] || "overview",
    kind = (section[1] || "page") as Kind;
  async function load() {
    setLoading(true);
    try {
      setData(await api("admin/data"));
      setReason("");
    } catch (e) {
      setReason((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setMenu(false);
    setQ("");
    setNotice("");
  }, [area, kind]);
  async function mutate(path: string, value: unknown) {
    setError("");
    try {
      await api(path, value);
      setNotice("Saved.");
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  if (!data)
    return loading ? (
      <main className="auth-page">
        <p role="status">Opening the staff workspace…</p>
      </main>
    ) : (
      <Login reason={reason} onDone={load} />
    );
  const staff: Staff = data.staff;
  const allowed = (m: any) => hasPermission(staff, m);
  const kinds = (Object.keys(kindLabels) as Kind[]).filter((k) =>
    allowed(kindModule(k)),
  );
  const count =
    (data.summary?.openCases ?? 0) +
    (data.summary?.pendingReviews ?? 0) +
    (data.summary?.pendingBookings ?? 0);
  const title =
    area === "entries"
      ? kindLabels[kind]
      : (
          {
            overview: "Your SCF workspace",
            reviews: "Review moderation",
            complaints: "Complaints inbox",
            trips: "Transport trips",
            bookings: "Transport bookings",
            staff: "SCF members",
            settings: "Site settings",
            emails: "Email delivery",
            audit: "Activity log",
          } as Record<string, string>
        )[area] || "Workspace";
  const matches = (r: any) =>
    JSON.stringify(r).toLowerCase().includes(q.toLowerCase());
  const items =
    area === "entries"
      ? data.entries.filter((e: Entry) => e.kind === kind && matches(e))
      : [];
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "is-open" : ""}`}>
        <Link href="/" className="wordmark">
          <strong>SCF</strong>
          <b>
            STUDENTS’
            <br />
            HUB
          </b>
        </Link>
        <button
          className="icon-btn mobile-close"
          onClick={() => setMenu(false)}
          aria-label="Close sidebar"
        >
          <X />
        </button>
        <nav aria-label="Admin sections">
          <Link className={area === "overview" ? "selected" : ""} href="/admin">
            <LayoutDashboard size={18} />
            Overview
          </Link>
          {kinds.map((k) => (
            <Link
              className={area === "entries" && kind === k ? "selected" : ""}
              key={k}
              href={`/admin/entries/${k}`}
            >
              <FileText size={18} />
              {kindLabels[k]}
            </Link>
          ))}
          {[
            ["reviews", "reviews", "Reviews", FileText],
            ["complaints", "complaints", "Complaints", MessageCircle],
            ["transport", "trips", "Trips", Bus],
            ["transport", "bookings", "Bookings", Bus],
            ["staff", "staff", "SCF members", Users],
            ["settings", "settings", "Settings", Settings],
            ["settings", "emails", "Email delivery", Mail],
          ]
            .filter(([module]) => allowed(module))
            .map(([m, slug, label, Icon]) => (
              <Link
                key={slug as string}
                className={area === slug ? "selected" : ""}
                href={`/admin/${slug}`}
              >
                {typeof Icon !== "string" && <Icon size={18} />}
                {label as string}
              </Link>
            ))}
          {staff.role !== "staff" && (
            <Link href="/admin/audit">
              <ShieldCheck size={18} />
              Activity log
            </Link>
          )}
        </nav>
        <div className="sidebar-user">
          <strong>{staff.display_name}</strong>
          <span>{staff.role}</span>
          <button
            onClick={async () => {
              await api("auth/logout", {});
              setData(null);
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button
            className="icon-btn mobile-menu"
            aria-label="Open sidebar"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div>
            <p>SCF STUDENTS’ HUB</p>
            <h1>{title}</h1>
          </div>
          <div className="admin-header-actions">
            <button
              className="icon-btn"
              onClick={load}
              aria-label="Refresh data"
              disabled={loading}
            >
              <RefreshCw size={20} className={loading ? "spin" : ""} />
            </button>
            <button
              className="icon-btn notification-bell"
              aria-label={`${count} items need attention`}
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={21} />
              {count > 0 && <span>{count}</span>}
            </button>
            <Link className="btn outline small" href="/" target="_blank">
              View site
            </Link>
          </div>
          {notifications && (
            <div className="notification-popover">
              <h2>Needs attention</h2>
              <Link
                href="/admin/complaints"
                onClick={() => setNotifications(false)}
              >
                {data.summary?.openCases ?? 0} unclaimed complaints
              </Link>
              <Link
                href="/admin/reviews"
                onClick={() => setNotifications(false)}
              >
                {data.summary?.pendingReviews ?? 0} reviews to moderate
              </Link>
              <Link
                href="/admin/bookings"
                onClick={() => setNotifications(false)}
              >
                {
                  data.bookings.filter(
                    (b: any) =>
                      b.status === "pending" || b.cancellation_requested,
                  ).length
                }{" "}
                transport items
              </Link>
            </div>
          )}
        </header>
        <main className="admin-content">
          {error && <Notice error>{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          {area === "overview" && (
            <>
              <div className="admin-stats">
                {[
                  ["Published items", data.summary?.published ?? 0],
                  ["Unclaimed complaints", data.summary?.openCases ?? 0],
                  ["Pending reviews", data.summary?.pendingReviews ?? 0],
                  ["Confirmed seats", data.summary?.confirmedSeats ?? 0],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
              <section className="admin-panel">
                <h2>A useful place to start.</h2>
                <p>
                  Publish verified information, check the complaints inbox and
                  keep transport bookings up to date.
                </p>
                <div className="dashboard-actions">
                  {allowed("content") && (
                    <Link href="/admin/entries/link">
                      Add school & WhatsApp links
                    </Link>
                  )}
                  {allowed("complaints") && (
                    <Link href="/admin/complaints">Open complaints</Link>
                  )}
                  {allowed("transport") && (
                    <Link href="/admin/bookings">Verify receipts</Link>
                  )}
                  {allowed("settings") && (
                    <Link href="/admin/settings">
                      Edit homepage & payment details
                    </Link>
                  )}
                </div>
              </section>
              <section className="admin-panel">
                <h2>Before students use the hub.</h2>
                <p>
                  Confirm the school information, bank details, transport terms
                  and privacy wording. Configure your email sender and retry job
                  using the included setup guide.
                </p>
              </section>
            </>
          )}
          {area === "entries" && kinds.includes(kind) && (
            <>
              <div className="admin-toolbar">
                <label className="admin-search">
                  <Search size={18} />
                  <input
                    aria-label="Search records"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search this section"
                  />
                </label>
                <button
                  className="btn navy"
                  onClick={() => setEditor({ kind })}
                >
                  <Plus size={18} />
                  Add {kind === "link" ? "link" : kind}
                </button>
              </div>
              {kind === "course" && (
                <Notice>
                  Maintain the approved curriculum here. Add faculties and
                  departments first, then choose which departments take each
                  course. Publish their records before publishing the course.
                </Notice>
              )}
              {kind === "page" && (
                <Notice>
                  Use a page slug such as archive, reviews, freshers, places,
                  groups, sports, news, travel, school-links, ask-scf, issues or
                  hostel-complaints to edit its title and banner. Custom pages
                  appear at /p/your-slug.
                </Notice>
              )}
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e: Entry) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.title}</strong>
                          <small>/{e.slug}</small>
                        </td>
                        <td>
                          <Status value={e.status} />
                        </td>
                        <td>{e.sort_order}</td>
                        <td>
                          <button
                            className="btn outline small"
                            onClick={() => setEditor(e)}
                          >
                            Edit
                          </button>
                          {e.status !== "archived" && (
                            <button
                              className="text-danger"
                              onClick={() =>
                                mutate("admin/archive", { id: e.id })
                              }
                            >
                              Archive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!items.length && (
                <Empty
                  title="No records here yet."
                  text="Add a record, save it as a draft and publish when it’s ready."
                />
              )}
            </>
          )}
          {area === "reviews" && allowed("reviews") && (
            <>
              <Toolbar q={q} setQ={setQ} rows={data.reviews} name="reviews" />
              {data.reviews.filter(matches).map((r: any) => (
                <article className="admin-panel" key={r.id}>
                  <div className="section-head">
                    <div>
                      <h2>
                        {r.course_code ? `${r.course_code} · ` : ""}
                        {r.title}
                      </h2>
                      <p>
                        {r.author_name} · {r.rating}/5 · {r.kind}
                      </p>
                    </div>
                    <Status value={r.status} />
                  </div>
                  <p>{r.body}</p>
                  {r.helped && <blockquote>“{r.helped}”</blockquote>}
                  <div className="row-actions">
                    {["published", "rejected", "pending"]
                      .filter((v) => v !== r.status)
                      .map((status) => (
                        <button
                          className="btn outline small"
                          key={status}
                          onClick={() =>
                            mutate("admin/reviews", { id: r.id, status })
                          }
                        >
                          {status === "published"
                            ? "Approve"
                            : status === "rejected"
                              ? "Reject"
                              : "Return to pending"}
                        </button>
                      ))}
                  </div>
                </article>
              ))}
            </>
          )}
          {area === "complaints" && allowed("complaints") && (
            <>
              <Toolbar q={q} setQ={setQ} rows={data.cases} name="complaints" />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Assigned to</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.cases.filter(matches).map((c: any) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.subject}</strong>
                          <small>
                            {c.reference} · {c.kind}
                          </small>
                        </td>
                        <td>
                          {c.name}
                          <small>{c.email}</small>
                        </td>
                        <td>
                          <Status value={c.status} />
                        </td>
                        <td>
                          {data.members.find((m: any) => m.id === c.assignee)
                            ?.display_name ||
                            (c.assignee === staff.id
                              ? staff.display_name
                              : c.assignee
                                ? "SCF member"
                                : "Unclaimed")}
                        </td>
                        <td>
                          <button
                            className="btn outline small"
                            onClick={() => setCaseView(c)}
                          >
                            Open case
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.cases.length && (
                <Empty title="No verified complaints yet." />
              )}
            </>
          )}
          {area === "trips" && allowed("transport") && (
            <>
              <div className="admin-toolbar">
                <h2>Routes & departures</h2>
                <button
                  className="btn navy"
                  onClick={() => setEditor({ type: "trip" })}
                >
                  <Plus size={18} />
                  Add trip
                </button>
              </div>
              {data.trips.map((t: any) => (
                <article className="admin-panel" key={t.id}>
                  <div className="section-head">
                    <div>
                      <h2>{t.title}</h2>
                      <p>
                        {t.destination} ·{" "}
                        {new Date(t.departure_at).toLocaleString()} ·{" "}
                        {money(t.fare)}
                      </p>
                      <p>
                        {Number(
                          data.availability?.find(
                            (a: any) => a.trip_id === t.id,
                          )?.confirmed_count || 0,
                        )}
                        /{t.capacity} seats confirmed
                      </p>
                    </div>
                    <Status value={t.status} />
                  </div>
                  <button
                    className="btn outline small"
                    onClick={() => setEditor({ ...t, type: "trip" })}
                  >
                    Edit trip
                  </button>
                </article>
              ))}
            </>
          )}
          {area === "bookings" && allowed("transport") && (
            <>
              <Toolbar q={q} setQ={setQ} rows={data.bookings} name="bookings" />
              {data.bookings.filter(matches).map((b: any) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  trip={data.trips.find((t: any) => t.id === b.trip_id)}
                  onSave={(decision, note) =>
                    mutate("admin/bookings", { id: b.id, decision, note })
                  }
                />
              ))}
            </>
          )}
          {area === "staff" && allowed("staff") && (
            <>
              <div className="admin-toolbar">
                <p>Only owners can invite members and change their access.</p>
                {staff.role === "owner" && (
                  <button
                    className="btn navy"
                    onClick={() => setEditor({ type: "staff" })}
                  >
                    Invite member
                  </button>
                )}
              </div>
              {data.members.map((m: Staff) => (
                <article key={m.id} className="admin-panel">
                  <div className="section-head">
                    <div>
                      <h2>{m.display_name}</h2>
                      <p>
                        {m.email} · {m.role} ·{" "}
                        {m.active ? "Active" : "Deactivated"}
                      </p>
                      <p>
                        {m.role === "staff"
                          ? m.permissions.join(", ")
                          : "All areas"}
                      </p>
                    </div>
                    {staff.role === "owner" && (
                      <button
                        className="btn outline small"
                        onClick={() => setEditor({ ...m, type: "staff" })}
                      >
                        Edit access
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </>
          )}
          {area === "settings" && allowed("settings") && (
            <SettingsEditor
              initial={data.settings}
              onSave={(v) => mutate("admin/settings", v)}
            />
          )}
          {area === "emails" && allowed("settings") && (
            <>
              <p>
                Delivery retries run automatically when the scheduled job is
                configured. Failed jobs can be retried here.
              </p>
              <Toolbar
                q={q}
                setQ={setQ}
                rows={data.outbox}
                name="email-status"
              />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Message</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.outbox.filter(matches).map((m: any) => (
                      <tr key={m.id}>
                        <td>
                          {m.subject}
                          {m.last_error && <small>{m.last_error}</small>}
                        </td>
                        <td>{m.recipient}</td>
                        <td>
                          <Status value={m.status} />
                        </td>
                        <td>{m.attempts}</td>
                        <td>
                          {["failed", "pending"].includes(m.status) && (
                            <button
                              className="btn outline small"
                              onClick={() =>
                                mutate("admin/emails/retry", { id: m.id })
                              }
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {area === "audit" && staff.role !== "staff" && (
            <>
              <Toolbar q={q} setQ={setQ} rows={data.audit} name="activity" />
              {data.audit.filter(matches).map((a: any) => (
                <article className="audit-row" key={a.id}>
                  <strong>{a.action}</strong>
                  <span>{a.target_id}</span>
                  <time>{new Date(a.created_at).toLocaleString()}</time>
                </article>
              ))}
            </>
          )}
          {area !== "overview" && area !== "settings" && (
            <OlderRecords
              area={area}
              kind={kind}
              data={data}
              onRows={(key, rows) =>
                setData((old: any) => ({
                  ...old,
                  [key]: [
                    ...new Map(
                      [...old[key], ...rows].map((r: any) => [r.id, r]),
                    ).values(),
                  ],
                }))
              }
            />
          )}
        </main>
      </div>
      {editor && (
        <Modal
          title={
            editor.type === "trip"
              ? "Edit trip"
              : editor.type === "staff"
                ? "SCF member"
                : `Edit ${editor.kind}`
          }
          onClose={() => setEditor(null)}
        >
          {editor.type === "trip" ? (
            <TripEditor
              initial={editor}
              onSave={async (v) => {
                if (await mutate("admin/trips", v)) setEditor(null);
              }}
            />
          ) : editor.type === "staff" ? (
            <StaffEditor
              initial={editor}
              onSave={async (v) => {
                if (await mutate("admin/staff", v)) setEditor(null);
              }}
            />
          ) : (
            <EntryEditor
              initial={editor}
              entries={data.entries}
              onSave={async (v) => {
                if (await mutate("admin/entries", v)) setEditor(null);
              }}
            />
          )}
          {error && <Notice error>{error}</Notice>}
        </Modal>
      )}
      {caseView && (
        <Modal title={caseView.reference} onClose={() => setCaseView(null)}>
          <CasePanel
            record={
              data.cases.find((c: any) => c.id === caseView.id) || caseView
            }
            staff={staff}
            onAction={(value) =>
              mutate("admin/cases", { id: caseView.id, ...value })
            }
          />
          {error && <Notice error>{error}</Notice>}
        </Modal>
      )}
    </div>
  );
}
function Toolbar({
  q,
  setQ,
  rows,
  name,
}: {
  q: string;
  setQ: (v: string) => void;
  rows: any[];
  name: string;
}) {
  return (
    <div className="admin-toolbar">
      <label className="admin-search">
        <Search size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search records"
          aria-label="Search records"
        />
      </label>
      <CsvButton rows={rows} name={name} />
    </div>
  );
}
function EntryEditor({
  initial,
  entries,
  onSave,
}: {
  initial: any;
  entries: Entry[];
  onSave: (v: any) => Promise<void>;
}) {
  const kind = initial.kind as Kind;
  const defaults = Object.fromEntries(
    fields[kind].map((f) => [
      f.key,
      f.type === "number"
        ? 0
        : f.type === "checkbox"
          ? false
          : f.type === "lines" || f.type === "departments"
            ? []
            : f.type === "select"
              ? f.options![0]
              : "",
    ]),
  );
  const [value, setValue] = useState<any>({
      title: "",
      slug: "",
      summary: "",
      body: "",
      image: "",
      status: "draft",
      sort_order: 0,
      ...initial,
      data: {
        ...defaults,
        ...initial.data,
        ...(kind === "department" && !initial.data?.faculty_id
          ? {
              faculty_id:
                entries.find(
                  (e) =>
                    e.kind === "faculty" && e.title === initial.data?.faculty,
                )?.id || "",
            }
          : {}),
      },
    }),
    [busy, setBusy] = useState(false),
    [slugEdited, setSlugEdited] = useState(!!initial.id);
  const update = (key: string, v: any) =>
    setValue((s: any) => ({ ...s, [key]: v }));
  const change = (key: string, v: any) =>
    setValue((s: any) => ({ ...s, data: { ...s.data, [key]: v } }));
  const courseFaculties = entries.filter(
    (e) => e.kind === "faculty" && e.status !== "archived",
  );
  const selectedFaculty = courseFaculties.find(
    (e) => e.id === value.data.faculty_id,
  );
  const courseDepartments = entries.filter(
    (e) =>
      e.kind === "department" &&
      e.status !== "archived" &&
      (e.data.faculty_id
        ? e.data.faculty_id === value.data.faculty_id
        : e.data.faculty === selectedFaculty?.title),
  );
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(
            kind === "course" && !slugEdited && !initial.id
              ? { ...value, slug: makeCourseSlug(value.data) }
              : value,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="form-grid">
          <label>
            Title
            <input
              value={value.title}
              required
              maxLength={180}
              onChange={(e) => {
                update("title", e.target.value);
                if (!slugEdited) update("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label>
            URL slug
            <input
              value={value.slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(e) => {
                setSlugEdited(true);
                update("slug", e.target.value);
              }}
            />
          </label>
        </div>
        <label>
          {kind === "page" ? "Page introduction" : "Short description"}
          <textarea
            value={value.summary}
            maxLength={600}
            rows={3}
            onChange={(e) => update("summary", e.target.value)}
          />
        </label>
        {!["faculty", "department", "link", "resource"].includes(kind) && (
          <label>
            Full text
            <textarea
              value={value.body}
              rows={8}
              maxLength={30000}
              onChange={(e) => update("body", e.target.value)}
            />
            <small>Separate paragraphs with a blank line.</small>
          </label>
        )}
        {![
          "faculty",
          "department",
          "link",
          "resource",
          "rule",
          "course",
        ].includes(kind) && (
          <div>
            <label>
              {kind === "page" ? "Title banner image" : "Cover image"}
              <input
                value={value.image}
                onChange={(e) => update("image", e.target.value)}
                placeholder="Image URL or upload below"
              />
            </label>
            <FileInput
              purpose="image"
              value={value.image}
              onChange={(_, url) => update("image", url)}
            />
            {value.image && (
              <button
                type="button"
                className="link"
                onClick={() => update("image", "")}
              >
                Remove image{kind === "page" ? " and restore gold banner" : ""}
              </button>
            )}
          </div>
        )}
        {fields[kind].map((f) =>
          f.type === "departments" ? (
            <fieldset className="course-department-picker" key={f.key}>
              <legend>{f.label}</legend>
              {!value.data.faculty_id ? (
                <small>Choose a faculty first.</small>
              ) : !courseDepartments.length ? (
                <small>
                  Add departments for this faculty under Departments first.
                </small>
              ) : (
                courseDepartments.map((e) => (
                  <label key={e.id} className="check-label">
                    <input
                      type="checkbox"
                      checked={value.data.department_ids.includes(e.id)}
                      onChange={(event) =>
                        change(
                          "department_ids",
                          event.target.checked
                            ? [...value.data.department_ids, e.id]
                            : value.data.department_ids.filter(
                                (id: string) => id !== e.id,
                              ),
                        )
                      }
                    />
                    {e.title}
                    {e.status === "draft" ? " (draft)" : ""}
                  </label>
                ))
              )}
              <small>{f.hint}</small>
            </fieldset>
          ) : (
            <label
              key={f.key}
              className={f.type === "checkbox" ? "check-label" : ""}
            >
              {f.type === "checkbox" ? (
                <>
                  <input
                    type="checkbox"
                    checked={value.data[f.key]}
                    onChange={(e) => change(f.key, e.target.checked)}
                  />
                  {f.label}
                </>
              ) : (
                <>
                  {f.label}
                  {(kind === "course" || kind === "department") &&
                  f.key === "faculty_id" ? (
                    <>
                      <Select
                        required
                        value={value.data.faculty_id}
                        onChange={(e) =>
                          setValue((old: any) => ({
                            ...old,
                            data: {
                              ...old.data,
                              faculty_id: e.target.value,
                              ...(kind === "course"
                                ? { department_ids: [] }
                                : {}),
                            },
                          }))
                        }
                      >
                        <option value="">Choose a faculty</option>
                        {courseFaculties.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                            {e.status === "draft" ? " (draft)" : ""}
                          </option>
                        ))}
                      </Select>
                      {!courseFaculties.length && (
                        <small>Add the faculty under Faculties first.</small>
                      )}
                    </>
                  ) : f.type === "file" ? (
                    <FileInput
                      purpose={kind === "resource" ? "resource" : "rule"}
                      value={value.data[f.key]}
                      onChange={(id) => change(f.key, id)}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={value.data[f.key]}
                      onChange={(e) => change(f.key, e.target.value)}
                    >
                      {f.options!.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </Select>
                  ) : f.type === "textarea" || f.type === "lines" ? (
                    <textarea
                      rows={4}
                      value={
                        f.type === "lines"
                          ? value.data[f.key].join("\n")
                          : value.data[f.key]
                      }
                      onChange={(e) =>
                        change(
                          f.key,
                          f.type === "lines"
                            ? e.target.value.split("\n")
                            : e.target.value,
                        )
                      }
                    />
                  ) : (
                    <input
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "datetime"
                            ? "datetime-local"
                            : "text"
                      }
                      min={f.type === "number" ? 0 : undefined}
                      value={
                        f.type === "datetime"
                          ? localTime(value.data[f.key])
                          : value.data[f.key]
                      }
                      list={f.key === "faculty" ? "admin-faculties" : undefined}
                      onChange={(e) =>
                        change(
                          f.key,
                          f.type === "number"
                            ? Number(e.target.value)
                            : f.type === "datetime" && e.target.value
                              ? new Date(e.target.value).toISOString()
                              : e.target.value,
                        )
                      }
                    />
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </>
              )}
            </label>
          ),
        )}
        <datalist id="admin-faculties">
          {entries
            .filter((e) => e.kind === "faculty")
            .map((e) => (
              <option key={e.id}>{e.title}</option>
            ))}
        </datalist>
        <div className="form-grid">
          <label>
            Visibility
            <Select
              value={value.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </label>
          <label>
            Display order
            <input
              type="number"
              min={0}
              max={100000}
              value={value.sort_order}
              onChange={(e) => update("sort_order", Number(e.target.value))}
            />
            <small>Lower numbers appear first.</small>
          </label>
        </div>
        <Submit busy={busy}>Save {kind}</Submit>
      </fieldset>
    </form>
  );
}
function TripEditor({
  initial,
  onSave,
}: {
  initial: any;
  onSave: (v: any) => Promise<void>;
}) {
  const [v, setV] = useState<any>({
      title: "",
      slug: "",
      destination: "",
      departure_at: "",
      fare: 0,
      capacity: 20,
      meeting_point: "",
      instructions: "",
      booking_closes_at: "",
      status: "draft",
      ...initial,
    }),
    [busy, setBusy] = useState(false);
  const change = (key: string, value: any) =>
    setV((s: any) => ({ ...s, [key]: value }));
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(v);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="form-grid">
          {[
            ["title", "Trip title"],
            ["slug", "URL slug"],
            ["destination", "Destination"],
            ["meeting_point", "Meeting point"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={v[key]}
                required
                onChange={(e) => {
                  change(key, e.target.value);
                  if (key === "title" && !initial.id)
                    change("slug", slugify(e.target.value));
                }}
              />
            </label>
          ))}
          {[
            ["departure_at", "Departure"],
            ["booking_closes_at", "Booking closes"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="datetime-local"
                required
                value={localTime(v[key])}
                onChange={(e) =>
                  change(
                    key,
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  )
                }
              />
            </label>
          ))}
          {[
            ["fare", "Fare (₦)"],
            ["capacity", "Seat capacity"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={key === "capacity" ? 1 : 0}
                step={key === "capacity" ? 1 : 0.01}
                value={v[key]}
                required
                onChange={(e) => change(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <label>
          Instructions
          <textarea
            value={v.instructions}
            rows={5}
            onChange={(e) => change("instructions", e.target.value)}
          />
        </label>
        <label>
          Status
          <Select
            value={v.status}
            onChange={(e) => change("status", e.target.value)}
          >
            {["draft", "published", "closed", "cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        {v.status === "cancelled" && (
          <Notice>
            Cancelling a trip also cancels its bookings and emails affected
            students. Payment refunds must be handled by the transport team.
          </Notice>
        )}
        <Submit busy={busy}>Save trip</Submit>
      </fieldset>
    </form>
  );
}
function StaffEditor({
  initial,
  onSave,
}: {
  initial: any;
  onSave: (v: any) => Promise<void>;
}) {
  const [v, setV] = useState<any>({
      display_name: "",
      email: "",
      notification_email: "",
      role: "staff",
      permissions: ["complaints"],
      active: true,
      ...initial,
    }),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(v);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Full name
          <input
            required
            value={v.display_name}
            onChange={(e) => setV({ ...v, display_name: e.target.value })}
          />
        </label>
        <label>
          Login email
          <input
            type="email"
            required
            disabled={!!v.id}
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
          />
        </label>
        <label>
          Notification email (optional)
          <input
            type="email"
            value={v.notification_email || ""}
            placeholder="Uses login email when empty"
            onChange={(e) => setV({ ...v, notification_email: e.target.value })}
          />
        </label>
        <label>
          Role
          <Select
            value={v.role}
            onChange={(e) => setV({ ...v, role: e.target.value })}
          >
            {["staff", "admin", "owner"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </label>
        <p>
          Owners manage staff access. Admins can manage all website areas. Staff
          access is limited to the permissions below.
        </p>
        {v.role === "staff" && (
          <fieldset>
            <legend>Allowed areas</legend>
            {modules.map((m) => (
              <label className="check-label" key={m}>
                <input
                  type="checkbox"
                  checked={v.permissions.includes(m)}
                  onChange={(e) =>
                    setV({
                      ...v,
                      permissions: e.target.checked
                        ? [...v.permissions, m]
                        : v.permissions.filter((x: string) => x !== m),
                    })
                  }
                />
                {m}
              </label>
            ))}
          </fieldset>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={v.active}
            onChange={(e) => setV({ ...v, active: e.target.checked })}
          />
          Active account
        </label>
        <Submit busy={busy}>{v.id ? "Save member" : "Send invitation"}</Submit>
      </fieldset>
    </form>
  );
}
function SettingsEditor({
  initial,
  onSave,
}: {
  initial: Record<string, string>;
  onSave: (v: unknown) => Promise<boolean>;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false);
  const groups: Record<string, string[]> = {
    "Homepage & identity": [
      "site_name",
      "site_description",
      "strapline",
      "hero_title",
      "hero_emphasis",
      "hero_text",
      "hero_image",
      "hero_caption",
      "home_feature_image",
      "home_groups_image",
      "home_food_image",
      "home_sports_image",
      "home_updates_title",
      "home_updates_text",
      "home_feature_title",
      "home_feature_text",
      "home_life_title",
      "home_life_text",
      "home_food_title",
      "home_food_text",
      "home_groups_title",
      "home_groups_text",
      "home_sports_title",
      "home_sports_text",
      "travel_cta_title",
      "travel_cta_text",
      "help_title",
      "help_text",
    ],
    "Support & footer": [
      "support_message",
      "contact_email",
      "footer_credit",
      "footer_whatsapp",
    ],
    "Transport payment details": [
      "bank_name",
      "bank_account_name",
      "bank_account_number",
      "transport_terms",
    ],
    "Privacy & terms": ["privacy_text", "terms_text"],
  };
  const label = (key: string) =>
    key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(v);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {Object.entries(groups).map(([title, keys]) => (
          <section className="admin-panel" key={title}>
            <h2>{title}</h2>
            {keys.map((key) => (
              <div className="settings-field" key={key}>
                <label>
                  {label(key)}
                  {key.endsWith("_image") ? (
                    <input
                      value={v[key] || ""}
                      onChange={(e) => setV({ ...v, [key]: e.target.value })}
                      placeholder="Image URL or upload"
                    />
                  ) : key.endsWith("_text") ||
                    key.endsWith("_terms") ||
                    key === "hero_emphasis" ? (
                    <textarea
                      value={v[key] || ""}
                      onChange={(e) => setV({ ...v, [key]: e.target.value })}
                      rows={
                        key === "privacy_text" || key === "terms_text" ? 8 : 3
                      }
                    />
                  ) : (
                    <input
                      value={v[key] || ""}
                      onChange={(e) => setV({ ...v, [key]: e.target.value })}
                    />
                  )}
                </label>
                {key.endsWith("_image") && (
                  <>
                    <FileInput
                      purpose="image"
                      value={v[key] || ""}
                      onChange={(_, url) => setV({ ...v, [key]: url })}
                    />
                    <button
                      type="button"
                      className="link"
                      onClick={() => setV({ ...v, [key]: "" })}
                    >
                      Remove image
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        ))}
        <div className="sticky-save">
          <Submit busy={busy}>Save site settings</Submit>
        </div>
      </fieldset>
    </form>
  );
}
function BookingCard({
  booking: b,
  trip,
  onSave,
}: {
  booking: any;
  trip: any;
  onSave: (d: string, n: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState(b.officer_note || ""),
    [busy, setBusy] = useState(false);
  return (
    <article className="admin-panel">
      <div className="section-head">
        <div>
          <h2>{b.name}</h2>
          <p>
            {b.reference} · {trip?.title || "Trip"} ·{" "}
            {trip ? money(trip.fare) : ""}
          </p>
          <p>
            {b.email} · {b.phone}
          </p>
        </div>
        <Status value={b.status} />
      </div>
      {b.cancellation_requested && (
        <Notice>Student requested cancellation.</Notice>
      )}
      {b.receipt_id && (
        <a
          className="btn outline small"
          target="_blank"
          rel="noreferrer"
          href={`/api/files/${b.receipt_id}?preview=1`}
        >
          Open private receipt
        </a>
      )}
      <label>
        Officer note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
        />
      </label>
      <div className="row-actions">
        {(b.status === "pending"
          ? ["confirmed", "rejected", "cancelled"]
          : b.status !== "cancelled"
            ? ["cancelled"]
            : []
        ).map((decision) => (
          <button
            disabled={busy}
            className={`btn ${decision === "confirmed" ? "navy" : "outline"} small`}
            key={decision}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(decision, note);
              } finally {
                setBusy(false);
              }
            }}
          >
            {decision === "confirmed"
              ? "Verify payment & confirm seat"
              : decision === "rejected"
                ? "Reject receipt"
                : "Cancel booking"}
          </button>
        ))}
      </div>
    </article>
  );
}
function CasePanel({
  record: r,
  staff,
  onAction,
}: {
  record: any;
  staff: Staff;
  onAction: (v: any) => Promise<boolean>;
}) {
  const [messages, setMessages] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void api(`admin/case/${r.id}`)
      .then((v) => setMessages(v.messages))
      .catch((e) => setError(e.message));
  }, [r.id, r.updated_at]);
  return (
    <div>
      <Status value={r.status} />
      <h2>{r.subject}</h2>
      <p>
        {r.name} · {r.email}
      </p>
      <p>
        {r.category}
        {r.hostel && ` · ${r.hostel}`}
        {r.location && ` · ${r.location}`}
      </p>
      {error && <Notice error>{error}</Notice>}
      <div className="thread-messages">
        {messages.map((m) => (
          <article
            className={`thread-message ${m.from_student ? "student" : "officer"}`}
            key={m.id}
          >
            <div>
              <strong>{m.from_student ? r.name : "SCF"}</strong>
              <time>{new Date(m.created_at).toLocaleString()}</time>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>
      {!r.assignee && ["open", "in_progress"].includes(r.status) && (
        <button
          className="btn navy"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAction({ action: "claim" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Claim this case
        </button>
      )}
      {r.assignee === staff.id && (
        <form
          className="stack-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const form = e.currentTarget;
            try {
              const values = Object.fromEntries(new FormData(form));
              if (await onAction({ action: "reply", ...values })) form.reset();
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Your reply
            <textarea name="message" required maxLength={5000} rows={5} />
          </label>
          <label>
            Case status
            <Select name="status">
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </label>
          <Submit busy={busy}>Send reply</Submit>
        </form>
      )}
      {r.assignee && staff.role !== "staff" && (
        <button
          className="link"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAction({ action: "release" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Release assignment for another member
        </button>
      )}
    </div>
  );
}

function OlderRecords({
  area,
  kind,
  data,
  onRows,
}: {
  area: string;
  kind: Kind;
  data: any;
  onRows: (key: string, rows: any[]) => void;
}) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setDone(false), [area, kind]);
  const table = (
      {
        entries: "entries",
        reviews: "reviews",
        complaints: "cases",
        trips: "trips",
        bookings: "bookings",
        staff: "staff",
        emails: "email_outbox",
        audit: "audit_log",
      } as Record<string, string>
    )[area],
    key =
      (
        {
          staff: "members",
          email_outbox: "outbox",
          audit_log: "audit",
        } as Record<string, string>
      )[table] || table;
  if (!table || done) return null;
  const count =
    area === "entries"
      ? data.entries.filter((e: Entry) => e.kind === kind).length
      : data[key]?.length || 0;
  return (
    <div className="load-more">
      {error && <Notice error>{error}</Notice>}
      <button
        className="btn outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const v = await api(
              `admin/records?table=${table}&offset=${count}${area === "entries" ? `&kind=${kind}` : ""}`,
            );
            onRows(key, v.rows);
            if (v.rows.length < 500) setDone(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Loading…" : "Load older records"}
      </button>
    </div>
  );
}
