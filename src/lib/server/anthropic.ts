/**
 * SERVER-ONLY. Never import this from a client component.
 *
 * The Anthropic API key is read from ANTHROPIC_API_KEY — deliberately WITHOUT a
 * NEXT_PUBLIC_ prefix, so Next.js will not inline it into the browser bundle.
 * The client never talks to api.anthropic.com; it calls our own /api/* routes.
 */

const API = "https://api.anthropic.com/v1/messages";

/** Override with ANTHROPIC_MODEL in .env.local if you want a different model. */
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export class GenerationError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function askClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new GenerationError(
      "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local (local) or to your Vercel project's Environment Variables (deployed).",
      500
    );
  }

  let res: Response;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: opts.maxTokens ?? 1200,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
      // Do not let a slow model call hang a serverless function to its limit.
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new GenerationError("Could not reach the Anthropic API.", 504);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GenerationError(
      `Anthropic API returned ${res.status}. ${detail.slice(0, 300)}`,
      res.status === 401 ? 500 : 502
    );
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  if (!text) throw new GenerationError("The model returned an empty response.");
  return text;
}

/**
 * Models sometimes wrap JSON in prose or a fenced block. Pull the object out
 * rather than failing the whole generation over a stray backtick.
 */
export function parseJSONObject<T>(raw: string): T {
  const attempts: string[] = [raw];

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1]);

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(raw.slice(first, last + 1));

  for (const a of attempts) {
    try {
      const parsed = JSON.parse(a.trim());
      if (parsed && typeof parsed === "object") return parsed as T;
    } catch {
      /* try the next shape */
    }
  }
  throw new GenerationError("The model did not return valid JSON.");
}

export function jsonError(e: unknown) {
  const err = e instanceof GenerationError ? e : new GenerationError("Generation failed.");
  // Log server-side for debugging; never leak internals to the client.
  console.error("[generate]", e);
  return Response.json({ error: err.message }, { status: err.status });
}
