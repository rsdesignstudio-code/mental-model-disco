import { ATTRIBUTION_LINES } from "./content";
import { DIMENSIONS, type CaseStudy, type GallerySubmission } from "./types";

/* ---------------- small helpers ---------------- */

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const para = (s: unknown) =>
  String(s ?? "").trim()
    ? esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")
    : `<p class="muted">—</p>`;

export function downloadBlob(name: string, mime: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) =>
  (s || "case-study").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Stages where stress or error is rated 4/5 or above. */
export function hotspots(c: CaseStudy) {
  return c.disco.stages
    .map((s, i) => ({ ...s, index: i + 1 }))
    .filter((s) => s.stress >= 4 || s.error >= 4);
}

/** Every Resolve entry + every Design-Brief Justification, tagged by source. */
export function combinedDirections(c: CaseStudy) {
  const fromMM = c.mm.flow
    .map((s, i) => ({ source: "Mental Model" as const, index: i + 1, text: s.resolve.trim(), context: s.text }))
    .filter((d) => d.text);
  const fromDisco = c.disco.stages
    .map((s, i) => ({ source: "DISCO" as const, index: i + 1, text: s.justification.trim(), context: s.flow }))
    .filter((d) => d.text);
  return [...fromMM, ...fromDisco];
}

/* ---------------- Full printable case document ---------------- */

