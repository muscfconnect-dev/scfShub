"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Script from "next/script";
import {
  X,
  UploadCloud,
  LoaderCircle,
  CircleAlert,
  CircleCheck,
} from "lucide-react";
export async function api(path: string, data?: unknown) {
  const r = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error || "Unable to complete the request.");
  return v;
}
/* Elements still waiting to be revealed. A single shared scroll listener snaps
   anything the reader has already scrolled past (jump links, fast flicks, full-page
   screenshots) to its final state, so nothing is ever left blank above the viewport. */
const waiting = new Set<HTMLElement>();
let sweeping = false;
function sweep() {
  sweeping = false;
  for (const el of waiting) {
    if (el.getBoundingClientRect().bottom < 0) {
      el.classList.add("rv-in", "rv-skip");
      waiting.delete(el);
    }
  }
}
function onScrollSweep() {
  if (!sweeping && waiting.size) {
    sweeping = true;
    requestAnimationFrame(sweep);
  }
}
function track(el: HTMLElement) {
  if (!waiting.size) window.addEventListener("scroll", onScrollSweep, { passive: true });
  waiting.add(el);
}
function untrack(el: HTMLElement) {
  waiting.delete(el);
  if (!waiting.size) window.removeEventListener("scroll", onScrollSweep);
}

/** Fades and lifts content in as it scrolls into view. Content that is already on
    screen is left alone (no flash), items in the same row stagger left → right, and
    reduced-motion users get everything immediately. Without JS nothing is hidden. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Never hide content from reduced-motion users or automated capture / crawling tools.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      navigator.webdriver
    )
      return;
    const box = el.getBoundingClientRect();
    if (box.bottom <= 0 || box.top < window.innerHeight * 0.96) return;
    el.classList.add("rv");
    track(el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const column = Math.min(
            3,
            Math.round((target.getBoundingClientRect().left / window.innerWidth) * 4),
          );
          target.style.setProperty("--rv-delay", `${delay + column * 0.07}s`);
          target.classList.add("rv-in");
          untrack(target);
          io.unobserve(target);
        }
      },
      { rootMargin: "0px 0px 18% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      untrack(el);
      el.classList.remove("rv", "rv-in", "rv-skip");
    };
  }, [delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
type GlideRect = { x: number; y: number; w: number; h: number };
/* Remembered per tab group, so when the page (and the tab bar with it) remounts the
   highlight starts where it was and glides to the new tab instead of popping. */
const glideMemory = new Map<string, GlideRect>();
const measureGlide = (el: HTMLElement): GlideRect => ({
  x: el.offsetLeft,
  y: el.offsetTop,
  w: el.offsetWidth,
  h: el.offsetHeight,
});

/** A sliding highlight for pill tab bars. Put `ref` on the bar (it must be
    position: relative), render `glider` inside it, and add `motion-tabs-ready` to the
    bar when `ready`. Call `slideTo(el)` on click to move it before navigation lands. */
