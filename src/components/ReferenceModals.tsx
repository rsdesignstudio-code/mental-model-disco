"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ABOUT, ATTRIBUTION_LINES, FIVE_FOCI, PRINCIPLES, PRINCIPLES_CLOSING } from "@/lib/content";
import { Modal } from "./ui";

/** Click-to-expand row: title visible up front, full text only on expand. */
function AccordionRow({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hairline">
      <button
        type="button"
        className="sheet-head"
        style={{ paddingLeft: 0, paddingRight: 0 }}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {eyebrow && (
          <span
            className="mono shrink-0 grid place-items-center rounded-full"
            style={{
              width: 26,
              height: 26,
              border: "1px solid var(--separator-strong)",
              color: "var(--text-2)",
              fontSize: "var(--t-caption)",
            }}
          >
            {eyebrow}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: "var(--t-callout)", fontWeight: 600 }}>
            {title}
          </span>
          {subtitle && (
            <span className="block" style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)" }}>
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          style={{
            color: "var(--text-3)",
            flexShrink: 0,
            transition: "transform 240ms var(--sheet-ease)",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>
      {open && <div className="pb-4" style={{ fontSize: "var(--t-subhead)" }}>{children}</div>}
    </div>
  );
}

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="About Mental Model × DISCO">
      <p style={{ fontSize: "var(--t-subhead)", color: "var(--text-2)", marginBottom: 12 }}>
        Two cognitive-ergonomics frameworks, one Final Cognitive Design Brief. Tap any
        section to read it.
      </p>
      {ABOUT.map((s) => (
        <AccordionRow key={s.title} title={s.title}>
          {s.body.map((p, i) => (
            <p key={i} style={{ marginBottom: 10, color: "var(--text)" }}>
              {p}
            </p>
          ))}
        </AccordionRow>
      ))}
    </Modal>
  );
}

export function FociModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="5 Foci of Design">
      <p style={{ fontSize: "var(--t-subhead)", color: "var(--text-2)", marginBottom: 4 }}>
        Five directives to hold simultaneously during conceptualisation.
      </p>
      <p className="eyebrow" style={{ marginBottom: 12 }}>by VS Ravishankar</p>
      {FIVE_FOCI.map((f) => (
        <AccordionRow key={f.n} eyebrow={String(f.n)} title={f.title} subtitle={f.subtitle}>
          <blockquote
            className="band"
            style={{
              margin: "0 0 12px",
              paddingLeft: 14,
              borderLeftColor: "var(--purple)",
              color: "var(--purple)",
              fontSize: "var(--t-callout)",
              fontStyle: "italic",
            }}
          >
            {f.question}
          </blockquote>
          <p style={{ color: "var(--text)" }}>{f.body}</p>
        </AccordionRow>
      ))}
    </Modal>
  );
}

export function PrinciplesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="14 Universal Principles of Design">
      <p style={{ fontSize: "var(--t-subhead)", color: "var(--text-2)", marginBottom: 4 }}>
        Short working definitions, and why each one matters at the bench.
      </p>
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        after Lidwell, Holden &amp; Butler — compiled by VS Ravishankar for academic input
      </p>
      {PRINCIPLES.map((p, i) => (
        <AccordionRow key={p.name} eyebrow={String(i + 1)} title={p.name} subtitle={p.definition}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Why it matters</p>
          <p style={{ color: "var(--text)" }}>{p.why}</p>
        </AccordionRow>
      ))}
      <p
        style={{
          marginTop: 16,
          fontSize: "var(--t-footnote)",
          color: "var(--text-2)",
          background: "var(--surface-2)",
          borderRadius: "var(--r-md)",
          padding: 12,
        }}
      >
        {PRINCIPLES_CLOSING}
      </p>
    </Modal>
  );
}

export function AttributionFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      style={{
        fontSize: "var(--t-caption)",
        color: "var(--text-3)",
        lineHeight: 1.5,
        padding: compact ? "12px 0 0" : "18px 0 0",
        borderTop: "1px solid var(--separator)",
      }}
    >
      {ATTRIBUTION_LINES.map((l, i) => (
        <p key={i} style={{ margin: "0 0 6px", fontStyle: "italic" }}>
          {l}
        </p>
      ))}
    </footer>
  );
}
