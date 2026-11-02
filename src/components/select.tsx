"use client";
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; disabled?: boolean };
type ChangeLike = {
  target: { value: string; name: string };
  currentTarget: { value: string; name: string };
};

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((n) =>
      typeof n === "string" || typeof n === "number"
        ? String(n)
        : isValidElement(n)
          ? textOf((n.props as { children?: ReactNode }).children)
          : "",
    )
    .join("");

/** Reads <option> children, so a native <select> can be swapped for <Select> unchanged. */
function readOptions(children: ReactNode): Option[] {
  const out: Option[] = [];
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      }>;
      if (el.type === Fragment) return walk(el.props.children);
      const label = textOf(el.props.children);
      out.push({
        value: el.props.value !== undefined ? String(el.props.value) : label,
        label,
        disabled: el.props.disabled,
      });
    });
  };
  walk(children);
  return out;
}

/**
 * A styled dropdown with the same API as a native <select>:
 *   <Select name="level" required defaultValue="" onChange={(e) => …e.target.value}>
 *     <option value="">Choose a level</option> …
 *   </Select>
 * Hover and keyboard highlighting, type-to-jump, opens upward when there is no room
 * below, renders inside an open <dialog> when there is one, and still takes part in
 * form submission and `required` validation.
 */
export function Select({
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  className = "",
  id,
  children,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: ChangeLike) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const options = useMemo(() => readOptions(children), [children]);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(
    defaultValue !== undefined
      ? String(defaultValue)
      : (options.find((o) => o.value === "")?.value ?? options[0]?.value ?? ""),
  );
  const current = controlled ? String(value) : inner;
  const selected = options.find((o) => o.value === current);
  const placeholder = selected?.value === "";
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<CSSProperties | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", timer: 0 });
  const uid = useId();
  const listId = `${uid}-list`;

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);
  const choose = useCallback(
    (opt: Option) => {
      if (opt.disabled) return;
      if (!controlled) setInner(opt.value);
      const target = { value: opt.value, name: name ?? "" };
      onChange?.({ target, currentTarget: target });
      close();
    },
    [controlled, name, onChange, close],
  );
  const openList = useCallback(() => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === current);
    setActive(i >= 0 ? i : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, options, current]);

  // Place the list under (or above) the trigger; keep it there while the page moves.
  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6,
      want = Math.min(320, options.length * 46 + 12);
    const below = window.innerHeight - r.bottom - gap - 12;
    const above = r.top - gap - 12;
    const up = below < Math.min(want, 180) && above > below;
    const max = Math.max(140, Math.min(want, up ? above : below));
    setBox({
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: r.width,
      maxHeight: max,
      ...(up
        ? { bottom: window.innerHeight - r.top + gap }
        : { top: r.bottom + gap }),
      transformOrigin: up ? "50% 100%" : "50% 0%",
    });
  }, [options.length]);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const again = () => place();
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, true);
    return () => {
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, true);
    };
  }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || list.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open, close]);
  useEffect(() => {
    if (!open || active < 0) return;
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (from: number, dir: 1 | -1) => {
    for (let n = 1; n <= options.length; n++) {
      const i = (from + dir * n + options.length * 2) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (k === "Escape") {
      e.preventDefault();
      close();
    } else if (k === "Tab") {
      close(false);
    } else if (k === "ArrowDown") {
      e.preventDefault();
      setActive((a) => move(a, 1));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      setActive((a) => move(a, -1));
    } else if (k === "Home") {
      e.preventDefault();
      setActive(move(-1, 1));
    } else if (k === "End") {
      e.preventDefault();
      setActive(move(0, -1));
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      if (active >= 0) choose(options[active]);
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      window.clearTimeout(typed.current.timer);
      typed.current.text += k.toLowerCase();
      typed.current.timer = window.setTimeout(
        () => (typed.current.text = ""),
        650,
      );
      const hit = options.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text),
      );
      if (hit >= 0) setActive(hit);
    }
  };

  const host =
    typeof document === "undefined"
      ? null
      : (trigger.current?.closest("dialog") ?? document.body);

  return (
    <span className={`select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={open && active >= 0 ? `${uid}-o${active}` : undefined}
        disabled={disabled}
        className={`select-trigger field ${className}`.trim()}
        data-placeholder={placeholder || undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{selected?.label ?? current}</span>
        <ChevronDown className="select-chevron" aria-hidden="true" />
      </button>
      {/* Takes part in form submission and "required" validation. */}
      <input
        className="select-proxy"
        name={name}
        required={required}
        value={current}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() => trigger.current?.focus()}
      />
      {open &&
        box &&
        host &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            className="select-list"
            style={box}
            aria-label={ariaLabel}
          >
            {options.map((o, i) => (
              <li
                key={`${o.value}-${i}`}
                id={`${uid}-o${i}`}
                role="option"
                data-index={i}
                aria-selected={o.value === current}
                aria-disabled={o.disabled || undefined}
                className={`select-option ${i === active ? "is-active" : ""} ${
                  o.value === current ? "is-selected" : ""
                } ${o.value === "" ? "is-empty" : ""}`}
                onMouseMove={() => !o.disabled && i !== active && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                <span>{o.label}</span>
                {o.value === current && <Check aria-hidden="true" />}
              </li>
            ))}
          </ul>,
          host,
        )}
    </span>
  );
}