export function useTabGlider<T extends HTMLElement>(
  group: string,
  selector: string,
  dep: unknown,
  remember = true,
) {
  const ref = useRef<T>(null);
  const [rect, setRect] = useState<GlideRect | null>(
    () => (remember ? glideMemory.get(group) : null) ?? null,
  );
  const placed = useRef(rect !== null);
  useLayoutEffect(() => {
    const sync = (animate: boolean) => {
      const el = ref.current?.querySelector<HTMLElement>(selector);
      if (!el) return;
      const next = measureGlide(el);
      if (remember) glideMemory.set(group, next);
      if (!placed.current) {
        placed.current = true;
        setRect(next);
      } else if (animate) {
        requestAnimationFrame(() => setRect(next));
      } else {
        setRect(next);
      }
    };
    sync(true);
    const again = () => sync(false);
    window.addEventListener("resize", again);
    void document.fonts?.ready.then(again);
    return () => window.removeEventListener("resize", again);
  }, [group, selector, dep, remember]);
  const slideTo = (el: HTMLElement) => {
    const next = measureGlide(el);
    if (remember) glideMemory.set(group, next);
    placed.current = true;
    setRect(next);
  };
  const glider = rect ? (
    <span
      className="tab-glider"
      aria-hidden="true"
      style={{
        width: rect.w,
        height: rect.h,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      }}
    />
  ) : null;
  return { ref, ready: rect !== null, glider, slideTo };
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="hub-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={error ? "form-notice error" : "form-notice"}
    >
      {error ? (
        <CircleAlert className="notice-glyph" size={18} aria-hidden="true" />
      ) : (
        <CircleCheck className="notice-glyph" size={18} aria-hidden="true" />
      )}
      <span>{children}</span>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet.",
  text = "SCF will add verified information here soon.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button className="btn navy" disabled={busy} type="submit">
      {busy && <LoaderCircle className="spin" size={18} />}{" "}
      {busy ? "Please wait…" : children}
    </button>
  );
}
export async function upload(
  file: File,
  purpose: string,
  reference?: string,
  onProgress?: (n: number) => void,
) {
  const signed = await api("uploads/sign", {
    filename: file.name,
    mime:
      file.type ||
      (
        {
          pdf: "application/pdf",
          zip: "application/zip",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        } as Record<string, string>
      )[file.name.split(".").pop() || ""] ||
      "application/octet-stream",
    size: file.size,
    purpose,
    reference,
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type ||
        (
          {
            pdf: "application/pdf",
            zip: "application/zip",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          } as Record<string, string>
        )[file.name.split(".").pop() || ""] ||
        "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error("Upload failed. Check the file storage CORS settings."),
          );
    xhr.onerror = () =>
      reject(new Error("Upload interrupted. Check your connection and retry."));
    xhr.timeout = 180000;
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
    xhr.send(file);
  });
  return api("uploads/complete", { id: signed.id, reference });
}
export function FileInput({
  purpose,
  value,
  onChange,
  reference,
}: {
  purpose: string;
  value: string;
  onChange: (id: string, url: string) => void;
  reference?: string;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  return (
    <div className="file-control">
      {value && (
        <a
          href={value.startsWith("/") ? value : `/api/files/${value}`}
          target="_blank"
          rel="noreferrer"
        >
          View current file
        </a>
      )}
      <label className="upload-label">
        <UploadCloud size={18} />
        {busy ? `Uploading ${progress}%` : "Choose a file"}
        <input
          type="file"
          disabled={busy}
          accept={
            purpose === "image"
              ? ".jpg,.jpeg,.png,.webp"
              : purpose === "receipt"
                ? ".jpg,.jpeg,.png,.webp,.pdf"
                : purpose === "rule"
                  ? ".pdf"
                  : ".pdf,.docx,.pptx,.zip"
          }
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError("");
            setBusy(true);
            try {
              const result = await upload(f, purpose, reference, setProgress);
              onChange(result.id, result.url);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {busy && <progress value={progress} max={100} />}
      {error && <Notice error>{error}</Notice>}
      <small>
        {purpose === "receipt"
          ? "PDF or image, up to 5 MB."
          : purpose === "image"
            ? "JPEG, PNG or WebP, up to 10 MB."
            : "Documents up to 25 MB."}
      </small>
    </div>
  );
}
export function Honeypot() {
  return (
    <label className="honeypot" aria-hidden="true">
      Website
      <input name="website" tabIndex={-1} autoComplete="off" />
    </label>
  );
}
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: any) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const callback = useRef(onToken);
  callback.current = onToken;
  useEffect(() => {
    if (!key || !ready || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: key,
      callback: (t: string) => callback.current(t),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => window.turnstile?.remove(id);
  }, [ready, key]);
  return key ? (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={ref} />
    </>
  ) : null;
}

export function useCatalog(initial: any[], query: string) {
  const [records, setRecords] = useState<any[]>(initial),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const v = await api(`catalog?${query}&offset=${records.length}`);
      setRecords((r) => [
        ...new Map([...r, ...v.rows].map((v) => [v.id, v])).values(),
      ]);
      setDone(v.rows.length < 500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { records, busy, done, error, load };
}
export function More({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  return (
    <div className="load-more">
      {catalog.error && <Notice error>{catalog.error}</Notice>}
      {!catalog.done && (
        <button
          className="btn outline"
          disabled={catalog.busy}
          onClick={catalog.load}
        >
          {catalog.busy ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
