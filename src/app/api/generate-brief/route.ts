import { askClaude, jsonError, parseJSONObject } from "@/lib/server/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a cognitive-ergonomics assistant working inside a design-school tool. Two analyses have already been completed and edited by the student:

- a DESIGN VISION, from the Mental Model Mapper — what the user needs, wants, wishes for, expects and finds aesthetically right;
- a SUMMARY & DESIGN CONSIDERATIONS, from a 7-Step DISCO Cognitive Task Analysis — where cognitive friction concentrates and what the audit recommends, plus the cognitive dimensions flagged as most needing attention.

Synthesise both into ONE Final Cognitive Design Brief: the complete design requirement handed to concept development.

Rules:
- 180 to 300 words. Flowing prose in two to four paragraphs. No headings, no bullet points, no markdown.
- Actionable and specific. State what the concept must do, not what the analysis found. A reader who has not seen the two source analyses should still be able to act on it.
- Reconcile the two halves explicitly: where the user's expectation and the task audit point at the same problem, say so; where they conflict, name the tension and say which should govern.
- Name the flagged cognitive dimensions and tie each to a concrete design requirement.
- Do not invent findings that appear in neither source. Do not pad with generalities about good design.

Respond with a single JSON object and nothing else, in exactly this shape:
{"brief": "..."}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, archetype, visionWriteup, summary, dimensions, directions } = body ?? {};

    const dirs = (Array.isArray(directions) ? directions : [])
      .slice(0, 40)
      .map((d: { source?: string; index?: number; text?: string }) =>
        `- [${d.source ?? "?"} ${d.index ?? ""}] ${String(d.text ?? "").trim()}`
      )
      .filter((l: string) => l.length > 8);

    const raw = await askClaude({
      system: SYSTEM,
      user: [
        `Artifact / task: ${title || "(untitled)"}`,
        `User archetype: ${archetype || "(unspecified)"}`,
        "",
        "DESIGN VISION (from Mental Model)",
        String(visionWriteup ?? "").trim() || "(not written)",
        "",
        "SUMMARY & DESIGN CONSIDERATIONS (from DISCO)",
        String(summary ?? "").trim() || "(not written)",
        "",
        `COGNITIVE DIMENSIONS FLAGGED: ${
          Array.isArray(dimensions) && dimensions.length ? dimensions.join(", ") : "(none flagged)"
        }`,
        "",
        "COMBINED DESIGN DIRECTIONS RECORDED BY THE STUDENT",
        dirs.length ? dirs.join("\n") : "(none recorded)",
      ].join("\n"),
      maxTokens: 1200,
    });

    const parsed = parseJSONObject<{ brief?: string }>(raw);
    return Response.json({ brief: String(parsed.brief ?? "").trim() });
  } catch (e) {
    return jsonError(e);
  }
}
