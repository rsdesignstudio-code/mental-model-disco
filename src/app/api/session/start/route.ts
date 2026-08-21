import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates the `sessions` row for a login, server-side, so we can attach the
 * coarse location Vercel's edge already knows.
 *
 * PRIVACY: the raw IP address is never read and never stored. Vercel resolves
 * it at the edge and hands us only country / region / city headers, which we
 * persist as-is. Nothing here can be reversed back to an address.
 *
 * SECURITY: this route does NOT hold a service-role key. It builds a Supabase
 * client carrying the caller's own access token, so the insert is still subject
 * to the "own sessions" RLS policy — a user can only create a session row for
 * themselves, exactly as when the client inserted it directly.
 */

const dec = (v: string | null) => {
  if (!v) return null;
  try {
    // Vercel percent-encodes city names ("New%20Delhi").
    const s = decodeURIComponent(v).trim();
    return s.length ? s.slice(0, 120) : null;
  } catch {
    return v.slice(0, 120);
  }
};

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const h = req.headers;
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      client_info: (h.get("user-agent") ?? "").slice(0, 400) || null,
      country: dec(h.get("x-vercel-ip-country")),
      region: dec(h.get("x-vercel-ip-country-region")),
      city: dec(h.get("x-vercel-ip-city")),
      last_active_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[session/start]", error);
    return Response.json({ error: "Could not start a session." }, { status: 500 });
  }

  return Response.json({ id: data.id });
}
