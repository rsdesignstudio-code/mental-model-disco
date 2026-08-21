import { askClaude, jsonError, parseJSONObject } from "@/lib/server/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a cognitive-ergonomics assistant working inside a design-school tool that combines the Mental Model Mapper framework with 7-Step DISCO Cognitive Task Analysis.

Your job: write the "Design Vision" — a narrative synthesis of what the user needs, wants, wishes for, expects, and finds aesthetically right, based only on the user-model and expectation fields the student has filled in.

Rules:
- 120 to 220 words. One to three paragraphs of flowing prose. No headings, no bullet points, no markdown.
- Write about the USER, in the third person. Do not address the student, do not describe the framework, do not give the student instructions.
- Ground every claim in the supplied fields. Where a field is blank, stay silent about it rather than inventing detail.
- Plain, precise, unhurried language. No marketing register, no exclamation marks, no filler like "in today's fast-paced world".
- This is a first draft a designer will edit — be specific enough to be worth editing.

Respond with a single JSON object and nothing else, in exactly this shape:
{"vision": "..."}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, archetype, userModel, vision } = body ?? {};

    const f = (label: string, v: unknown) =>
      String(v ?? "").trim() ? `${label}: ${String(v).trim()}` : null;

    const lines = [
      f("Artifact / task", title),
      f("User archetype", archetype),
      "",
      "USER MODEL",
      f("Demographic & psychographic profile", userModel?.demographic),
      f("User knowledge", userModel?.knowledge),
      f("User abilities", userModel?.abilities),
      f("User mood", userModel?.mood),
      f("User environment", userModel?.environment),
      "",
      "METAPHOR, EXPECTATIONS & AESTHETIC WISHES",
      f("Metaphor / analogy", vision?.metaphor),
      f("Rich description", vision?.rich),
      f("Expectations before use", vision?.expectations),
      f("Needs / wants / wishes", vision?.needs),
      f("Aesthetic / visual preferences", vision?.aesthetic),
    ].filter(Boolean);

    const raw = await askClaude({
      system: SYSTEM,
      user: `Write the Design Vision from these notes.\n\n${lines.join("\n")}`,
      maxTokens: 900,
    });

    const parsed = parseJSONObject<{ vision?: string }>(raw);
    return Response.json({ vision: String(parsed.vision ?? "").trim() });
  } catch (e) {
    return jsonError(e);
  }
}
