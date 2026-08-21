"use client";

import { AlertTriangle, Loader2, Printer, Sparkles, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import { combinedDirections, hotspots, printCase } from "@/lib/exporters";
import { DIMENSIONS, type CaseStudy } from "@/lib/types";
import { Empty, Labeled, ReadOnlyBlock, StatusLine, TextArea } from "../ui";

type Status = { kind: "idle" | "busy" | "ok" | "error"; msg?: string };

function Band({
  tone,
  eyebrow,
  title,
  blurb,
  children,
}: {
  tone: "vision" | "consider" | "brief";
  eyebrow: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  const color =
    tone === "vision" ? "var(--purple)" : tone === "consider" ? "var(--brass)" : "var(--teal)";
  return (
    <section className={`band band-${tone} pl-4`}>
      <p className="eyebrow" style={{ color, marginBottom: 2 }}>
        {eyebrow}
      </p>
      <h2
        style={{
          fontSize: "var(--t-title2)",
          fontWeight: 700,
          letterSpacing: "-0.015em",
          margin: 0,
          color,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)", margin: "2px 0 14px" }}>
        {blurb}
      </p>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        {k}
      </p>
      {v.trim() ? (
        <p style={{ fontSize: "var(--t-subhead)", margin: 0, whiteSpace: "pre-wrap" }}>{v}</p>
      ) : (
        <Empty>—</Empty>
      )}
    </div>
  );
}

export default function FinalBriefTab({
  c,
  setBrief,
  onSubmitGallery,
  readOnly = false,
  submitState,
}: {
  c: CaseStudy;
  setBrief?: (t: string) => void;
  onSubmitGallery?: () => void;
  readOnly?: boolean;
  submitState?: Status;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dirs = combinedDirections(c);
  const hs = hotspots(c);
  const rows = Math.max(c.mm.flow.length, c.disco.stages.length);

  async function generateBrief() {
    if (!setBrief) return;
    setStatus({ kind: "busy", msg: "Synthesising…" });
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: c.title,
          archetype: c.archetype,
          visionWriteup: c.mm.visionWriteup,
          summary: c.disco.summary,
          dimensions: c.disco.suggestedDims,
          directions: dirs,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.brief) throw new Error(json.error ?? "no text returned");
      setBrief(json.brief);
      setStatus({ kind: "ok", msg: "Draft generated — edit it below." });
    } catch {
      setStatus({
        kind: "error",
        msg: "Generation failed — check your connection, or write your own.",
      });
    }
  }

  return (
    <div className="grid gap-8">
      {/* ---------- Design Vision ---------- */}
      <Band
        tone="vision"
        eyebrow="From the Mental Model"
        title="Design Vision"
        blurb="What the user needs, wants, wishes for, expects and finds aesthetically right."
      >
        <Card title="Design Vision writeup">
          <ReadOnlyBlock text={c.mm.visionWriteup} />
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card title="User model">
            <KV k="Demographic & psychographic" v={c.mm.userModel.demographic} />
            <KV k="Knowledge" v={c.mm.userModel.knowledge} />
            <KV k="Abilities" v={c.mm.userModel.abilities} />
            <KV k="Mood" v={c.mm.userModel.mood} />
            <KV k="Environment" v={c.mm.userModel.environment} />
          </Card>
          <Card title="Metaphor · expectations · needs · aesthetic">
            <KV k="Metaphor / analogy" v={c.mm.vision.metaphor} />
            <KV k="Rich description" v={c.mm.vision.rich} />
            <KV k="Expectations before use" v={c.mm.vision.expectations} />
            <KV k="Needs / wants / wishes" v={c.mm.vision.needs} />
            <KV k="Aesthetic / visual preferences" v={c.mm.vision.aesthetic} />
          </Card>
        </div>

        <Card title="Closure satisfaction — did reality meet the vision?">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c.mm.closure.rating >= i ? "var(--purple-fill)" : "transparent",
                  border: `2px solid ${c.mm.closure.rating >= i ? "var(--purple-fill)" : "var(--field-border)"}`,
                }}
              />
            ))}
            <span className="mono" style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)" }}>
              {c.mm.closure.rating || "–"}/5
            </span>
          </div>
          <ReadOnlyBlock text={c.mm.closure.notes} />
        </Card>
      </Band>

      {/* ---------- Design Consideration ---------- */}
      <Band
        tone="consider"
        eyebrow="From the 7-Step DISCO audit"
        title="Design Consideration"
        blurb="Requirements and recommendations produced by the stage-by-stage cognitive audit."
      >
        <Card title="Summary & design considerations">
          <ReadOnlyBlock text={c.disco.summary} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {c.disco.suggestedDims.length ? (
              c.disco.suggestedDims.map((dim) => (
                <span
                  key={dim}
                  className="tag"
                  style={{
                    background: "var(--brass-soft)",
                    borderColor: "var(--brass)",
                    color: "var(--brass)",
                    fontWeight: 700,
                  }}
                >
                  {dim}
                </span>
              ))
            ) : (
              <Empty>No dimensions flagged yet.</Empty>
            )}
          </div>
        </Card>

        {/* Interaction Timeline — the synthesis view */}
        <Card title="Interaction timeline — mental model ↔ DISCO, step by step">
          {rows === 0 ? (
            <Empty>Nothing to align yet.</Empty>
          ) : (
            <div className="grid gap-2">
              <div
                className="hidden sm:grid gap-2 pb-1"
                style={{ gridTemplateColumns: "28px 1fr 1fr" }}
              >
                <span />
                <span className="eyebrow" style={{ color: "var(--purple)" }}>
                  Mental Model step
                </span>
                <span className="eyebrow" style={{ color: "var(--brass)" }}>
                  DISCO stage
                </span>
              </div>

              {Array.from({ length: rows }, (_, i) => {
                const m = c.mm.flow[i];
                const s = c.disco.stages[i];
                return (
                  <div
                    key={i}
                    className="grid gap-2 items-start pt-2"
                    style={{
                      gridTemplateColumns: "28px 1fr",
                      borderTop: i ? "1px solid var(--separator)" : "none",
                    }}
                  >
                    <span
                      className="mono grid place-items-center rounded-full"
                      style={{
                        width: 26,
                        height: 26,
                        border: "1px solid var(--separator-strong)",
                        fontSize: "var(--t-caption)",
                        color: "var(--text-2)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div
                        className="p-2.5 rounded-[10px]"
                        style={{
                          background: m?.stress ? "var(--rust-soft)" : "var(--purple-soft)",
                          border: `1px solid ${m?.stress ? "var(--rust)" : "var(--purple)"}`,
                        }}
                      >
                        {m ? (
                          <>
                            <p style={{ fontSize: "var(--t-footnote)", margin: 0, whiteSpace: "pre-wrap" }}>
                              {m.text.trim() || "—"}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <span className="tag" style={{ fontSize: 10, padding: "1px 7px" }}>
                                {m.scale}
                              </span>
                              {m.stress && (
                                <span
                                  className="tag"
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 7px",
                                    borderColor: "var(--rust)",
                                    color: "var(--rust)",
                                    background: "transparent",
                                  }}
                                >
                                  stress
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <Empty>No mental-model step at this index.</Empty>
                        )}
                      </div>

                      <div
                        className="p-2.5 rounded-[10px]"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--separator)" }}
                      >
                        {s ? (
                          <>
                            <p style={{ fontSize: "var(--t-footnote)", margin: 0, whiteSpace: "pre-wrap" }}>
                              {s.flow.trim() || "—"}
                            </p>
                            <p
                              className="mono"
                              style={{ fontSize: 10, color: "var(--text-2)", margin: "5px 0 0" }}
                            >
                              stress {s.stress}/5 · error {s.error}/5 · ease {s.ease}/5
                              {s.closure ? ` · ${s.closure.toLowerCase()}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {DIMENSIONS.filter((k) => s.dims[k] !== "None").map((k) => (
                                <span
                                  key={k}
                                  className={`tag lvl lvl-${s.dims[k]}`}
                                  style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999 }}
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <Empty>No DISCO stage at this index.</Empty>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Cognition dimensions — overall load (0–10)">
            <div className="grid gap-2">
              {DIMENSIONS.map((dim) => {
                const v = c.disco.overall[dim] ?? 0;
                const tone = v >= 7 ? "var(--rust)" : v >= 4 ? "var(--brass)" : "var(--teal)";
                return (
                  <div key={dim} className="flex items-center gap-2.5">
                    <span
                      className="mono shrink-0"
                      style={{ width: 108, fontSize: 11, color: "var(--text-2)" }}
                    >
                      {dim}
                    </span>
                    <span
                      className="flex-1 rounded-full overflow-hidden"
                      style={{ height: 8, background: "var(--surface-3)" }}
                    >
                      <span
                        style={{ display: "block", height: "100%", width: `${v * 10}%`, background: tone }}
                      />
                    </span>
                    <span
                      className="mono shrink-0 text-right"
                      style={{ width: 34, fontSize: 11, color: tone, fontWeight: 700 }}
                    >
                      {v}/10
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Stress / error hotspots (rated ≥ 4 of 5)">
            {hs.length === 0 ? (
              <Empty>No stage is rated 4 or above for stress or error.</Empty>
            ) : (
              <ul className="grid gap-2 m-0 p-0" style={{ listStyle: "none" }}>
                {hs.map((s) => (
                  <li
                    key={s.id}
                    className="flex gap-2.5 items-start p-2.5 rounded-[10px]"
                    style={{ background: "var(--rust-soft)", border: "1px solid var(--rust)" }}
                  >
                    <AlertTriangle size={15} aria-hidden style={{ color: "var(--rust)", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--rust)", fontWeight: 700 }}>
                        Stage {s.index}
                      </span>
                      <span style={{ display: "block", fontSize: "var(--t-footnote)" }}>
                        {s.flow.trim() || "Untitled stage"}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--text-2)" }}>
                        stress {s.stress}/5 · error {s.error}/5
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Band>

      {/* ---------- Final Brief ---------- */}
      <Band
        tone="brief"
        eyebrow="Design Vision + Design Consideration"
        title="Final Cognitive Design Brief"
        blurb="The complete design requirement handed to concept development."
      >
        <Card title={`Combined design directions (${dirs.length})`}>
          {dirs.length === 0 ? (
            <Empty>
              Fill in Resolve entries on Tab ① or Design-Brief Justifications on Tab ② and they
              will merge here.
            </Empty>
          ) : (
            <ol className="grid gap-2 m-0 p-0" style={{ listStyle: "none" }}>
              {dirs.map((x, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span
                    className="tag shrink-0"
                    style={{
                      fontSize: 10,
                      padding: "1px 7px",
                      marginTop: 2,
                      borderColor: x.source === "Mental Model" ? "var(--purple)" : "var(--brass)",
                      color: x.source === "Mental Model" ? "var(--purple)" : "var(--brass)",
                      background: "transparent",
                    }}
                  >
                    {x.source === "Mental Model" ? "MM" : "DISCO"} {x.index}
                  </span>
                  <span style={{ fontSize: "var(--t-subhead)" }}>{x.text}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-accent"
              onClick={generateBrief}
              disabled={status.kind === "busy"}
            >
              {status.kind === "busy" ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={16} aria-hidden />
              )}
              Generate Final Cognitive Design Brief
            </button>
            <StatusLine status={status} />
          </div>
        )}

        {readOnly ? (
          <Card title="Final Cognitive Design Brief">
            <ReadOnlyBlock text={c.final_cognitive_brief} />
          </Card>
        ) : (
          <Labeled label="Final Cognitive Design Brief (editable)" hint="180–300 words.">
            <TextArea
              rows={11}
              value={c.final_cognitive_brief}
              onChange={(e) => setBrief?.(e.target.value)}
              placeholder="Generate a draft above, or write the brief yourself."
            />
          </Labeled>
        )}

        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" className="btn btn-quiet" onClick={() => printCase(c)}>
            <Printer size={16} aria-hidden />
            {readOnly ? "Export / Print this submission" : "Export / Print full case study"}
          </button>
          {!readOnly && onSubmitGallery && (
            <button type="button" className="btn btn-primary" onClick={onSubmitGallery}>
              <Upload size={16} aria-hidden />
              Submit to Class Gallery
            </button>
          )}
          {submitState && <StatusLine status={submitState} />}
        </div>
      </Band>
    </div>
  );
}
