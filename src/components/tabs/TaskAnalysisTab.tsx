"use client";

import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { newStage } from "@/lib/defaults";
import { DIMENSIONS, LEVELS, type CaseStudy, type Disco, type Level, type Stage } from "@/lib/types";
import { Labeled, PillRow, StatusLine, TagInput, TextArea } from "../ui";

type Status = { kind: "idle" | "busy" | "ok" | "error"; msg?: string };

const COLS = [
  { key: "flow", label: "1 · Task-Interaction Flow", w: 240 },
  { key: "entities", label: "2 · Entities of Interaction", w: 190 },
  // Wide enough that the 0–5 pills sit on a single line rather than wrapping
  // into a 2×3 grid, which reads as a matrix instead of a scale.
  { key: "stress", label: "3 · Stress", w: 232 },
  { key: "error", label: "4 · Error", w: 232 },
  { key: "ease", label: "5 · Ease & Comfort", w: 232 },
  { key: "dims", label: "6 · Cognition Dimensions", w: 300 },
  { key: "closure", label: "7 · Closure & Task Completion", w: 190 },
  { key: "just", label: "Design-Brief Justification", w: 240 },
] as const;

export default function TaskAnalysisTab({
  c,
  setDisco,
}: {
  c: CaseStudy;
  setDisco: (d: Disco) => void;
}) {
  const d = c.disco;
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const patchStage = (id: string, patch: Partial<Stage>) =>
    setDisco({ ...d, stages: d.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  async function generateSummary() {
    setStatus({ kind: "busy", msg: "Reading the stage table…" });
    try {
      const res = await fetch("/api/generate-consideration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: c.title, archetype: c.archetype, stages: d.stages }),
      });
      const json = await res.json();
      if (!res.ok || !json.summary) throw new Error(json.error ?? "no text returned");
      setDisco({ ...d, summary: json.summary, suggestedDims: json.dimensions ?? [] });
      setStatus({ kind: "ok", msg: "Draft generated — edit it below." });
    } catch {
      setStatus({
        kind: "error",
        msg: "Generation failed — check your connection, or write your own.",
      });
    }
  }

  return (
    <div className="grid gap-5">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
          <div>
            <h2 style={{ fontSize: "var(--t-title3)", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              7-Step DISCO stage table
            </h2>
            <p style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)", margin: "2px 0 0" }}>
              One row per task-flow stage. Scroll sideways to reach all seven steps.
            </p>
          </div>
          <span className="tag mono">
            {d.stages.length} stage{d.stages.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="disco-wrap">
          <table className="disco">
            <thead>
              <tr>
                <th className="stick" scope="col">
                  #
                </th>
                {COLS.map((col) => (
                  <th key={col.key} scope="col" style={{ minWidth: col.w }}>
                    {col.label}
                  </th>
                ))}
                <th scope="col" style={{ minWidth: 54 }}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {d.stages.map((s, i) => (
                <tr key={s.id}>
                  <td className="stick mono" style={{ color: "var(--text-2)", fontSize: "var(--t-footnote)" }}>
                    {i + 1}
                  </td>

                  <td>
                    <TextArea
                      rows={3}
                      value={s.flow}
                      onChange={(e) => patchStage(s.id, { flow: e.target.value })}
                      placeholder="What the user does at this stage…"
                      aria-label={`Stage ${i + 1} task-interaction flow`}
                      style={{ fontSize: "var(--t-footnote)" }}
                    />
                  </td>

                  <td>
                    <TagInput
                      tags={s.entities}
                      onChange={(entities) => patchStage(s.id, { entities })}
                      placeholder="Button, dial, label…"
                    />
                  </td>

                  <td>
                    <PillRow
                      label={`Stage ${i + 1} stress touchpoints`}
                      tone="rust"
                      value={s.stress}
                      onChange={(stress) => patchStage(s.id, { stress })}
                    />
                  </td>
                  <td>
                    <PillRow
                      label={`Stage ${i + 1} error touchpoints`}
                      tone="rust"
                      value={s.error}
                      onChange={(error) => patchStage(s.id, { error })}
                    />
                  </td>
                  <td>
                    <PillRow
                      label={`Stage ${i + 1} ease and comfort`}
                      tone="green"
                      value={s.ease}
                      onChange={(ease) => patchStage(s.id, { ease })}
                    />
                  </td>

                  <td>
                    <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {DIMENSIONS.map((dim) => (
                        <label key={dim} className="block">
                          <span
                            className="mono block"
                            style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.03em" }}
                          >
                            {dim}
                          </span>
                          <select
                            className={`field lvl lvl-${s.dims[dim]}`}
                            style={{ padding: "4px 6px", fontSize: "var(--t-caption)", minHeight: 30 }}
                            value={s.dims[dim]}
                            aria-label={`Stage ${i + 1} ${dim} load`}
                            onChange={(e) =>
                              patchStage(s.id, {
                                dims: { ...s.dims, [dim]: e.target.value as Level },
                              })
                            }
                          >
                            {LEVELS.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </td>

                  <td>
                    <select
                      className="field"
                      style={{ padding: "6px 8px", fontSize: "var(--t-footnote)", minHeight: 34 }}
                      value={s.closure}
                      aria-label={`Stage ${i + 1} closure`}
                      onChange={(e) =>
                        patchStage(s.id, { closure: e.target.value as Stage["closure"] })
                      }
                    >
                      <option value="">— not set —</option>
                      <option value="Complete">Complete</option>
                      <option value="Partial">Partial</option>
                      <option value="Incomplete">Incomplete</option>
                    </select>
                    <TextArea
                      rows={2}
                      className="mt-1"
                      value={s.closureNote}
                      onChange={(e) => patchStage(s.id, { closureNote: e.target.value })}
                      placeholder="Short note…"
                      aria-label={`Stage ${i + 1} closure note`}
                      style={{ fontSize: "var(--t-caption)" }}
                    />
                  </td>

                  <td>
                    <TextArea
                      rows={3}
                      value={s.justification}
                      onChange={(e) => patchStage(s.id, { justification: e.target.value })}
                      placeholder="The design pointer this stage suggests…"
                      aria-label={`Stage ${i + 1} design-brief justification`}
                      style={{ fontSize: "var(--t-footnote)" }}
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      aria-label={`Delete stage ${i + 1}`}
                      className="tap grid place-items-center rounded-[10px]"
                      style={{ width: 38, height: 38, minHeight: 38, minWidth: 38, color: "var(--rust)" }}
                      onClick={() =>
                        setDisco({
                          ...d,
                          stages:
                            d.stages.length > 1 ? d.stages.filter((x) => x.id !== s.id) : [newStage()],
                        })
                      }
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="btn btn-quiet w-full mt-2"
          onClick={() => setDisco({ ...d, stages: [...d.stages, newStage()] })}
        >
          <Plus size={16} aria-hidden />
          Add stage
        </button>
      </section>

      {/* Summary & Design Considerations */}
      <section className="card p-4 band band-consider">
        <h2 style={{ fontSize: "var(--t-title3)", fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
          Summary &amp; Design Considerations
        </h2>
        <p style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)", margin: "0 0 12px" }}>
          Where cognitive friction concentrates across the task, and what the audit recommends.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateSummary}
            disabled={status.kind === "busy"}
          >
            {status.kind === "busy" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={16} aria-hidden />
            )}
            Generate Summary &amp; Considerations
          </button>
          <StatusLine status={status} />
        </div>

        <Labeled label="Summary & design considerations (editable)">
          <TextArea
            rows={9}
            value={d.summary}
            onChange={(e) => setDisco({ ...d, summary: e.target.value })}
            placeholder="Generate a draft above, or write it yourself."
          />
        </Labeled>

        <div className="mt-3">
          <span className="eyebrow block mb-1.5">Suggested cognitive dimensions to address</span>
          <div className="flex flex-wrap gap-1.5">
            {DIMENSIONS.map((dim) => {
              const on = d.suggestedDims.includes(dim);
              return (
                <button
                  key={dim}
                  type="button"
                  aria-pressed={on}
                  className="tag"
                  style={{
                    minHeight: 32,
                    cursor: "pointer",
                    background: on ? "var(--brass-soft)" : "var(--surface-2)",
                    borderColor: on ? "var(--brass)" : "var(--separator-strong)",
                    color: on ? "var(--brass)" : "var(--text-3)",
                    fontWeight: on ? 700 : 400,
                  }}
                  onClick={() =>
                    setDisco({
                      ...d,
                      suggestedDims: on
                        ? d.suggestedDims.filter((x) => x !== dim)
                        : [...d.suggestedDims, dim],
                    })
                  }
                >
                  {dim}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "var(--t-caption)", color: "var(--text-3)", marginTop: 6 }}>
            Generated by the audit; tap any tag to add or remove it yourself.
          </p>
        </div>
      </section>

      {/* Overall cognitive load sliders */}
      <section className="card p-4">
        <h2 style={{ fontSize: "var(--t-title3)", fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
          Overall Cognitive Load Rating
        </h2>
        <p style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)", margin: "0 0 14px" }}>
          Your own final judgment for the whole task, 0–10 per dimension — independent of the
          per-stage dropdowns above.
        </p>
        <div className="grid gap-3">
          {DIMENSIONS.map((dim) => {
            const v = d.overall[dim] ?? 0;
            const tone = v >= 7 ? "var(--rust)" : v >= 4 ? "var(--brass)" : "var(--teal)";
            return (
              <div key={dim} className="flex items-center gap-3">
                <span
                  className="mono shrink-0"
                  style={{ width: 120, fontSize: "var(--t-caption)", color: "var(--text-2)" }}
                >
                  {dim}
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={v}
                  aria-label={`Overall ${dim} load, 0 to 10`}
                  onChange={(e) =>
                    setDisco({ ...d, overall: { ...d.overall, [dim]: Number(e.target.value) } })
                  }
                  style={{ accentColor: tone }}
                />
                <span
                  className="mono shrink-0 text-right"
                  style={{ width: 42, fontSize: "var(--t-footnote)", color: tone, fontWeight: 700 }}
                >
                  {v}/10
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
