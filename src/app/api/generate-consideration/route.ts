import { askClaude, jsonError, parseJSONObject } from "@/lib/server/anthropic";
import { DIMENSIONS, type Dimension } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a cognitive-ergonomics assistant working inside a design-school tool that runs a 7-Step DISCO Cognitive Task Analysis.

You are given a stage-by-stage audit table. Each stage records what the user does, the entities of interaction, ratings for stress, error and ease (0–5), which of six cognitive dimensions are loaded and how heavily, whether the stage reaches closure, and the design pointer the student drew from it.

Produce two things:

1. "summary" — a narrative writeup, 150 to 280 words, saying where cognitive friction concentrates across the task and what the audit therefore recommends. Refer to stages by their number. Name the specific cognitive dimensions carrying the load and say why the data points at them. Prose only: no headings, no bullets, no markdown. Do not restate the table row by row; interpret it.

2. "dimensions" — between 1 and 4 dimension names, chosen from exactly this list: ${DIMENSIONS.join(", ")}. Pick the ones the data most clearly says a designer must address. Order them most urgent first. Use the names verbatim.

Base everything on the supplied data. Where the table is thin, say so plainly rather than inventing findings.

Respond with a single JSON object and nothing else, in exactly this shape:
{"summary": "...", "dimensions": ["...", "..."]}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, archetype, stages } = body ?? {};

    const rows = (Array.isArray(stages) ? stages : []).map(
      (
        s: {
          flow?: string;
          entities?: string[];
          stress?: number;
          error?: number;
          ease?: number;
          dims?: Record<string, string>;
          closure?: string;
          closureNote?: string;
          justification?: string;
        },
        i: number
      ) => {
        const loaded = DIMENSIONS.filter((d) => s.dims?.[d] && s.dims[d] !== "None")
          .map((d) => `${d}=${s.dims![d]}`)
          .join(", ");
        return [
          `STAGE ${i + 1}`,
          `  Task-interaction flow: ${s.flow?.trim() || "(blank)"}`,
          `  Entities of interaction: ${(s.entities ?? []).join(", ") || "(none listed)"}`,
          `  Stress ${s.stress ?? 0}/5 · Error ${s.error ?? 0}/5 · Ease ${s.ease ?? 0}/5`,
          `  Cognition loaded: ${loaded || "(none marked)"}`,
          `  Closure: ${s.closure || "(unmarked)"}${s.closureNote ? ` — ${s.closureNote}` : ""}`,
          `  Design-brief justification: ${s.justification?.trim() || "(blank)"}`,
        ].join("\n");
      }
    );

    const raw = await askClaude({
      system: SYSTEM,
      user: [
        `Artifact / task: ${title || "(untitled)"}`,
        `User archetype: ${archetype || "(unspecified)"}`,
        "",
        `DISCO STAGE TABLE (${rows.length} stage${rows.length === 1 ? "" : "s"})`,
        "",
        rows.join("\n\n") || "(no stages recorded)",
      ].join("\n"),
      maxTokens: 1400,
    });

    const parsed = parseJSONObject<{ summary?: string; dimensions?: string[] }>(raw);

    // Hard-restrict to the six canonical names, deduped, max 4.
    const dimensions = Array.from(
      new Set(
        (parsed.dimensions ?? []).filter((d): d is Dimension =>
          (DIMENSIONS as readonly string[]).includes(d)
        )
      )
    ).slice(0, 4);

    return Response.json({
      summary: String(parsed.summary ?? "").trim(),
      dimensions,
    });
  } catch (e) {
    return jsonError(e);
  }
}
