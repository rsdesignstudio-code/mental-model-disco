/**
 * Pure aggregation for the faculty dashboard. No I/O, no React — everything
 * here takes rows in and gives numbers out, so it can be reasoned about and
 * tested on its own.
 *
 * A deliberate honesty constraint runs through this file: we only collect
 * timestamps the app was already writing, so we can measure *elapsed spans*
 * and *session activity*, not focused attention. Names and labels say so.
 * Nothing here should ever be presented as "time spent working".
 */

export interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  last_active_at: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  client_info: string | null;
}

export interface CaseRow {
  id: string;
  user_id: string;
  session_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "student" | "faculty";
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  submitted_at: string;
}

const MS_MIN = 60_000;
const ms = (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime();

/** A session's measurable span: start → last known activity. */
export function sessionSpanMinutes(s: SessionRow): number | null {
  const end = s.ended_at ?? s.last_active_at;
  if (!end) return null;
  const d = ms(s.started_at, end);
  // Guard against clock skew and rows written before this migration.
  if (!Number.isFinite(d) || d < 0 || d > 12 * 60 * MS_MIN) return null;
  return d / MS_MIN;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function fmtMinutes(m: number | null): string {
  if (m === null) return "—";
  if (m < 1) return "<1m";
  // Round to whole minutes FIRST. Rounding the remainder separately lets
  // 59.6 minutes render as "60m", producing "33h 60m".
  const total = Math.round(m);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const r = total % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / (24 * 60 * MS_MIN);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 14) return `${Math.floor(days)} days ago`;
  return d.toLocaleDateString();
}

/* ---------------- per-student rollup ---------------- */

export interface StudentStat {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty";
  cases: number;
  submissions: number;
  logins: number;
  lastActive: string | null;
  totalSpanMin: number;
  medianCaseElapsedMin: number | null;
  location: string;
}

export function rollUpStudents(
  profiles: ProfileRow[],
  sessions: SessionRow[],
  cases: CaseRow[],
  submissions: SubmissionRow[]
): StudentStat[] {
  const byUser = <T extends { user_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const list = m.get(r.user_id);
      if (list) list.push(r);
      else m.set(r.user_id, [r]);
    }
    return m;
  };

  const sMap = byUser(sessions);
  const cMap = byUser(cases);
  const gMap = byUser(submissions);

  return profiles
    .map((p) => {
      const mySessions = sMap.get(p.id) ?? [];
      const myCases = cMap.get(p.id) ?? [];

      const spans = mySessions.map(sessionSpanMinutes).filter((x): x is number => x !== null);

      const activityStamps = [
        ...mySessions.map((s) => s.ended_at ?? s.last_active_at ?? s.started_at),
        ...myCases.map((c) => c.updated_at),
      ].filter(Boolean) as string[];

      const lastActive = activityStamps.length
        ? activityStamps.reduce((a, b) => (new Date(b) > new Date(a) ? b : a))
        : null;

      // Elapsed calendar time between a case being created and last edited.
      // NOT time on task — a case opened Monday and finished Friday reads as
      // four days. Useful only as a rough sense of how work is spread out.
      const elapsed = myCases
        .map((c) => ms(c.created_at, c.updated_at) / MS_MIN)
        .filter((d) => Number.isFinite(d) && d >= 0);

      const latestLocated = [...mySessions]
        .filter((s) => s.city || s.country)
        .sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at))[0];

      return {
        id: p.id,
        name: p.display_name?.trim() || p.email.split("@")[0],
        email: p.email,
        role: p.role,
        cases: myCases.length,
        submissions: (gMap.get(p.id) ?? []).length,
        logins: mySessions.length,
        lastActive,
        totalSpanMin: spans.reduce((a, b) => a + b, 0),
        medianCaseElapsedMin: median(elapsed),
        location: locationLabel(latestLocated),
      };
    })
    .sort((a, b) => b.cases - a.cases || a.name.localeCompare(b.name));
}

