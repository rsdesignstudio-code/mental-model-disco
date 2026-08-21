"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { AttributionFooter } from "./ReferenceModals";
import { Labeled, TextField } from "./ui";

/**
 * Client-side email check. Deliberately a *first* line of defence only —
 * Supabase validates server-side too, and that is the check that counts.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setError("That does not look like a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setError("Please enter your name — it appears on your submissions.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation is switched off in this Supabase project —
          // the auth listener in the shell takes over from here.
          return;
        }
        setNotice(
          `Check ${mail} for a confirmation link. Click it, then come back and sign in.`
        );
        setMode("signin");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (error) throw error;
        // Signed in — the auth listener in the shell creates the session row.
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        /email not confirmed/i.test(msg)
          ? "Your email is not confirmed yet. Click the link we sent you, then sign in."
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setError("Enter your email address first, then tap Resend.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.resend({ type: "signup", email: mail });
      if (error) throw error;
      setNotice(`Confirmation email resent to ${mail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
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
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "var(--purple-fill)",
              color: "var(--on-fill)",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
            aria-hidden
          >
            M×D
          </div>
          <h1
            style={{
              fontSize: "var(--t-large-title)",
              fontWeight: 700,
              letterSpacing: "-0.022em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Mental Model × DISCO
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", marginTop: 6 }}>
            Cognitive design analysis for design students and faculty.
          </p>
        </div>

        <div className="card p-5">
          <div
            role="group"
            aria-label="Sign in or register"
            className="inline-flex w-full p-0.5 rounded-[10px] mb-5"
            style={{ background: "var(--surface-3)" }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                  setNotice("");
                }}
                aria-pressed={mode === m}
                className="flex-1 rounded-lg"
                style={{
                  minHeight: 38,
                  fontSize: "var(--t-subhead)",
                  fontWeight: mode === m ? 650 : 500,
                  background: mode === m ? "var(--surface)" : "transparent",
                  color: mode === m ? "var(--text)" : "var(--text-2)",
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                }}
              >
                {m === "signin" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="grid gap-4" noValidate>
            {mode === "signup" && (
              <Labeled label="Your name" hint="Appears on your Class Gallery submissions.">
                <TextField
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  placeholder="Anjali Rao"
                  required
                />
              </Labeled>
            )}

            <Labeled label="Email">
              <TextField
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                required
              />
            </Labeled>

            <Labeled
              label="Password"
              hint={mode === "signup" ? "At least 8 characters." : undefined}
            >
              <TextField
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </Labeled>

            {error && (
              <p
                role="alert"
                style={{
                  fontSize: "var(--t-footnote)",
                  color: "var(--rust)",
                  background: "var(--rust-soft)",
                  border: "1px solid var(--rust)",
                  borderRadius: "var(--r-md)",
                  padding: "9px 11px",
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                style={{
                  fontSize: "var(--t-footnote)",
                  color: "var(--green)",
                  background: "var(--green-soft)",
                  border: "1px solid var(--green)",
                  borderRadius: "var(--r-md)",
                  padding: "9px 11px",
                  margin: 0,
                  display: "flex",
                  gap: 8,
                }}
              >
                <Mail size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{notice}</span>
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            onClick={resendConfirmation}
            disabled={busy}
            className="btn btn-plain w-full mt-1"
            style={{ fontWeight: 500, fontSize: "var(--t-footnote)" }}
          >
            Resend confirmation email
          </button>
        </div>

        <p
          style={{
            fontSize: "var(--t-caption)",
            color: "var(--text-3)",
            textAlign: "center",
            marginTop: 14,
          }}
        >
          New accounts must confirm their email address before signing in.
        </p>

        <div className="mt-8">
          <AttributionFooter />
        </div>
      </div>
    </main>
  );
}
