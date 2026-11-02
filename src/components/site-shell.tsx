"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { HubData } from "@/lib/server";

export type NavItem = readonly [url: string, label: string];

/* The five detail-page prefixes map back to their section so the right
   top-level link stays highlighted (e.g. /place/the-coffee-corner → Eat, Drink & Shop). */
const sectionOf: Record<string, string> = {
  place: "places",
  group: "groups",
  sport: "sports",
  story: "news",
  trip: "travel",
};
export function isActiveLink(route: string, url: string) {
  const section = sectionOf[route.split("/")[0]];
  return (
    `/${route}` === url ||
    (!!section && `/${section}` === url) ||
    (url === "/archive" &&
      ["courses", "reviews", "issues"].includes(route.split("/")[0]))
  );
}

/** True once the page has been scrolled past `on` px; goes false again below `off`
    (the gap stops the pill flickering around a single threshold). */
export function useScrolled(on = 140, off = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled((was) => (was ? y > off : y > on));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [on, off]);
  return scrolled;
}

/** "idle" → "loading" when an internal link is clicked → "done" when the new page arrives. */
export function useRouteProgress(route: string, data: unknown) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef(0);
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 650);
    return () => window.clearTimeout(timer.current);
  }, [route, data]);
  useEffect(() => {
    // Capture phase: runs before Next's own handler calls preventDefault().
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download"))
        return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      setState("loading");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 12000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return state;
}

export function RouteProgress({ state }: { state: "idle" | "loading" | "done" }) {
  return <div className="route-progress" data-state={state} aria-hidden="true" />;
}

function Wordmark({ name }: { name: string }) {
  return (
    <Link className="wordmark" href="/" aria-label={`${name} home`}>
      <strong>SCF</strong>
      <b>
        STUDENTS’
        <br />
        HUB
      </b>
    </Link>
  );
}

export function MenuButton({
  open,
  onClick,
  className = "",
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`menu-btn ${open ? "is-open" : ""} ${className}`.trim()}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="menu-sheet"
      onClick={onClick}
    >
      <span className="menu-bars" aria-hidden="true">
        <i />
        <i />
      </span>
    </button>
  );
}

/** Desktop links inside the floating pill, with a glider that follows hover / focus
    and rests on the current page. */
