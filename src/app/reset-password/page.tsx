"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { AttributionFooter } from "@/components/ReferenceModals";
import { Labeled, TextField } from "@/components/ui";

/**
 * Landing page for the "reset your password" email.
 *
 * How the link works: Supabase sends the user to its own /auth/v1/verify
 * endpoint, which redirects here carrying a one-time code. The Supabase browser
 * client normally exchanges that code for a session automatically, so most of
 * the time this page just waits for the session to appear. The manual exchange
 * below is the fallback for when the automatic one hasn't run.
 *
 * The recovery link must be opened in the SAME browser that requested it —
 * the code exchange needs a verifier this browser stored when the request was
 * made. Requesting on a laptop and opening the email on a phone will not work,
 * which is why the failure message says so rather than just "invalid link".
 */

type State = "verifying" | "ready" | "invalid" | "saving" | "done";

export default function ResetPasswordPage() {
  // Derived at mount rather than set from inside the effect — it depends only
  // on build-time config, so there is nothing to synchronise.
  const [state, setState] = useState<State>(isSupabaseConfigured ? "verifying" : "invalid");
  const [message, setMessage] = useState(
    isSupabaseConfigured ? "" : "Supabase is not configured for this deployment."
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabase();
    let settled = false;

    // The client fires this once it has processed whatever is in the URL.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (session && !settled) {
          settled = true;
          setState("ready");
        }
      }
    );

    // Fallback: if nothing arrived, do the exchange by hand.
    const timer = setTimeout(async () => {
      if (settled) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        settled = true;
        setState("ready");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const errorDescription =
        params.get("error_description") ??
        new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_description");
      const code = params.get("code");

      if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          settled = true;
          setState("ready");
          return;
        }
        setMessage(error.message);
      } else {
        setMessage("This page needs a reset link to work.");
      }
      setState("invalid");
    }, 1200);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("The two passwords don't match.");
      return;
    }

    setState("saving");
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setState("ready");
      return;
    }
    setState("done");
  }

  return (
    <main
      className="min-h-dvh safe-t safe-b safe-x flex flex-col items-center justify-center px-5 py-10"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        <div className="text-center mb-7">
          <div
            className="mono inline-grid place-items-center mb-4"
            style={{
              width: 60, height: 60, borderRadius: 16,
              background: "var(--purple-fill)", color: "var(--on-fill)",
              fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em",
            }}
            aria-hidden
          >
            M×D
          </div>
          <h1
            style={{
              fontSize: "var(--t-title1)", fontWeight: 700,
              letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0,
            }}
          >
            Choose a new password
          </h1>
        </div>

        <div className="card p-5">
          {state === "verifying" && (
            <p
              className="flex items-center gap-2.5"
              style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", margin: 0 }}
            >
              <Loader2 size={17} className="animate-spin" aria-hidden />
              Checking your link…
            </p>
          )}

          {state === "invalid" && (
            <div>
              <ShieldAlert size={22} aria-hidden style={{ color: "var(--rust)", marginBottom: 8 }} />
              <h2 style={{ fontSize: "var(--t-headline)", fontWeight: 650, margin: "0 0 6px" }}>
                This link didn&apos;t work
              </h2>
              <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", margin: "0 0 10px" }}>
                {message}
              </p>
              <p style={{ color: "var(--text-2)", fontSize: "var(--t-footnote)", margin: "0 0 16px" }}>
                Reset links expire after a short while and can only be used once. They also have
                to be opened in the same browser you requested them from — if you asked on a
                laptop, open the email on that laptop rather than your phone.
              </p>
              <Link href="/" className="btn btn-primary w-full">
                Back to sign in
              </Link>
            </div>
          )}

          {state === "done" && (
            <div>
              <CheckCircle2 size={22} aria-hidden style={{ color: "var(--green)", marginBottom: 8 }} />
              <h2 style={{ fontSize: "var(--t-headline)", fontWeight: 650, margin: "0 0 6px" }}>
                Password changed
              </h2>
              <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", margin: "0 0 16px" }}>
                You&apos;re signed in already. Use the new password next time.
              </p>
              <Link href="/" className="btn btn-primary w-full">
                Open the tool
              </Link>
            </div>
          )}

          {(state === "ready" || state === "saving") && (
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <Labeled label="New password" hint="At least 8 characters.">
                <div className="relative">
                  <TextField
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    autoFocus
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute grid place-items-center"
                    style={{
                      right: 4, top: "50%", transform: "translateY(-50%)",
                      width: 38, height: 38, color: "var(--text-3)", background: "transparent",
                    }}
                  >
                    {show ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                  </button>
                </div>
              </Labeled>

              <Labeled label="Confirm new password">
                <TextField
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </Labeled>

              {message && (
                <p
                  role="alert"
                  style={{
                    fontSize: "var(--t-footnote)", color: "var(--rust)",
                    background: "var(--rust-soft)", border: "1px solid var(--rust)",
                    borderRadius: "var(--r-md)", padding: "9px 11px", margin: 0,
                  }}
                >
                  {message}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={state === "saving"}>
                {state === "saving" && <Loader2 size={16} className="animate-spin" aria-hidden />}
                Save new password
              </button>
            </form>
          )}
        </div>

        <div className="mt-8">
          <AttributionFooter />
        </div>
      </div>
    </main>
  );
}
