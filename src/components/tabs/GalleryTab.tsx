"use client";

import { ArrowLeft, Download, FileSpreadsheet, Loader2, RefreshCw, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { exportAllJSON, exportSummaryCSV } from "@/lib/exporters";
import { normaliseDisco, normaliseMM } from "@/lib/defaults";
import type { GallerySubmission, Profile } from "@/lib/types";
import { Empty } from "../ui";
import FinalBriefTab from "./FinalBriefTab";

export default function GalleryTab({
  submissions,
  loading,
  profile,
  onRefresh,
  onDelete,
}: {
  submissions: GallerySubmission[];
  loading: boolean;
  profile: Profile | null;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = submissions.find((s) => s.id === openId) ?? null;

  if (open) {
    // Older snapshots may predate a field; normalise before rendering.
    const c = {
      ...open.data,
      mm: normaliseMM(open.data?.mm),
      disco: normaliseDisco(open.data?.disco),
      final_cognitive_brief: open.data?.final_cognitive_brief ?? "",
    };
    return (
      <div className="grid gap-5">
        <button type="button" className="btn btn-quiet self-start" onClick={() => setOpenId(null)}>
          <ArrowLeft size={16} aria-hidden />
          Back to gallery
        </button>

        <header className="card p-4">
          <p className="eyebrow" style={{ marginBottom: 2 }}>
            Class Gallery submission · read only
          </p>
          <h1
            style={{
              fontSize: "var(--t-title1)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            {open.title || "Untitled case study"}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mono" style={{ fontSize: "var(--t-caption)", color: "var(--text-2)" }}>
            <span>ANALYST: {open.student || "—"}</span>
            <span>ARCHETYPE: {open.archetype || "—"}</span>
            <span>SUBMITTED: {new Date(open.submitted_at).toLocaleDateString()}</span>
          </div>
        </header>

        <FinalBriefTab c={c} readOnly />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div
        className="card p-3.5 flex gap-3 items-start"
        style={{ background: "var(--brass-soft)", borderColor: "var(--brass)" }}
      >
        <Users size={18} aria-hidden style={{ color: "var(--brass)", flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: "var(--t-footnote)", color: "var(--brass)", margin: 0 }}>
          Anything submitted here is visible to <strong>everyone in the class</strong>, not just to
          you and faculty. Your own working case studies stay private until you submit them.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 style={{ fontSize: "var(--t-title3)", fontWeight: 700, margin: 0, flex: 1, letterSpacing: "-0.01em" }}>
          Submissions
          <span className="mono" style={{ fontSize: "var(--t-footnote)", color: "var(--text-3)", fontWeight: 400 }}>
            {" "}
            · {submissions.length}
          </span>
        </h2>
        <button type="button" className="btn btn-quiet" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={15} aria-hidden />
          )}
          Refresh
        </button>
      </div>

      {/* Faculty tools */}
      <section className="card p-4">
        <p className="eyebrow" style={{ marginBottom: 3 }}>
          Faculty tools
        </p>
        <p style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)", margin: "0 0 12px" }}>
          Pull the whole class in one file. JSON keeps every field; CSV is a gradebook-style
          overview, one row per submission.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-quiet"
            disabled={!submissions.length}
            onClick={() => exportAllJSON(submissions)}
          >
            <Download size={16} aria-hidden />
            Export All (JSON)
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={!submissions.length}
            onClick={() => exportSummaryCSV(submissions)}
          >
            <FileSpreadsheet size={16} aria-hidden />
            Export Summary (CSV)
          </button>
        </div>
      </section>

      {loading && !submissions.length ? (
        <Empty>Loading submissions…</Empty>
      ) : !submissions.length ? (
        <div className="card p-6 text-center">
          <Empty>
            No submissions yet. Finish a case study and use “Submit to Class Gallery” on Tab ③.
          </Empty>
        </div>
      ) : (
        <ul className="grid gap-2 m-0 p-0" style={{ listStyle: "none" }}>
          {submissions.map((s) => (
            <li key={s.id} className="card flex items-stretch overflow-hidden">
              <button
                type="button"
                className="flex-1 text-left px-4 py-3.5 min-w-0"
                style={{ background: "transparent", color: "var(--text)" }}
                onClick={() => setOpenId(s.id)}
              >
                <span
                  className="block truncate"
                  style={{ fontSize: "var(--t-headline)", fontWeight: 600 }}
                >
                  {s.title || "Untitled case study"}
                </span>
                <span
                  className="mono block mt-1"
                  style={{ fontSize: "var(--t-caption)", color: "var(--text-2)" }}
                >
                  {s.student || "—"} · {s.archetype || "no archetype"} ·{" "}
                  {new Date(s.submitted_at).toLocaleDateString()}
                </span>
              </button>
              {(profile?.id === s.user_id || profile?.role === "faculty") && (
                <button
                  type="button"
                  aria-label={`Delete submission ${s.title || "untitled"}`}
                  className="tap grid place-items-center px-3"
                  style={{ color: "var(--rust)", borderLeft: "1px solid var(--separator)" }}
                  onClick={() => {
                    if (confirm(`Remove "${s.title || "this submission"}" from the Class Gallery?`))
                      onDelete(s.id);
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
