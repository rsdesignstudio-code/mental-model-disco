import AppShell from "@/components/AppShell";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  if (!configured) {
    return (
      <main
        className="min-h-dvh grid place-items-center px-6 safe-t safe-b"
        style={{ background: "var(--bg)" }}
      >
        <div className="card p-6" style={{ maxWidth: 560 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Setup incomplete
          </p>
          <h1 style={{ fontSize: "var(--t-title1)", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Connect Supabase to continue
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)" }}>
            Create a file called <code className="mono">.env.local</code> in the project root
            with the values from your Supabase project (Project Settings → API), then restart
            the dev server:
          </p>
          <pre
            className="mono"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--separator)",
              borderRadius: "var(--r-md)",
              padding: 12,
              fontSize: "var(--t-caption)",
              overflowX: "auto",
              margin: "12px 0",
            }}
          >{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
ANTHROPIC_API_KEY=sk-ant-...`}</pre>
          <p style={{ color: "var(--text-3)", fontSize: "var(--t-caption)", margin: 0 }}>
            Full instructions are in SETUP.md. <code className="mono">ANTHROPIC_API_KEY</code>{" "}
            deliberately has no <code className="mono">NEXT_PUBLIC_</code> prefix — that is what
            keeps it out of the browser bundle.
          </p>
        </div>
      </main>
    );
  }

  return <AppShell />;
}
