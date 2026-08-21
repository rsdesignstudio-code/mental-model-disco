"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/* ---------------- Labelled field ---------------- */

export function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      {children}
      {hint ? (
        <span className="block mt-1" style={{ fontSize: "var(--t-caption)", color: "var(--text-3)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />;
}

export function TextArea({
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...props} className={`field ${props.className ?? ""}`} />;
}

/* ---------------- Accordion sheet ---------------- */

export function Sheet({
  n,
  title,
  subtitle,
  defaultOpen = false,
  accent = "var(--separator-strong)",
  right,
  children,
}: {
  n?: number | string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  accent?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="card overflow-hidden">
      <h3 className="m-0">
        <button
          type="button"
          className="sheet-head"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          {n !== undefined && (
            <span
              className="mono shrink-0 grid place-items-center rounded-full"
              style={{
                width: 28,
                height: 28,
                background: accent,
                color: "var(--on-fill)",
                fontSize: "var(--t-footnote)",
                fontWeight: 700,
              }}
            >
              {n}
            </span>
          )}
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: "var(--t-headline)", fontWeight: 600 }}>
              {title}
            </span>
            {subtitle && (
              <span className="block" style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)" }}>
                {subtitle}
              </span>
            )}
          </span>
          {right}
          <ChevronDown
            size={20}
            aria-hidden
            style={{
              color: "var(--text-3)",
              transition: "transform 240ms var(--sheet-ease)",
              transform: open ? "rotate(180deg)" : "none",
              flexShrink: 0,
            }}
          />
        </button>
      </h3>
      {open && (
        <div id={id} className="sheet-body">
          {children}
        </div>
      )}
    </section>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="backdrop grid place-items-end sm:place-items-center p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal w-full flex flex-col safe-b"
        style={{ maxWidth: wide ? 900 : 640, maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 hairline shrink-0">
          <h2 className="flex-1 m-0" style={{ fontSize: "var(--t-title2)", fontWeight: 700, letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap grid place-items-center rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--text-2)", width: 36, height: 36, minWidth: 36, minHeight: 36 }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="scroll-y px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- 0–5 pill selector ---------------- */

export function PillRow({
  value,
  onChange,
  max = 5,
  tone = "brass",
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  tone?: "brass" | "rust" | "green";
  label: string;
}) {
  return (
    <div className="pill-row" data-tone={tone} role="group" aria-label={label}>
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          type="button"
          className="pill"
          aria-pressed={value === i}
          aria-label={`${label} ${i} of ${max}`}
          onClick={() => onChange(i)}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 1–5 dot rating ---------------- */

export function DotRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i ? 0 : i)}
          aria-pressed={value >= i}
          aria-label={`${label}: ${i} of 5`}
          className="tap grid place-items-center"
          style={{ width: 44, height: 44 }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "block",
              background: value >= i ? "var(--purple-fill)" : "transparent",
              border: `2px solid ${value >= i ? "var(--purple-fill)" : "var(--field-border)"}`,
              transition: "background 160ms var(--sheet-ease)",
            }}
          />
        </button>
      ))}
      <span className="mono" style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)" }}>
        {value || "–"}/5
      </span>
    </div>
  );
}

/* ---------------- Segmented control (iOS style) ---------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex p-0.5 rounded-[10px]"
      style={{ background: "var(--surface-3)" }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className="px-3 rounded-lg"
            style={{
              minHeight: 34,
              fontSize: "var(--t-footnote)",
              fontWeight: on ? 650 : 500,
              background: on ? "var(--surface)" : "transparent",
              color: on ? "var(--text)" : "var(--text-2)",
              boxShadow: on ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
              transition: "background 180ms var(--sheet-ease)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Tag list input ---------------- */

export function TagInput({
  tags,
  onChange,
  placeholder = "Add entity…",
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(tags.filter((x) => x !== t))}
              style={{ color: "var(--text-3)", lineHeight: 1 }}
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="field"
          style={{ padding: "6px 9px", fontSize: "var(--t-footnote)" }}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Add entity"
          className="grid place-items-center rounded-[10px] shrink-0"
          style={{ width: 34, height: 34, background: "var(--surface-3)", color: "var(--text-2)" }}
        >
          <Plus size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p style={{ color: "var(--text-3)", fontSize: "var(--t-subhead)", fontStyle: "italic" }}>
      {children}
    </p>
  );
}

export function ReadOnlyBlock({ text }: { text: string }) {
  if (!text.trim()) return <Empty>Not written yet.</Empty>;
  return (
    <div style={{ whiteSpace: "pre-wrap", fontSize: "var(--t-subhead)", color: "var(--text)" }}>
      {text}
    </div>
  );
}

export function StatusLine({ status }: { status: { kind: "idle" | "busy" | "ok" | "error"; msg?: string } }) {
  if (status.kind === "idle" || !status.msg) return null;
  const color =
    status.kind === "error" ? "var(--rust)" : status.kind === "ok" ? "var(--green)" : "var(--text-2)";
  return (
    <p role="status" aria-live="polite" className="mono" style={{ fontSize: "var(--t-caption)", color }}>
      {status.msg}
    </p>
  );
}
