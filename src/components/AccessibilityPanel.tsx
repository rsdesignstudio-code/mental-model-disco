"use client";

import { Accessibility, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { A11ySettings } from "@/lib/types";

export const DEFAULT_A11Y: A11ySettings = {
  textScale: 1,
  highContrast: false,
  dyslexicFont: false,
  reduceMotion: false,
};

const KEY = (uid: string) => `mmdisco:a11y:${uid}`;
const MIN = 1;      // never below 100% — smaller inputs trigger iOS zoom-on-focus
const MAX = 1.45;
const STEP = 0.075;

export function loadA11y(uid: string): A11ySettings {
  if (typeof window === "undefined") return DEFAULT_A11Y;
  try {
    const raw = window.localStorage.getItem(KEY(uid));
    if (!raw) return DEFAULT_A11Y;
    const p = JSON.parse(raw) as Partial<A11ySettings>;
    return {
      ...DEFAULT_A11Y,
      ...p,
      textScale: Math.min(MAX, Math.max(MIN, Number(p.textScale) || 1)),
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

/** Writes the settings onto <html> so the CSS token layer can react to them. */
export function applyA11y(s: A11ySettings) {
  const el = document.documentElement;
  el.style.setProperty("--text-scale", String(s.textScale));
  el.dataset.contrast = s.highContrast ? "high" : "normal";
  el.dataset.font = s.dyslexicFont ? "dyslexic" : "system";
  el.dataset.motion = s.reduceMotion ? "reduced" : "full";
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap w-full flex items-center gap-3 px-3 py-2 text-left rounded-[10px]"
      style={{ background: "transparent", color: "var(--text)" }}
    >
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: "var(--t-subhead)", fontWeight: 500 }}>
          {label}
        </span>
        {hint && (
          <span className="block" style={{ fontSize: "var(--t-caption)", color: "var(--text-3)" }}>
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="shrink-0"
        style={{
          width: 50,
          height: 30,
          borderRadius: 999,
          padding: 2,
          background: checked ? "var(--green-fill)" : "var(--surface-3)",
          transition: "background 200ms var(--sheet-ease)",
          display: "block",
        }}
      >
        <span
          style={{
            display: "block",
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transform: checked ? "translateX(20px)" : "none",
            transition: "transform 200ms var(--sheet-ease)",
          }}
        />
      </span>
    </button>
  );
}

export default function AccessibilityPanel({
  settings,
  onChange,
}: {
  settings: A11ySettings;
  onChange: (s: A11ySettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const set = (patch: Partial<A11ySettings>) => onChange({ ...settings, ...patch });
  const scalePct = Math.round(settings.textScale * 100);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className="tap w-full flex items-center gap-2.5 px-3 rounded-[10px]"
        style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", background: "transparent" }}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Accessibility size={17} aria-hidden />
        <span className="flex-1 text-left">Accessibility</span>
        <span className="mono" style={{ fontSize: "var(--t-caption)", color: "var(--text-3)" }}>
          {scalePct}%
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 card p-2"
          style={{ bottom: "calc(100% + 8px)", left: 0, right: 0, minWidth: 268, boxShadow: "0 14px 40px rgba(0,0,0,0.22)" }}
        >
          <div className="px-3 pt-2 pb-1">
            <span className="eyebrow">Text size</span>
          </div>
          <div className="flex items-center gap-2 px-3 pb-2">
            <button
              type="button"
              className="tap grid place-items-center rounded-[10px] flex-1"
              style={{ background: "var(--surface-2)", border: "1px solid var(--separator)", color: "var(--text)" }}
              aria-label="Decrease text size"
              disabled={settings.textScale <= MIN + 0.001}
              onClick={() => set({ textScale: Math.max(MIN, +(settings.textScale - STEP).toFixed(3)) })}
            >
              <Minus size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="tap grid place-items-center rounded-[10px] flex-1"
              style={{ background: "var(--surface-2)", border: "1px solid var(--separator)", color: "var(--text)" }}
              aria-label="Reset text size to 100%"
              onClick={() => set({ textScale: 1 })}
            >
              <RotateCcw size={15} aria-hidden />
            </button>
            <button
              type="button"
              className="tap grid place-items-center rounded-[10px] flex-1"
              style={{ background: "var(--surface-2)", border: "1px solid var(--separator)", color: "var(--text)" }}
              aria-label="Increase text size"
              disabled={settings.textScale >= MAX - 0.001}
              onClick={() => set({ textScale: Math.min(MAX, +(settings.textScale + STEP).toFixed(3)) })}
            >
              <Plus size={16} aria-hidden />
            </button>
          </div>

          <div className="hairline mx-3 mb-1" />

          <Toggle
            label="High contrast"
            checked={settings.highContrast}
            onChange={(v) => set({ highContrast: v })}
          />
          <Toggle
            label="Dyslexia-friendly font"
            hint="Atkinson Hyperlegible"
            checked={settings.dyslexicFont}
            onChange={(v) => set({ dyslexicFont: v })}
          />
          <Toggle
            label="Reduce motion"
            checked={settings.reduceMotion}
            onChange={(v) => set({ reduceMotion: v })}
          />
        </div>
      )}
    </div>
  );
}

export function persistA11y(uid: string, s: A11ySettings) {
  try {
    window.localStorage.setItem(KEY(uid), JSON.stringify(s));
  } catch {
    /* storage unavailable — settings simply do not persist */
  }
}
