"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Only the URL and the *anon* key are exposed here —
 * both are designed to be public and are protected by Row Level Security.
 * The Anthropic key is NEVER referenced in client code; see src/app/api/*.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  if (!cached) cached = createBrowserClient(url!, anon!);
  return cached;
}