export function locationLabel(s?: SessionRow): string {
  if (!s) return "—";
  const parts = [s.city, s.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

/* ---------------- time series ---------------- */

export interface DayPoint {
  date: string; // yyyy-mm-dd
  sessions: number;
  activeUsers: number;
  casesCreated: number;
}

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** Dense daily series — days with no activity are present as zeroes, so the
 *  line shows real gaps instead of silently closing them up. */
export function dailySeries(
  sessions: SessionRow[],
  cases: CaseRow[],
  days: number
): DayPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const first = keys[0];

  const sessionCount = new Map<string, number>();
  const users = new Map<string, Set<string>>();
  const caseCount = new Map<string, number>();

  for (const s of sessions) {
    const k = dayKey(s.started_at);
    if (k < first) continue;
    sessionCount.set(k, (sessionCount.get(k) ?? 0) + 1);
    const set = users.get(k) ?? new Set<string>();
    set.add(s.user_id);
    users.set(k, set);
  }
  for (const c of cases) {
    const k = dayKey(c.created_at);
    if (k < first) continue;
    caseCount.set(k, (caseCount.get(k) ?? 0) + 1);
  }

  return keys.map((date) => ({
    date,
    sessions: sessionCount.get(date) ?? 0,
    activeUsers: users.get(date)?.size ?? 0,
    casesCreated: caseCount.get(date) ?? 0,
  }));
}

/* ---------------- location rollup ---------------- */

export interface LocationCount {
  label: string;
  sessions: number;
  users: number;
}

export function rollUpLocations(sessions: SessionRow[]): LocationCount[] {
  const m = new Map<string, { sessions: number; users: Set<string> }>();
  for (const s of sessions) {
    const label = locationLabel(s);
    if (label === "—") continue;
    const e = m.get(label) ?? { sessions: 0, users: new Set<string>() };
    e.sessions++;
    e.users.add(s.user_id);
    m.set(label, e);
  }
  return [...m.entries()]
    .map(([label, e]) => ({ label, sessions: e.sessions, users: e.users.size }))
    .sort((a, b) => b.sessions - a.sessions);
}

/** Sessions with no geo at all — always report this rather than quietly
 *  dropping them, or the location chart implies more coverage than it has. */
export function unlocatedSessions(sessions: SessionRow[]): number {
  return sessions.filter((s) => !s.city && !s.country).length;
}

/* ---------------- headline figures ---------------- */

export interface Totals {
  users: number;
  activeLast7: number;
  cases: number;
  submissions: number;
  sessions: number;
  medianSessionMin: number | null;
  spanCoverage: number; // 0–1: share of sessions with a measurable span
}

export function totals(
  profiles: ProfileRow[],
  sessions: SessionRow[],
  cases: CaseRow[],
  submissions: SubmissionRow[]
): Totals {
  const weekAgo = Date.now() - 7 * 24 * 60 * MS_MIN;
  const active = new Set(
    sessions.filter((s) => +new Date(s.started_at) >= weekAgo).map((s) => s.user_id)
  );
  const spans = sessions.map(sessionSpanMinutes).filter((x): x is number => x !== null);

  return {
    users: profiles.length,
    activeLast7: active.size,
    cases: cases.length,
    submissions: submissions.length,
    sessions: sessions.length,
    medianSessionMin: median(spans),
    spanCoverage: sessions.length ? spans.length / sessions.length : 0,
  };
}

/** Exports the per-student table as CSV — the table view doubles as the
 *  accessibility relief channel for the charts. */
export function studentsToCSV(rows: StudentStat[]): string {
  const head = [
    "Name", "Email", "Role", "Case studies", "Gallery submissions",
    "Logins", "Last active", "Total session time (min)",
    "Median case elapsed span (min)", "Last location",
  ];
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) =>
    [
      r.name, r.email, r.role, r.cases, r.submissions, r.logins,
      r.lastActive ? new Date(r.lastActive).toISOString() : "",
      Math.round(r.totalSpanMin),
      r.medianCaseElapsedMin === null ? "" : Math.round(r.medianCaseElapsedMin),
      r.location,
    ].map(cell).join(",")
  );
  return "﻿" + [head.join(","), ...body].join("\n");
}
