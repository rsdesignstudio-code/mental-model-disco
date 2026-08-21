"use client";

import { ArrowLeft, Download, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { downloadBlob } from "@/lib/exporters";
import {
  dailySeries,
  fmtMinutes,
  fmtWhen,
  rollUpLocations,
  rollUpStudents,
  studentsToCSV,
  totals,
  unlocatedSessions,
  type CaseRow,
  type ProfileRow,
  type SessionRow,
  type SubmissionRow,
} from "@/lib/analytics";
import { BarChart, ChartCard, Legend, LineChart, StatTile } from "@/components/admin/Charts";
import { Segmented } from "@/components/ui";

type Load = "checking" | "denied" | "loading" | "ready" | "error";
type Range = "14" | "30" | "90";

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";

export default function AdminPage() {
  const [state, setState] = useState<Load>("checking");
  const [message, setMessage] = useState("");
  const [range, setRange] = useState<Range>("30");

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState("error");
      setMessage("Supabase is not configured for this deployment.");
      return;
    }
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState("denied");
      setMessage("You need to sign in first.");
      return;
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!me || me.role !== "faculty") {
      setState("denied");
      setMessage("This page is for faculty accounts only.");
      return;
    }

    setState("loading");

    // Row Level Security is what actually enforces access here — these four
    // queries return only the caller's own rows unless is_faculty() is true in
    // Postgres. The role check above is convenience, not the security boundary.
    const [p, s, c, g] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,role,created_at"),
      supabase
        .from("sessions")
        .select("id,user_id,started_at,ended_at,last_active_at,country,region,city,client_info")
        .order("started_at", { ascending: false }),
      supabase.from("cases").select("id,user_id,session_id,title,created_at,updated_at"),
      supabase.from("gallery_submissions").select("id,user_id,submitted_at"),
    ]);

    if (p.error || s.error || c.error || g.error) {
      setState("error");
      setMessage(
        p.error?.message ??
          s.error?.message ??
          c.error?.message ??
          g.error?.message ??
          "Query failed."
      );
      return;
    }

    setProfiles((p.data ?? []) as ProfileRow[]);
    setSessions((s.data ?? []) as SessionRow[]);
    setCases((c.data ?? []) as CaseRow[]);
    setSubs((g.data ?? []) as SubmissionRow[]);
    setState("ready");
  }, []);

  useEffect(() => {
    // Unlike the tool itself, this page has no user action to hang the first
    // fetch on — opening it IS the request. A mount-time fetch is the correct
    // shape here, so the cascading-render rule is suppressed deliberately
    // rather than worked around.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const t = useMemo(() => totals(profiles, sessions, cases, subs), [profiles, sessions, cases, subs]);
  const students = useMemo(
    () => rollUpStudents(profiles, sessions, cases, subs),
    [profiles, sessions, cases, subs]
  );
  const days = useMemo(
    () => dailySeries(sessions, cases, Number(range)),
    [sessions, cases, range]
  );
  const locations = useMemo(() => rollUpLocations(sessions), [sessions]);
  const unlocated = useMemo(() => unlocatedSessions(sessions), [sessions]);

  const dayLabels = days.map((d) =>
    new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    })
  );

  /* ---------------- gates ---------------- */

  if (state === "checking" || state === "loading") {
    return (
      <main className="min-h-dvh grid place-items-center" style={{ background: "var(--bg)" }}>
        <Loader2 size={26} className="animate-spin" aria-label="Loading" style={{ color: "var(--text-3)" }} />
      </main>
    );
  }

  if (state === "denied" || state === "error") {
    return (
      <main
        className="min-h-dvh grid place-items-center px-6 safe-t safe-b"
        style={{ background: "var(--bg)" }}
      >
        <div className="card p-6" style={{ maxWidth: 460 }}>
          <ShieldAlert size={22} aria-hidden style={{ color: "var(--rust)", marginBottom: 8 }} />
          <h1 style={{ fontSize: "var(--t-title2)", fontWeight: 700, margin: "0 0 8px" }}>
            {state === "denied" ? "Not available" : "Could not load"}
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", margin: "0 0 16px" }}>
            {message}
          </p>
          <Link href="/" className="btn btn-quiet">
            <ArrowLeft size={16} aria-hidden />
            Back to the tool
          </Link>
        </div>
      </main>
    );
  }

  /* ---------------- dashboard ---------------- */

  const topStudents = students.filter((s) => s.cases > 0).slice(0, 10);
  const spanPct = Math.round(t.spanCoverage * 100);

  return (
    <main
      className="min-h-dvh safe-t safe-b safe-x px-4 py-5"
      style={{ background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header className="flex flex-wrap items-end gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <p className="eyebrow" style={{ marginBottom: 2 }}>Faculty · usage analytics</p>
            <h1
              style={{
                fontSize: "var(--t-large-title)",
                fontWeight: 700,
                letterSpacing: "-0.022em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Mental Model × DISCO
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-quiet">
              <ArrowLeft size={16} aria-hidden />
              Tool
            </Link>
            <button type="button" className="btn btn-quiet" onClick={() => void load()}>
              <RefreshCw size={15} aria-hidden />
              Refresh
            </button>
          </div>
        </header>

        {/* KPI row */}
        <div
          className="grid gap-2.5 mb-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))" }}
        >
          <StatTile label="Registered users" value={t.users} />
          <StatTile label="Active last 7 days" value={t.activeLast7} note={`of ${t.users}`} />
          <StatTile label="Case studies" value={t.cases} />
          <StatTile label="Gallery submissions" value={t.submissions} />
          <StatTile label="Logins" value={t.sessions} />
          <StatTile
            label="Median session"
            value={fmtMinutes(t.medianSessionMin)}
            note={spanPct < 100 ? `measurable for ${spanPct}% of logins` : undefined}
          />
        </div>

        <div className="grid gap-3">
          {/* Activity over time — two series, so a legend is always present */}
          <ChartCard
            title="Activity over time"
            blurb="Logins and how many distinct people were behind them."
            right={
              <Segmented
                label="Time range"
                value={range}
                onChange={(v) => setRange(v)}
                options={[
                  { value: "14" as Range, label: "14d" },
                  { value: "30" as Range, label: "30d" },
                  { value: "90" as Range, label: "90d" },
                ]}
              />
            }
          >
            <div className="mb-2">
              <Legend
                items={[
                  { label: "Logins", color: C1 },
                  { label: "Distinct users", color: C2 },
                ]}
              />
            </div>
            <LineChart
              labels={dayLabels}
              yLabel="Logins and distinct users per day"
              series={[
                { key: "s", label: "Logins", color: C1, values: days.map((d) => d.sessions) },
                { key: "u", label: "Distinct users", color: C2, values: days.map((d) => d.activeUsers) },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Case studies created"
            blurb={`New case studies per day, last ${range} days.`}
          >
            <LineChart
              labels={dayLabels}
              yLabel="Case studies created per day"
              series={[
                { key: "c", label: "Created", color: C1, values: days.map((d) => d.casesCreated) },
              ]}
            />
          </ChartCard>

          <div className="grid gap-3 md:grid-cols-2">
            <ChartCard
              title="Case studies per student"
              blurb={topStudents.length >= 10 ? "Top 10 — full list in the table below." : "Everyone who has started at least one."}
            >
              <BarChart
                data={topStudents.map((s) => ({
                  label: s.name,
                  value: s.cases,
                  sub: `${s.submissions} submitted · ${s.logins} logins · last active ${fmtWhen(s.lastActive)}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Where people sign in from"
              blurb={
                unlocated > 0
                  ? `${unlocated} login${unlocated === 1 ? "" : "s"} with no location recorded — see the note below.`
                  : "City-level, from the edge. No IP address is stored."
              }
            >
              <BarChart
                data={locations.slice(0, 8).map((l) => ({
                  label: l.label,
                  value: l.sessions,
                  sub: `${l.users} distinct ${l.users === 1 ? "person" : "people"}`,
                }))}
              />
            </ChartCard>
          </div>

          {/* Table view — also the accessibility relief channel for the charts */}
          <section className="card p-4">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h2 style={{ fontSize: "var(--t-headline)", fontWeight: 650, margin: 0 }}>
                  Every user
                </h2>
                <p style={{ fontSize: "var(--t-caption)", color: "var(--text-2)", margin: "2px 0 0" }}>
                  Every number in the charts above, in full.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() =>
                  downloadBlob(
                    `mm-disco-usage-${new Date().toISOString().slice(0, 10)}.csv`,
                    "text/csv;charset=utf-8",
                    studentsToCSV(students)
                  )
                }
              >
                <Download size={15} aria-hidden />
                Export CSV
              </button>
            </div>

            <div className="disco-wrap" style={{ maxHeight: 520, overflowY: "auto" }}>
              <table className="disco" style={{ minWidth: 880 }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ minWidth: 150 }}>Name</th>
                    <th scope="col" style={{ minWidth: 180 }}>Email</th>
                    <th scope="col">Cases</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Logins</th>
                    <th scope="col" style={{ minWidth: 110 }}>Session time</th>
                    <th scope="col" style={{ minWidth: 120 }}>Median case span</th>
                    <th scope="col" style={{ minWidth: 110 }}>Last active</th>
                    <th scope="col" style={{ minWidth: 130 }}>Last location</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontSize: "var(--t-footnote)" }}>
                        {s.name}
                        {s.role === "faculty" && (
                          <span className="tag mono" style={{ marginLeft: 6, fontSize: 9, padding: "0 5px" }}>
                            faculty
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 10, color: "var(--text-2)" }}>{s.email}</td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>{s.cases}</td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>{s.submissions}</td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>{s.logins}</td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>
                        {fmtMinutes(s.totalSpanMin || null)}
                      </td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>
                        {fmtMinutes(s.medianCaseElapsedMin)}
                      </td>
                      <td className="mono" style={{ fontSize: "var(--t-footnote)" }}>
                        {fmtWhen(s.lastActive)}
                      </td>
                      <td style={{ fontSize: "var(--t-footnote)", color: "var(--text-2)" }}>
                        {s.location}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* What these numbers do and do not mean */}
          <section className="card p-4" style={{ background: "var(--surface-2)" }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>How to read this</p>
            <ul
              className="grid gap-2 m-0 p-0"
              style={{ listStyle: "none", fontSize: "var(--t-footnote)", color: "var(--text-2)" }}
            >
              <li>
                <strong style={{ color: "var(--text)" }}>Session time</strong> is start of login to
                the last save made during it. It is wall-clock presence, not focused attention —
                a session left open over lunch counts the lunch. Sessions with no saved work have
                no measurable span at all, which is why the median above is drawn from{" "}
                {spanPct}% of logins.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Median case span</strong> is the elapsed
                calendar time between a case study being created and last edited. A case started
                on Monday and finished on Friday reads as four days. It says something about how
                work is spread out, and nothing about how long it took.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Location</strong> is resolved at the edge
                by the hosting platform and stored as country, region and city only. The IP address
                itself is never read into the database. Coverage is partial — VPNs, some mobile
                networks and any login made before this feature shipped resolve to nothing, and
                those appear as “—”.
              </li>
              <li>
                Under India&apos;s DPDP Act this is personal data about identifiable students.
                Tell them it is collected — there is a line in the tool&apos;s About panel — and
                keep exports off shared drives.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
