"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* =====================================================================
   Shared plumbing
   ===================================================================== */

/** Charts render at real pixel width so stroke weights stay honest —
 *  no preserveAspectRatio stretching. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 10_000 ? `${Math.round(n / 1000)}K`
  : n >= 1_000 ? `${(n / 1000).toFixed(1)}K`
  : String(n);

/**
 * Clean axis ticks — 0 / 5 / 10, never 0 / 3.7 / 7.4.
 * When the data is whole numbers (counts of logins, of people, of case
 * studies) the ticks are forced to whole numbers too: "2.5 logins" is not a
 * quantity that exists, and a fractional tick on a count invites the reader
 * to believe the scale is continuous when it is not.
 */
function niceTicks(max: number, integral = false): number[] {
  if (max <= 0) return [0, 1];
  const count = integral ? 5 : 4;
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = integral ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = candidates.map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  if (integral) step = Math.max(1, Math.round(step));

  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

const allIntegers = (xs: number[]) => xs.every((v) => Number.isInteger(v));

/** Square at the baseline, 4px rounded at the data end. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.max(0, Math.min(r, w));
  if (w <= 0.5) return "";
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

function Tooltip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const flip = x > w * 0.6;
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        left: flip ? undefined : x + 12,
        right: flip ? w - x + 12 : undefined,
        top: Math.max(4, y - 8),
        pointerEvents: "none",
        background: "var(--surface)",
        border: "1px solid var(--separator-strong)",
        borderRadius: "var(--r-md)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        padding: "8px 10px",
        fontSize: "var(--t-caption)",
        color: "var(--text)",
        whiteSpace: "nowrap",
        zIndex: 5,
      }}
    >
      {children}
    </div>
  );
}

export function Swatch({ color, kind = "line" }: { color: string; kind?: "line" | "dot" }) {
  return kind === "line" ? (
    <span
      aria-hidden
      style={{ display: "inline-block", width: 14, height: 2, borderRadius: 1, background: color }}
    />
  ) : (
    <span
      aria-hidden
      style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color }}
    />
  );
}

/** Identity never rests on colour alone — the legend is always present for ≥2 series. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <Swatch color={i.color} />
          <span style={{ fontSize: "var(--t-caption)", color: "var(--text-2)" }}>{i.label}</span>
        </span>
      ))}
    </div>
  );
}

/* =====================================================================
   Multi-series line chart — trend over time
   ===================================================================== */

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 220,
  yLabel,
}: {
  labels: string[]; // one per x position, already formatted
  series: LineSeries[];
  height?: number;
  yLabel?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 40;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const allValues = series.flatMap((s) => s.values);
  const maxV = Math.max(1, ...allValues);
  const ticks = niceTicks(maxV, allIntegers(allValues));
  const top = ticks[ticks.length - 1];

  const n = labels.length;
  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / top) * innerH;

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!innerW || n === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rel = e.clientX - rect.left - padL;
      const i = Math.round((rel / innerW) * (n - 1));
      setHover(Math.max(0, Math.min(n - 1, i)));
    },
    [innerW, n]
  );

  // Tick every ~7th label so the axis never crowds.
  const stride = Math.max(1, Math.ceil(n / 7));

  return (
    <div
      ref={ref}
      className="relative"
      style={{ width: "100%", height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={yLabel ?? "Trend over time"}>
          {/* gridlines — hairline, solid, recessive */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL} x2={w - padR} y1={yAt(t)} y2={yAt(t)}
                stroke="var(--chart-grid)" strokeWidth={1} shapeRendering="crispEdges"
              />
              <text
                x={padL - 8} y={yAt(t) + 4} textAnchor="end"
                fill="var(--chart-axis)"
                style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
              >
                {compact(t)}
              </text>
            </g>
          ))}

          {/* x labels */}
          {labels.map((l, i) =>
            i % stride === 0 || i === n - 1 ? (
              <text
                key={i} x={xAt(i)} y={height - 8} textAnchor="middle"
                fill="var(--chart-axis)" style={{ fontSize: 10 }}
              >
                {l}
              </text>
            ) : null
          )}

          {/* crosshair */}
          {hover !== null && (
            <line
              x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + innerH}
              stroke="var(--separator-strong)" strokeWidth={1} shapeRendering="crispEdges"
            />
          )}

          {/* series */}
          {series.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            />
          ))}

          {/* hovered markers — 2px surface ring keeps them legible on crossings */}
          {hover !== null &&
            series.map((s) => (
              <circle
                key={s.key}
                cx={xAt(hover)}
                cy={yAt(s.values[hover] ?? 0)}
                r={5}
                fill={s.color}
                stroke="var(--chart-surface)"
                strokeWidth={2}
              />
            ))}
        </svg>
      )}

      {hover !== null && (
        <Tooltip x={xAt(hover)} y={padT} w={w}>
          <div style={{ color: "var(--text-2)", marginBottom: 4 }}>{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5" style={{ marginTop: 2 }}>
              <Swatch color={s.color} kind="dot" />
              <span style={{ color: "var(--text-2)" }}>{s.label}</span>
              <strong style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums" }}>
                {s.values[hover] ?? 0}
              </strong>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* =====================================================================
   Horizontal bar chart — magnitude across named items
   Nominal categories, so every bar wears the same slot-1 hue: bar length
   already encodes the value, and colouring by value would spend the
   identity channel re-encoding it.
   ===================================================================== */

export interface BarDatum {
  label: string;
  value: number;
  sub?: string;
}

export function BarChart({
  data,
  color = "var(--chart-1)",
  unit = "",
  labelWidth = 128,
  emphasise,
}: {
  data: BarDatum[];
  color?: string;
  unit?: string;
  labelWidth?: number;
  /** index to keep in the accent hue while the rest go recessive */
  emphasise?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const rowH = 30;
  const barH = 18;
  const valueW = 46;
  const innerW = Math.max(0, w - labelWidth - valueW);
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = data.length * rowH;

  if (!data.length) {
    return (
      <p style={{ color: "var(--text-3)", fontSize: "var(--t-subhead)", fontStyle: "italic" }}>
        Nothing to show yet.
      </p>
    );
  }

  return (
    <div ref={ref} className="relative" style={{ width: "100%", height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Comparison by item">
          {data.map((d, i) => {
            const y = i * rowH;
            const bw = (d.value / max) * innerW;
            const dim = emphasise !== undefined && emphasise !== i;
            return (
              <g
                key={d.label + i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* generous hit target, larger than the mark */}
                <rect x={0} y={y} width={w} height={rowH} fill="transparent" />
                <text
                  x={0} y={y + rowH / 2 + 4}
                  fill={hover === i ? "var(--text)" : "var(--text-2)"}
                  style={{ fontSize: 11 }}
                >
                  {d.label.length > 20 ? d.label.slice(0, 19) + "…" : d.label}
                </text>
                <path
                  d={barPath(labelWidth, y + (rowH - barH) / 2, Math.max(bw, d.value > 0 ? 3 : 0), barH)}
                  fill={dim ? "var(--surface-3)" : color}
                  opacity={hover === null || hover === i ? 1 : 0.72}
                />
                <text
                  x={labelWidth + Math.max(bw, 3) + 8}
                  y={y + rowH / 2 + 4}
                  fill="var(--text-2)"
                  style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                >
                  {d.value}
                  {unit}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {hover !== null && data[hover].sub && (
        <Tooltip x={labelWidth} y={hover * rowH} w={w}>
          <div style={{ fontWeight: 600 }}>{data[hover].label}</div>
          <div style={{ color: "var(--text-2)", marginTop: 2 }}>{data[hover].sub}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* =====================================================================
   Figures
   ===================================================================== */

export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="card p-3.5">
      <p className="eyebrow" style={{ marginBottom: 6 }}>{label}</p>
      <p
        style={{
          fontSize: 28,
          fontWeight: 650,
          letterSpacing: "-0.02em",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {typeof value === "number" ? compact(value) : value}
      </p>
      {note && (
        <p style={{ fontSize: "var(--t-caption)", color: "var(--text-3)", margin: "4px 0 0" }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function ChartCard({
  title,
  blurb,
  right,
  children,
}: {
  title: string;
  blurb?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 style={{ fontSize: "var(--t-headline)", fontWeight: 650, margin: 0 }}>{title}</h2>
          {blurb && (
            <p style={{ fontSize: "var(--t-caption)", color: "var(--text-2)", margin: "2px 0 0" }}>
              {blurb}
            </p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