function PillLinks({ items, route }: { items: NavItem[]; route: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [rest, setRest] = useState<{ x: number; w: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; w: number } | null>(null);
  const measure = useCallback(() => {
    const a = root.current?.querySelector<HTMLElement>("a.active");
    setRest(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
  }, []);
  useEffect(() => {
    measure();
    const again = () => measure();
    window.addEventListener("resize", again);
    void document.fonts?.ready.then(again);
    return () => window.removeEventListener("resize", again);
  }, [measure, route, items]);
  const at = (el: HTMLElement) => setHover({ x: el.offsetLeft, w: el.offsetWidth });
  const g = hover || rest;
  const style: CSSProperties | undefined = g
    ? { transform: `translateX(${g.x}px)`, width: g.w, opacity: 1 }
    : undefined;
  return (
    <div
      className="pill-links"
      ref={root}
      onMouseLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
    >
      <span className="pill-glider" aria-hidden="true" style={style} />
      {items.map(([url, label]) => (
        <Link
          key={url}
          href={url}
          className={isActiveLink(route, url) ? "active" : ""}
          aria-current={isActiveLink(route, url) ? "page" : undefined}
          onMouseEnter={(e) => at(e.currentTarget)}
          onFocus={(e) => at(e.currentTarget)}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader({
  data,
  items,
  route,
  scrolled,
  menuOpen,
  onMenu,
  onSearch,
}: {
  data: HubData;
  items: NavItem[];
  route: string;
  scrolled: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onSearch: () => void;
}) {
  const name = data.settings.site_name;
  return (
    <>
      <header className="site-header" inert={scrolled || undefined}>
        <div className="utility">
          <div className="wrap">
            <span>{data.settings.strapline}</span>
            <Link href="/issues">Have an academic issue?</Link>
          </div>
        </div>
        <div className="wrap masthead">
          <Wordmark name={name} />
          <Link className="mast-note school-links-nav" href="/school-links">
            Official school links
          </Link>
          <button type="button" className="search-toggle" onClick={onSearch}>
            <Search aria-hidden="true" />
            <span>Search the hub</span>
            <span className="sr-only">(opens search)</span>
          </button>
          <MenuButton open={menuOpen} onClick={onMenu} />
        </div>
        <nav className="main-nav" aria-label="Primary">
          <div className="wrap nav-inner">
            {items.map(([url, label]) => (
              <Link
                key={url}
                href={url}
                className={isActiveLink(route, url) ? "active" : ""}
                aria-current={isActiveLink(route, url) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div
        className={`nav-pill ${scrolled ? "is-visible" : ""}`}
        inert={!scrolled || undefined}
      >
        <div className="nav-pill-bar">
          <Link className="pill-brand" href="/" aria-label={`${name} home`}>
            <strong>SCF</strong>
          </Link>
          <nav className="pill-nav" aria-label="Primary (compact)">
            <PillLinks items={items} route={route} />
          </nav>
          <div className="pill-actions">
            <button
              type="button"
              className="pill-search"
              onClick={onSearch}
              aria-label="Search the hub"
            >
              <Search aria-hidden="true" />
            </button>
            <MenuButton open={menuOpen} onClick={onMenu} className="on-dark" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Near-full-screen menu: blurred backdrop, staggered links, focus trap, Esc to close. */
export function MenuSheet({
  open,
  onClose,
  items,
  route,
  data,
  onSearch,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  route: string;
  data: HubData;
  onSearch: () => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    root.style.setProperty(
      "--sbw",
      `${Math.max(0, window.innerWidth - root.clientWidth)}px`,
    );
    root.classList.add("menu-open");
    const focusTimer = window.setTimeout(() => closeBtn.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !layer.current) return;
      const focusable = [
        ...layer.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1001px)");
    const onWide = () => wide.matches && onClose();
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      root.classList.remove("menu-open");
      root.style.removeProperty("--sbw");
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  const s = data.settings;
  return (
    <div
      ref={layer}
      className={`menu-layer ${open ? "is-open" : ""}`}
      inert={!open || undefined}
      aria-hidden={!open}
    >
      <div className="menu-backdrop" onClick={onClose} />
      <div
        id="menu-sheet"
        className="menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <span className="menu-blob" aria-hidden="true" />
        <div className="menu-head">
          <Wordmark name={s.site_name} />
          <button
            ref={closeBtn}
            type="button"
            className="menu-btn is-open"
            aria-label="Close menu"
            onClick={onClose}
          >
            <span className="menu-bars" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
        <div className="menu-body">
          <nav className="menu-links" aria-label="Site">
            {items.map(([url, label], i) => (
              <Link
                key={url}
                href={url}
                className={isActiveLink(route, url) ? "active" : ""}
                aria-current={isActiveLink(route, url) ? "page" : undefined}
                style={{ "--i": i } as CSSProperties}
                onClick={onClose}
              >
                <span className="menu-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="menu-label">{label}</span>
                <ArrowUpRight className="menu-arrow" aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <aside
            className="menu-aside"
            style={
              s.hero_image
                ? ({ "--aside-img": `url("${s.hero_image}")` } as CSSProperties)
                : undefined
            }
          >
            <p className="menu-aside-eyebrow">{s.strapline}</p>
            <h2>{s.help_title}</h2>
            <p>{s.support_message}</p>
            <div className="menu-aside-actions">
              <Link className="btn gold" href="/ask-scf" onClick={onClose}>
                Ask SCF
              </Link>
              <Link className="btn ghost" href="/school-links" onClick={onClose}>
                Official school links
              </Link>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  onClose();
                  onSearch();
                }}
              >
                <Search size={16} aria-hidden="true" /> Search
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const helpLinks: NavItem[] = [
  ["/explore", "Explore the hub"],
  ["/ask-scf", "Ask SCF"],
  ["/hostel-complaints", "Hostel complaints & rules"],
  ["/school-links", "Official school links"],
];
const studyLinks: NavItem[] = [
  ["/archive", "Academics"],
  ["/freshers", "Freshers’ guide"],
  ["/news", "News & Events"],
];
const campusLinks: NavItem[] = [
  ["/places", "Eat, Drink & Shop"],
  ["/groups", "Groups"],
  ["/sports", "Sport & Fitness"],
  ["/travel", "Travel home"],
];

export function SiteFooter({ data }: { data: HubData }) {
  const s = data.settings;
  const extra = data.entries.filter(
    (e) => e.kind === "link" && e.data.placement === "footer",
  );
  const column = (title: string, links: NavItem[], more?: ReactNode) => (
    <section className="sf-col" aria-labelledby={`sf-${title.replace(/\W+/g, "-")}`}>
      <h2 id={`sf-${title.replace(/\W+/g, "-")}`}>{title}</h2>
      <ul>
        {links.map(([url, label]) => (
          <li key={url}>
            <Link href={url}>{label}</Link>
          </li>
        ))}
        {more}
      </ul>
    </section>
  );
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="sf-top">
          <Wordmark name={s.site_name} />
          <p className="sf-signoff">
            Made for
            <br />
            you.
          </p>
          <Link className="sf-help" href="/ask-scf">
            We’re here to help
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
        <div className="sf-cols">
          {column("We’re here to help", helpLinks)}
          {column("Study & settle in", studyLinks)}
          {column("Around campus", campusLinks)}
          {column(
            "Good to know",
            [
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
            ],
            <>
              {extra.map((e) => (
                <li key={e.id}>
                  <a href={e.data.url}>{e.title}</a>
                </li>
              ))}
              <li>
                <Link href="/admin">SCF staff login</Link>
              </li>
            </>,
          )}
        </div>
        <div className="sf-bottom">
          <span>Student Consultative Forum · Maduka University</span>
          <a
            className="koad-credit"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${s.footer_whatsapp.replace(/\D/g, "")}`}
          >
            {s.footer_credit}
          </a>
        </div>
      </div>
    </footer>
  );
}
