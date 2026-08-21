"use client";

import { Loader2, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { newStep } from "@/lib/defaults";
import type { CaseStudy, FlowStep, MentalModel } from "@/lib/types";
import {
  DotRating,
  Empty,
  Labeled,
  Segmented,
  Sheet,
  StatusLine,
  TextArea,
} from "../ui";

type Status = { kind: "idle" | "busy" | "ok" | "error"; msg?: string };

export default function MentalModelTab({
  c,
  setMM,
}: {
  c: CaseStudy;
  setMM: (mm: MentalModel) => void;
}) {
  const mm = c.mm;
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const patchUser = (k: keyof MentalModel["userModel"], v: string) =>
    setMM({ ...mm, userModel: { ...mm.userModel, [k]: v } });
  const patchVision = (k: keyof MentalModel["vision"], v: string) =>
    setMM({ ...mm, vision: { ...mm.vision, [k]: v } });

  const patchStep = (id: string, patch: Partial<FlowStep>) =>
    setMM({ ...mm, flow: mm.flow.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const stressSteps = mm.flow.filter((s) => s.stress);

  async function generateVision() {
    setStatus({ kind: "busy", msg: "Generating…" });
    try {
      const res = await fetch("/api/generate-vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: c.title,
          archetype: c.archetype,
          userModel: mm.userModel,
          vision: mm.vision,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.vision) throw new Error(json.error ?? "no text returned");
      setMM({ ...mm, visionWriteup: json.vision });
      setStatus({ kind: "ok", msg: "Draft generated — edit it below." });
    } catch {
      setStatus({
        kind: "error",
        msg: "Generation failed — check your connection, or write your own.",
      });
    }
  }

  return (
    <div className="grid gap-3">
      {/* 1. User Model */}
      <Sheet
        n={1}
        title="User Model"
        subtitle="Who is this person, before the artifact enters the picture?"
        accent="var(--purple-fill)"
        defaultOpen
      >
        <Labeled label="Demographic & psychographic profile">
          <TextArea
            value={mm.userModel.demographic}
            onChange={(e) => patchUser("demographic", e.target.value)}
            placeholder="Age, occupation, cultural context, values, attitudes toward this kind of product…"
          />
        </Labeled>
        <Labeled label="User knowledge">
          <TextArea
            value={mm.userModel.knowledge}
            onChange={(e) => patchUser("knowledge", e.target.value)}
            placeholder="What do they already know? What prior products has this knowledge come from?"
          />
        </Labeled>
        <Labeled label="User abilities">
          <TextArea
            value={mm.userModel.abilities}
            onChange={(e) => patchUser("abilities", e.target.value)}
            placeholder="Physical, sensory and cognitive abilities relevant to this task."
          />
        </Labeled>
        <Labeled label="User mood">
          <TextArea
            value={mm.userModel.mood}
            onChange={(e) => patchUser("mood", e.target.value)}
            placeholder="What state of mind do they arrive in — rushed, anxious, curious, resigned?"
          />
        </Labeled>
        <Labeled label="User environment">
          <TextArea
            value={mm.userModel.environment}
            onChange={(e) => patchUser("environment", e.target.value)}
            placeholder="Where does the task happen? Noise, light, privacy, interruptions, who else is present."
          />
        </Labeled>
      </Sheet>

      {/* 2. Design Vision fields */}
      <Sheet
        n={2}
        title="Design Vision"
        subtitle="Metaphor, expectations & aesthetic wishes"
        accent="var(--purple-fill)"
      >
        <Labeled label="Metaphor / analogy" hint="What does the user think this is like?">
          <TextArea
            value={mm.vision.metaphor}
            onChange={(e) => patchVision("metaphor", e.target.value)}
            placeholder="“It's like a filing cabinet.” “It's like asking a shopkeeper.”"
          />
        </Labeled>
        <Labeled label="Rich description">
          <TextArea
            rows={4}
            value={mm.vision.rich}
            onChange={(e) => patchVision("rich", e.target.value)}
            placeholder="Describe the user's mental image of the artifact in their own terms, at length."
          />
        </Labeled>
        <Labeled label="Expectations before use">
          <TextArea
            value={mm.vision.expectations}
            onChange={(e) => patchVision("expectations", e.target.value)}
            placeholder="What do they assume will happen, before they begin?"
          />
        </Labeled>
        <Labeled label="Needs / wants / wishes">
          <TextArea
            value={mm.vision.needs}
            onChange={(e) => patchVision("needs", e.target.value)}
            placeholder="Separate what they need from what they want from what they merely wish for."
          />
        </Labeled>
        <Labeled label="Aesthetic / visual preferences">
          <TextArea
            value={mm.vision.aesthetic}
            onChange={(e) => patchVision("aesthetic", e.target.value)}
            placeholder="What would look and feel 'right' to this user, and why?"
          />
        </Labeled>
      </Sheet>

      {/* 3. AI writeup */}
      <Sheet
        n={3}
        title="Design Vision Writeup"
        subtitle="AI-assisted draft — you edit it, and your edit is what flows onward"
        accent="var(--purple-fill)"
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateVision}
            disabled={status.kind === "busy"}
          >
            {status.kind === "busy" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={16} aria-hidden />
            )}
            Generate Design Vision
          </button>
          <StatusLine status={status} />
        </div>
        <Labeled label="Design Vision (editable)" hint="120–220 words. Tabs ③ uses this text.">
          <TextArea
            rows={9}
            value={mm.visionWriteup}
            onChange={(e) => setMM({ ...mm, visionWriteup: e.target.value })}
            placeholder="Generate a draft above, or write the Design Vision yourself."
          />
        </Labeled>
      </Sheet>

      {/* 4. Interaction flow */}
      <Sheet
        n={4}
        title="User / Artefact Interaction Flow"
        subtitle={`${mm.flow.length} step${mm.flow.length === 1 ? "" : "s"} · ${stressSteps.length} stress point${stressSteps.length === 1 ? "" : "s"}`}
        accent="var(--purple-fill)"
      >
        {mm.flow.map((s, i) => (
          <div
            key={s.id}
            className="card p-3"
            style={{
              borderColor: s.stress ? "var(--rust)" : "var(--separator)",
              background: s.stress ? "var(--rust-soft)" : "var(--surface)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mono shrink-0 grid place-items-center rounded-full mt-1"
                style={{
                  width: 24,
                  height: 24,
                  border: "1px solid var(--separator-strong)",
                  fontSize: "var(--t-caption)",
                  color: "var(--text-2)",
                }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 grid gap-2.5">
                <TextArea
                  rows={2}
                  value={s.text}
                  onChange={(e) => patchStep(s.id, { text: e.target.value })}
                  placeholder="What does the user do at this step?"
                  aria-label={`Step ${i + 1} description`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    label={`Step ${i + 1} scale`}
                    value={s.scale}
                    onChange={(v) => patchStep(s.id, { scale: v })}
                    options={[
                      { value: "micro", label: "Micro" },
                      { value: "macro", label: "Macro" },
                    ]}
                  />
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={s.stress}
                    onClick={() => patchStep(s.id, { stress: !s.stress })}
                    style={{
                      minHeight: 38,
                      padding: "0 12px",
                      fontSize: "var(--t-footnote)",
                      background: s.stress ? "var(--rust-fill)" : "var(--surface-3)",
                      color: s.stress ? "var(--on-fill)" : "var(--text-2)",
                    }}
                  >
                    <Zap size={14} aria-hidden />
                    Stress point
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete step ${i + 1}`}
                    className="tap grid place-items-center rounded-[10px] ml-auto"
                    style={{ width: 38, height: 38, minHeight: 38, minWidth: 38, color: "var(--rust)" }}
                    onClick={() =>
                      setMM({
                        ...mm,
                        flow: mm.flow.length > 1 ? mm.flow.filter((x) => x.id !== s.id) : [newStep()],
                      })
                    }
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>

                {s.stress && (
                  <div className="grid gap-2.5 pt-1">
                    <Labeled label="Cognitive load — what is difficult here">
                      <TextArea
                        rows={2}
                        value={s.load}
                        onChange={(e) => patchStep(s.id, { load: e.target.value })}
                        placeholder="What must the user hold, decide, decode or recall at this moment?"
                      />
                    </Labeled>
                    <Labeled label="Probable cause">
                      <TextArea
                        rows={2}
                        value={s.cause}
                        onChange={(e) => patchStep(s.id, { cause: e.target.value })}
                        placeholder="What in the artifact produces that load?"
                      />
                    </Labeled>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-quiet w-full"
          onClick={() => setMM({ ...mm, flow: [...mm.flow, newStep()] })}
        >
          <Plus size={16} aria-hidden />
          Add step
        </button>
      </Sheet>

      {/* 5. Resolve / Clarify */}
      <Sheet
        n={5}
        title="Resolve / Clarify"
        subtitle="One card per flagged stress point — auto-populated from step 4"
        accent="var(--purple-fill)"
      >
        {stressSteps.length === 0 ? (
          <Empty>
            No stress points flagged yet. Mark a step as a ⚡ stress point in section 4 and it
            will appear here.
          </Empty>
        ) : (
          mm.flow.map((s, i) =>
            s.stress ? (
              <div key={s.id} className="card p-3" style={{ background: "var(--surface-2)" }}>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  Step {i + 1}
                </p>
                <p style={{ fontSize: "var(--t-subhead)", fontWeight: 600, marginBottom: 6 }}>
                  {s.text.trim() || <span style={{ color: "var(--text-3)" }}>Untitled step</span>}
                </p>
                <p
                  style={{
                    fontSize: "var(--t-footnote)",
                    color: "var(--rust)",
                    marginBottom: 10,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {s.load.trim() || "No cognitive load described yet."}
                </p>
                <Labeled label="Design direction to resolve this">
                  <TextArea
                    rows={3}
                    value={s.resolve}
                    onChange={(e) => patchStep(s.id, { resolve: e.target.value })}
                    placeholder="What change to the artifact closes the gap between it and the user's mental model?"
                  />
                </Labeled>
              </div>
            ) : null
          )
        )}
      </Sheet>

      {/* 6. Closure satisfaction */}
      <Sheet
        n={6}
        title="Closure Satisfaction"
        subtitle="Did the completed interaction match the user's mental model?"
        accent="var(--purple-fill)"
      >
        <Labeled label="Rating">
          <DotRating
            value={mm.closure.rating}
            onChange={(v) => setMM({ ...mm, closure: { ...mm.closure, rating: v } })}
            label="Closure satisfaction"
          />
        </Labeled>
        <Labeled label="Notes">
          <TextArea
            rows={4}
            value={mm.closure.notes}
            onChange={(e) => setMM({ ...mm, closure: { ...mm.closure, notes: e.target.value } })}
            placeholder="Where did reality diverge from the vision, and how did that feel to the user?"
          />
        </Labeled>
      </Sheet>
    </div>
  );
}