export function caseToPrintableHTML(c: CaseStudy): string {
  const mm = c.mm;
  const d = c.disco;
  const dirs = combinedDirections(c);
  const hs = hotspots(c);

  const field = (label: string, val: unknown) =>
    `<div class="f"><div class="lab">${esc(label)}</div>${para(val)}</div>`;

  const stepRows = mm.flow
    .map(
      (s, i) => `
      <div class="step ${s.stress ? "stress" : ""}">
        <div class="stepnum">${i + 1}</div>
        <div>
          <div class="steptags">
            <span class="tg">${esc(s.scale)}</span>
            ${s.stress ? `<span class="tg tg-rust">stress point</span>` : ""}
          </div>
          ${para(s.text)}
          ${s.stress ? `${field("Cognitive load", s.load)}${field("Probable cause", s.cause)}${field("Design direction to resolve", s.resolve)}` : ""}
        </div>
      </div>`
    )
    .join("");

  const stageRows = d.stages
    .map(
      (s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${para(s.flow)}</td>
        <td>${s.entities.length ? s.entities.map((e) => `<span class="tg">${esc(e)}</span>`).join(" ") : "—"}</td>
        <td class="num">${s.stress}/5</td>
        <td class="num">${s.error}/5</td>
        <td class="num">${s.ease}/5</td>
        <td>${DIMENSIONS.filter((k) => s.dims[k] !== "None")
          .map((k) => `<span class="tg tg-${s.dims[k].toLowerCase()}">${esc(k)}: ${esc(s.dims[k])}</span>`)
          .join(" ") || "—"}</td>
        <td>${esc(s.closure || "—")}${s.closureNote ? `<div class="sm">${esc(s.closureNote)}</div>` : ""}</td>
        <td>${para(s.justification)}</td>
      </tr>`
    )
    .join("");

  const timeline = Array.from({
    length: Math.max(mm.flow.length, d.stages.length),
  })
    .map((_, i) => {
      const m = mm.flow[i];
      const s = d.stages[i];
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${m ? `${para(m.text)}${m.stress ? `<span class="tg tg-rust">stress</span>` : ""}` : `<span class="muted">— no mental-model step —</span>`}</td>
        <td>${
          s
            ? `${para(s.flow)}<div class="sm">stress ${s.stress}/5 · error ${s.error}/5 · ease ${s.ease}/5</div>
               <div>${DIMENSIONS.filter((k) => s.dims[k] !== "None")
                 .map((k) => `<span class="tg tg-${s.dims[k].toLowerCase()}">${esc(k)}</span>`)
                 .join(" ")}</div>`
            : `<span class="muted">— no DISCO stage —</span>`
        }</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(c.title || "Case Study")} — Mental Model × DISCO</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif;
         color: #1b1a17; background: #fff; margin: 0; padding: 24px; max-width: 1100px; }
  h1 { font-size: 24pt; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 14pt; margin: 30px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #1b1a17; }
  h3 { font-size: 11.5pt; margin: 18px 0 6px; }
  p { margin: 0 0 8px; }
  .muted { color: #7a756a; }
  .sm { font-size: 9pt; color: #5c584f; }
  .lab { font: 8.5pt ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .07em;
         text-transform: uppercase; color: #7a756a; margin-bottom: 2px; }
  .f { margin: 0 0 10px; }
  .meta { display: flex; flex-wrap: wrap; gap: 18px; margin: 10px 0 4px;
          font: 9.5pt ui-monospace, "SF Mono", Menlo, monospace; color: #5c584f; }
  .band { border-left: 4px solid #ccc; padding-left: 14px; margin: 24px 0; page-break-inside: avoid; }
  .band-vision { border-color: #63459a; }
  .band-consider { border-color: #8a6114; }
  .band-brief { border-color: #0f6a67; }
  .card { border: 1px solid #ddd8cf; border-radius: 10px; padding: 12px 14px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 8px 0 16px; }
  th, td { border: 1px solid #ddd8cf; padding: 6px 7px; vertical-align: top; text-align: left; }
  th { background: #f2f0ea; font: 8.5pt ui-monospace, "SF Mono", Menlo, monospace;
       letter-spacing: .05em; text-transform: uppercase; }
  td.num { text-align: center; font-family: ui-monospace, "SF Mono", Menlo, monospace; width: 34px; }
  .tg { display: inline-block; border: 1px solid #ddd8cf; background: #f7f5f0; border-radius: 99px;
        padding: 1px 7px; font: 8pt ui-monospace, "SF Mono", Menlo, monospace; margin: 1px 2px 1px 0; }
  .tg-low { border-color: #0f6a67; color: #0f6a67; background: #ddf0ef; }
  .tg-medium { border-color: #8a6114; color: #8a6114; background: #f6ecd8; }
  .tg-high, .tg-rust { border-color: #ad2317; color: #ad2317; background: #fbe4e1; }
  .step { display: grid; grid-template-columns: 30px 1fr; gap: 10px; padding: 10px 0;
          border-bottom: 1px solid #eee9e0; page-break-inside: avoid; }
  .step.stress { background: #fdf6f5; }
  .stepnum { font: 9pt ui-monospace, Menlo, monospace; color: #7a756a; }
  .steptags { margin-bottom: 4px; }
  .dots { font-family: ui-monospace, Menlo, monospace; letter-spacing: 2px; }
  .dimbar { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 9pt; }
  .dimbar .track { flex: 1; height: 7px; background: #ebe8e0; border-radius: 4px; overflow: hidden; }
  .dimbar .fill { height: 100%; background: #8a6114; }
  .dimbar .name { width: 130px; font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; }
  footer { margin-top: 34px; padding-top: 12px; border-top: 1px solid #ddd8cf;
           font-size: 8.5pt; color: #5c584f; font-style: italic; }
  @media print { body { padding: 0 } .noprint { display: none } }
</style></head><body>

<h1>${esc(c.title || "Untitled case study")}</h1>
<div class="meta">
  <span>ARCHETYPE: ${esc(c.archetype || "—")}</span>
  <span>ANALYST: ${esc(c.student || "—")}</span>
  <span>DATE: ${esc(c.case_date || "—")}</span>
</div>
<p class="sm">Full Cognitive Design Case Study — Mental Model Mapper × 7-Step DISCO Cognitive Task Analysis</p>

<div class="band band-vision">
<h2>Part One — Mental Model</h2>

<h3>1. User Model</h3>
<div class="card">
  ${field("Demographic & psychographic profile", mm.userModel.demographic)}
  ${field("User knowledge", mm.userModel.knowledge)}
  ${field("User abilities", mm.userModel.abilities)}
  ${field("User mood", mm.userModel.mood)}
  ${field("User environment", mm.userModel.environment)}
</div>

<h3>2. Design Vision — Metaphor, Expectations & Aesthetic Wishes</h3>
<div class="card">
  ${field("Metaphor / analogy", mm.vision.metaphor)}
  ${field("Rich description", mm.vision.rich)}
  ${field("Expectations before use", mm.vision.expectations)}
  ${field("Needs / wants / wishes", mm.vision.needs)}
  ${field("Aesthetic / visual preferences", mm.vision.aesthetic)}
</div>

<h3>3. Design Vision Writeup</h3>
<div class="card">${para(mm.visionWriteup)}</div>

<h3>4. User / Artefact Interaction Flow</h3>
${stepRows || `<p class="muted">No steps recorded.</p>`}

<h3>5. Resolve / Clarify</h3>
${
  mm.flow.filter((s) => s.stress).length
    ? mm.flow
        .map((s, i) =>
          s.stress
            ? `<div class="card"><div class="lab">Step ${i + 1} — ${esc(s.text.slice(0, 70))}</div>
               ${field("Cognitive load", s.load)}${field("Design direction to resolve this", s.resolve)}</div>`
            : ""
        )
        .join("")
    : `<p class="muted">No stress points flagged.</p>`
}

<h3>6. Closure Satisfaction</h3>
<div class="card">
  <div class="lab">Rating</div>
  <p class="dots">${"●".repeat(mm.closure.rating)}${"○".repeat(Math.max(0, 5 - mm.closure.rating))} &nbsp; ${mm.closure.rating}/5</p>
  ${field("Notes", mm.closure.notes)}
</div>
</div>

<div class="band band-consider">
<h2>Part Two — Task Analysis (7-Step DISCO)</h2>
<table>
  <thead><tr>
    <th>#</th><th>Task-Interaction Flow</th><th>Entities of Interaction</th>
    <th>Stress</th><th>Error</th><th>Ease</th>
    <th>Cognition Dimensions</th><th>Closure</th><th>Design-Brief Justification</th>
  </tr></thead>
  <tbody>${stageRows}</tbody>
</table>

<h3>Summary & Design Considerations</h3>
<div class="card">${para(d.summary)}
  <div class="lab" style="margin-top:8px">Suggested cognitive dimensions to address</div>
  <div>${d.suggestedDims.length ? d.suggestedDims.map((x) => `<span class="tg">${esc(x)}</span>`).join(" ") : `<span class="muted">—</span>`}</div>
</div>

<h3>Overall Cognitive Load Rating (designer's judgment, 0–10)</h3>
<div class="card">
  ${DIMENSIONS.map(
    (k) => `<div class="dimbar"><span class="name">${esc(k)}</span>
      <span class="track"><span class="fill" style="width:${(d.overall[k] ?? 0) * 10}%"></span></span>
      <span>${d.overall[k] ?? 0}/10</span></div>`
  ).join("")}
</div>

<h3>Stress / Error Hotspots (≥ 4 of 5)</h3>
${
  hs.length
    ? `<ul>${hs.map((s) => `<li><strong>Stage ${s.index}</strong> — ${esc(s.flow.slice(0, 110) || "untitled stage")} <span class="sm">(stress ${s.stress}/5, error ${s.error}/5)</span></li>`).join("")}</ul>`
    : `<p class="muted">No stage rated 4 or above for stress or error.</p>`
}
</div>

<div class="band band-brief">
<h2>Part Three — Final Cognitive Design Brief</h2>

<h3>Interaction Timeline (dual track)</h3>
<table>
  <thead><tr><th>#</th><th>Mental Model step</th><th>DISCO stage</th></tr></thead>
  <tbody>${timeline}</tbody>
</table>

<h3>Combined Design Directions</h3>
${
  dirs.length
    ? `<ol>${dirs.map((x) => `<li><span class="tg">${esc(x.source)} · ${x.index}</span> ${esc(x.text)}</li>`).join("")}</ol>`
    : `<p class="muted">No design directions recorded yet.</p>`
}

<h3>Final Cognitive Design Brief</h3>
<div class="card">${para(c.final_cognitive_brief)}</div>
</div>

<footer>
  ${ATTRIBUTION_LINES.map((l) => `<div>${esc(l)}</div>`).join("")}
  <div style="margin-top:6px">Exported ${new Date().toLocaleString()}</div>
</footer>
</body></html>`;
}

/** Opens the printable document in a new window and triggers the print dialog. */
export function printCase(c: CaseStudy) {
  const html = caseToPrintableHTML(c);
  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) {
    // Popup blocked — fall back to downloading the document instead.
    downloadBlob(`${slug(c.title)}-case-study.html`, "text/html", html);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/* ---------------- Faculty exports ---------------- */

export function exportAllJSON(subs: GallerySubmission[]) {
  downloadBlob(
    `mm-disco-all-submissions-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
    JSON.stringify(
      { exported_at: new Date().toISOString(), count: subs.length, submissions: subs },
      null,
      2
    )
  );
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportSummaryCSV(subs: GallerySubmission[]) {
  const head = [
    "Student",
    "Case title",
    "User archetype",
    "Submitted",
    "Closure rating (0-5)",
    "Suggested cognitive dimensions",
    "Stress/error hotspot stages",
    "Mental model steps",
    "DISCO stages",
    "Design directions",
  ];
  const rows = subs.map((s) => {
    const c = s.data;
    const hs = hotspots(c).map((h) => `#${h.index}`).join(" ");
    return [
      s.student ?? "",
      s.title ?? "",
      s.archetype ?? "",
      new Date(s.submitted_at).toISOString().slice(0, 10),
      c.mm?.closure?.rating ?? 0,
      (c.disco?.suggestedDims ?? []).join("; "),
      hs,
      c.mm?.flow?.length ?? 0,
      c.disco?.stages?.length ?? 0,
      combinedDirections(c).length,
    ].map(csvCell).join(",");
  });
  downloadBlob(
    `mm-disco-class-summary-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8",
    "﻿" + [head.join(","), ...rows].join("\n")
  );
}

/** Single-case JSON backup ("⤓ Save Copy"). */
export function exportCaseJSON(c: CaseStudy) {
  downloadBlob(
    `${slug(c.title)}.mmdisco.json`,
    "application/json",
    JSON.stringify({ format: "mm-disco/case@1", exported_at: new Date().toISOString(), case: c }, null, 2)
  );
}
