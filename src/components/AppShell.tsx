"use client";

import {
  BarChart3,
  Brain,
  Compass,
  Download,
  FileText,
  Info,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Ruler,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";
import {
  emptyDisco,
  emptyMM,
  normaliseDisco,
  normaliseMM,
  todayISO,
} from "@/lib/defaults";
import { exportCaseJSON } from "@/lib/exporters";
import type {
  A11ySettings,
  CaseStudy,
  Disco,
  GallerySubmission,
  MentalModel,
  Profile,
  TabKey,
} from "@/lib/types";
import AccessibilityPanel, {
  DEFAULT_A11Y,
  applyA11y,
  loadA11y,
  persistA11y,
} from "./AccessibilityPanel";
import AuthScreen from "./AuthScreen";
import { AboutModal, AttributionFooter, FociModal, PrinciplesModal } from "./ReferenceModals";
import { Labeled, TextField } from "./ui";
import MentalModelTab from "./tabs/MentalModelTab";
import TaskAnalysisTab from "./tabs/TaskAnalysisTab";
import FinalBriefTab from "./tabs/FinalBriefTab";
import GalleryTab from "./tabs/GalleryTab";

const SESSION_ROW_KEY = "mmdisco:sessionRowId";

const TABS: { key: TabKey; n: string; label: string; short: string; Icon: typeof Brain }[] = [
  { key: "mm", n: "①", label: "Mental Model", short: "Mental Model", Icon: Brain },
  { key: "disco", n: "②", label: "Task Analysis", short: "Task Analysis", Icon: Table2 },
  { key: "brief", n: "③", label: "Final Cognitive Design Brief", short: "Final Brief", Icon: FileText },
  { key: "gallery", n: "④", label: "Class Gallery", short: "Gallery", Icon: LayoutGrid },
];

type Save = { kind: "idle" | "busy" | "ok" | "error"; msg?: string };

/** Turns a raw Supabase row into a fully-populated CaseStudy. */
const hydrate = (row: Record<string, unknown>): CaseStudy => ({
  id: row.id as string,
  user_id: row.user_id as string,
  session_id: (row.session_id as string) ?? null,
  title: (row.title as string) ?? "",
  archetype: (row.archetype as string) ?? "",
  student: (row.student as string) ?? "",
  case_date: (row.case_date as string) ?? null,
  mm: normaliseMM(row.mm),
  disco: normaliseDisco(row.disco),
  final_cognitive_brief: (row.final_cognitive_brief as string) ?? "",
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export default function AppShell() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionRowId, setSessionRowId] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("mm");

  const [submissions, setSubmissions] = useState<GallerySubmission[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [submitState, setSubmitState] = useState<Save>({ kind: "idle" });

  const [save, setSave] = useState<Save>({ kind: "idle" });
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<null | "about" | "foci" | "principles">(null);
  const [a11y, setA11y] = useState<A11ySettings>(DEFAULT_A11Y);

  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPing = useRef(0);

  const active = cases.find((c) => c.id === activeId) ?? null;

  /* ---------------- auth + session identity ---------------- */

  const ensureSessionRow = useCallback(async (force: boolean) => {
    if (!force) {
      const existing = sessionStorage.getItem(SESSION_ROW_KEY);
      if (existing) {
        setSessionRowId(existing);
        return existing;
      }
    }

    // Created server-side (/api/session/start) rather than straight from the
    // browser, so the row can carry the coarse country/city the edge already
    // knows. No IP address is read here or stored there.
    try {
      const { data: sess } = await getSupabase().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return null;

      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.id) throw new Error(json.error ?? "no id returned");

      sessionStorage.setItem(SESSION_ROW_KEY, json.id);
      setSessionRowId(json.id);
      return json.id as string;
    } catch (e) {
      // Session tracking is telemetry, not function. Never block sign-in on it.
      console.warn("Could not create a session row:", e);
      return null;
    }
  }, []);

  const loadProfile = useCallback(async (u: User) => {
    const supabase = getSupabase();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    // Fallback if the auth.users trigger is not installed yet.
    const fallback = {
      id: u.id,
      email: u.email ?? "",
      display_name:
        (u.user_metadata?.display_name as string) ?? (u.email ?? "").split("@")[0],
      role: "student" as const,
    };
    const { data: made } = await supabase
      .from("profiles")
      .upsert(fallback)
      .select("*")
      .maybeSingle();
    const p = (made as Profile) ?? { ...fallback, created_at: new Date().toISOString() };
    setProfile(p);
    return p;
  }, []);

  const loadCases = useCallback(async (uid: string) => {
    const { data, error } = await getSupabase()
      .from("cases")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) {
      setSave({ kind: "error", msg: "Could not load your case studies." });
      return;
    }
    const list = (data ?? []).map(hydrate);
    setCases(list);
    setActiveId((cur) => cur ?? list[0]?.id ?? null);
  }, []);

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    const { data, error } = await getSupabase()
      .from("gallery_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (!error) setSubmissions((data ?? []) as GallerySubmission[]);
    setGalleryLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    const handle = async (event: string, session: Session | null) => {
      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setProfile(null);
        setCases([]);
        setActiveId(null);
        setSessionRowId(null);
        sessionStorage.removeItem(SESSION_ROW_KEY);
        setBooting(false);
        return;
      }

      // A brand-new sign-in always gets its own sessions row. A page reload or a
      // silent token refresh reuses the row already created for this visit.
      await ensureSessionRow(event === "SIGNED_IN");

      const stored = loadA11y(u.id);
      setA11y(stored);
      applyA11y(stored);

      const p = await loadProfile(u);
      await loadCases(p.id);
      setBooting(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        void handle(event, session);
      }
    );

    // Covers the case where onAuthStateChange has already fired before mount.
    void supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!data.session) setBooting(false);
      });

    return () => sub.subscription.unsubscribe();
  }, [ensureSessionRow, loadProfile, loadCases]);

  /* ---------------- accessibility settings ---------------- */

  const updateA11y = (s: A11ySettings) => {
    setA11y(s);
    applyA11y(s);
    if (user) persistA11y(user.id, s);
  };

  /* ---------------- cases ---------------- */

  /** The Class Gallery is only fetched when the user actually opens that tab. */
  const goTab = (key: TabKey) => {
    setTab(key);
    if (key === "gallery") void loadGallery();
  };

  const newCase = async () => {
    if (!profile) return;
    setSave({ kind: "busy", msg: "Creating…" });
    const { data, error } = await getSupabase()
      .from("cases")
      .insert({
        user_id: profile.id,
        session_id: sessionRowId,
        title: "",
        archetype: "",
        student: profile.display_name ?? "",
        case_date: todayISO(),
        mm: emptyMM(),
        disco: emptyDisco(),
        final_cognitive_brief: "",
      })
      .select("*")
      .single();

    if (error || !data) {
      setSave({ kind: "error", msg: "Could not create a case study." });
      return;
    }
    const c = hydrate(data);
    setCases((prev) => [c, ...prev]);
    setActiveId(c.id);
    setTab("mm");
    setDrawer(false);
    setSave({ kind: "ok", msg: "Created" });
  };

  const persist = useCallback(
    async (c: CaseStudy) => {
      setSave({ kind: "busy", msg: "Saving…" });
      const { error } = await getSupabase()
        .from("cases")
        .update({
          session_id: sessionRowId ?? c.session_id,
          title: c.title,
          archetype: c.archetype,
          student: c.student,
          case_date: c.case_date || null,
          mm: c.mm,
          disco: c.disco,
          final_cognitive_brief: c.final_cognitive_brief,
        })
        .eq("id", c.id);
      setSave(
        error
          ? { kind: "error", msg: "Save failed — your edits are still on screen." }
          : { kind: "ok", msg: `Saved ${new Date().toLocaleTimeString()}` }
      );

      // Piggyback on the save the user already triggered to record that this
      // session was still active. Throttled to once every two minutes, and
      // there is no background timer — nothing is recorded while idle.
      const now = Date.now();
      if (sessionRowId && !error && now - lastPing.current > 120_000) {
        lastPing.current = now;
        void getSupabase()
          .from("sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", sessionRowId);
      }
    },
    [sessionRowId]
  );

  /** Optimistic local update, then a debounced write to Supabase. */
  const patchCase = useCallback(
    (patch: Partial<CaseStudy>) => {
      if (!activeId) return;
      setCases((prev) => {
        const next = prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c));
        const updated = next.find((c) => c.id === activeId);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        if (updated) saveTimer.current = setTimeout(() => void persist(updated), 800);
        return next;
      });
    },
    [activeId, persist]
  );

  // Flush any pending save if the tab is being hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && active) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void persist(active);
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [active, persist]);

  const deleteCase = async (id: string) => {
    const c = cases.find((x) => x.id === id);
    if (!confirm(`Delete "${c?.title || "this case study"}"? This cannot be undone.`)) return;
    const { error } = await getSupabase().from("cases").delete().eq("id", id);
    if (error) {
      setSave({ kind: "error", msg: "Could not delete." });
      return;
    }
    setCases((prev) => {
      const next = prev.filter((x) => x.id !== id);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  };

  /* ---------------- save / load copy ---------------- */

  const loadCopy = async (file: File) => {
    if (!profile) return;
    try {
      const parsed = JSON.parse(await file.text());
      const src = (parsed.case ?? parsed) as Partial<CaseStudy>;
      const { data, error } = await getSupabase()
        .from("cases")
        .insert({
          user_id: profile.id,
          session_id: sessionRowId,
          title: src.title ? `${src.title} (imported)` : "Imported case study",
          archetype: src.archetype ?? "",
          student: src.student ?? profile.display_name ?? "",
          case_date: src.case_date ?? todayISO(),
          mm: normaliseMM(src.mm),
          disco: normaliseDisco(src.disco),
          final_cognitive_brief: src.final_cognitive_brief ?? "",
        })
        .select("*")
        .single();
      if (error || !data) throw error ?? new Error("insert failed");
      const c = hydrate(data);
      setCases((prev) => [c, ...prev]);
      setActiveId(c.id);
      setDrawer(false);
      setSave({ kind: "ok", msg: "Copy loaded" });
    } catch {
      setSave({ kind: "error", msg: "That file is not a valid case study export." });
    }
  };

  /* ---------------- gallery ---------------- */

  const submitToGallery = async () => {
    if (!active || !profile) return;
    if (!active.title.trim()) {
      setSubmitState({ kind: "error", msg: "Give the case study a title first." });
      return;
    }
    setSubmitState({ kind: "busy", msg: "Submitting…" });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(active);

    const { error } = await getSupabase().from("gallery_submissions").insert({
      case_id: active.id,
      user_id: profile.id,
      student: active.student || profile.display_name,
      title: active.title,
      archetype: active.archetype,
      data: active,
    });
    setSubmitState(
      error
        ? { kind: "error", msg: "Submission failed — try again." }
        : { kind: "ok", msg: "Submitted to the Class Gallery." }
    );
    if (!error) void loadGallery();
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await getSupabase().from("gallery_submissions").delete().eq("id", id);
    if (!error) setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  /* ---------------- sign out ---------------- */

  const signOut = async () => {
    const supabase = getSupabase();
    if (sessionRowId) {
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionRowId);
    }
    sessionStorage.removeItem(SESSION_ROW_KEY);
    await supabase.auth.signOut();
  };

  /* ---------------- render ---------------- */

  const caseList = useMemo(
    () =>
      cases.map((c) => ({
        id: c.id,
        title: c.title.trim() || "Untitled case study",
        sub: [c.archetype.trim(), c.case_date].filter(Boolean).join(" · "),
      })),
    [cases]
  );

  if (booting) {
    return (
      <div className="min-h-dvh grid place-items-center" style={{ background: "var(--bg)" }}>
        <Loader2 size={26} className="animate-spin" aria-label="Loading" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="mono grid place-items-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--purple-fill)",
              color: "var(--on-fill)",
              fontSize: 13,
              fontWeight: 700,
            }}
            aria-hidden
          >
            M×D
          </span>
          <span className="min-w-0">
            <span
              className="block truncate"
              style={{ fontSize: "var(--t-headline)", fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              Mental Model × DISCO
            </span>
            <span className="mono block truncate" style={{ fontSize: 10, color: "var(--text-3)" }}>
              {profile?.display_name || profile?.email}
              {profile?.role === "faculty" ? " · FACULTY" : ""}
            </span>
          </span>
          <button
            type="button"
            className="lg:hidden tap grid place-items-center ml-auto rounded-full"
            style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, background: "var(--surface-2)" }}
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="px-3 grid gap-1.5">
        <button type="button" className="btn btn-primary w-full" onClick={newCase}>
          <Plus size={16} aria-hidden />
          New case study
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="btn btn-quiet"
            style={{ fontSize: "var(--t-footnote)", minHeight: 40 }}
            disabled={!active}
            onClick={() => active && exportCaseJSON(active)}
          >
            <Download size={14} aria-hidden />
            Save copy
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            style={{ fontSize: "var(--t-footnote)", minHeight: 40 }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} aria-hidden />
            Load copy
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadCopy(f);
            e.target.value = "";
          }}
        />
      </div>

      <p className="eyebrow px-4 pt-4 pb-1.5">Your case studies · {caseList.length}</p>
      <nav className="flex-1 scroll-y px-2 pb-2" aria-label="Case studies">
        {caseList.length === 0 ? (
          <p className="px-2" style={{ fontSize: "var(--t-footnote)", color: "var(--text-3)", fontStyle: "italic" }}>
            None yet — create one above.
          </p>
        ) : (
          <ul className="grid gap-0.5 m-0 p-0" style={{ listStyle: "none" }}>
            {caseList.map((c) => {
              const on = c.id === activeId;
              return (
                <li key={c.id} className="flex items-stretch rounded-[10px] overflow-hidden"
                    style={{ background: on ? "var(--surface-3)" : "transparent" }}>
                  <button
                    type="button"
                    className="flex-1 text-left px-2.5 py-2 min-w-0"
                    style={{ background: "transparent", color: "var(--text)" }}
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      setActiveId(c.id);
                      setDrawer(false);
                    }}
                  >
                    <span
                      className="block truncate"
                      style={{ fontSize: "var(--t-subhead)", fontWeight: on ? 650 : 500 }}
                    >
                      {c.title}
                    </span>
                    {c.sub && (
                      <span className="mono block truncate" style={{ fontSize: 10, color: "var(--text-3)" }}>
                        {c.sub}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.title}`}
                    className="grid place-items-center px-2"
                    style={{ color: "var(--text-3)" }}
                    onClick={() => void deleteCase(c.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="px-2 pb-2 pt-1" style={{ borderTop: "1px solid var(--separator)" }}>
        <AccessibilityPanel settings={a11y} onChange={updateA11y} />
        {[
          { k: "about" as const, Icon: Info, label: "About Mental Model × DISCO" },
          { k: "foci" as const, Icon: Compass, label: "5 Foci of Design" },
          { k: "principles" as const, Icon: Ruler, label: "14 Universal Principles" },
        ].map(({ k, Icon, label }) => (
          <button
            key={k}
            type="button"
            className="tap w-full flex items-center gap-2.5 px-3 rounded-[10px]"
            style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", background: "transparent" }}
            onClick={() => {
              setModal(k);
              setDrawer(false);
            }}
          >
            <Icon size={17} aria-hidden />
            <span className="text-left">{label}</span>
          </button>
        ))}
        {profile?.role === "faculty" && (
          <a
            href="/admin"
            className="tap w-full flex items-center gap-2.5 px-3 rounded-[10px]"
            style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", background: "transparent" }}
          >
            <BarChart3 size={17} aria-hidden />
            <span className="text-left">Usage analytics</span>
          </a>
        )}
        <button
          type="button"
          className="tap w-full flex items-center gap-2.5 px-3 rounded-[10px]"
          style={{ color: "var(--rust)", fontSize: "var(--t-subhead)", background: "transparent" }}
          onClick={signOut}
        >
          <LogOut size={17} aria-hidden />
          <span className="text-left">Sign out</span>
        </button>
        <div className="px-3 pt-2">
          <AttributionFooter compact />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 flex-col safe-t safe-b"
        style={{
          width: 288,
          background: "var(--surface)",
          borderRight: "1px solid var(--separator)",
          zIndex: 30,
        }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden backdrop" onClick={() => setDrawer(false)} role="presentation">
          <div
            className="fixed inset-y-0 left-0 flex flex-col safe-t safe-b"
            style={{
              width: "min(88vw, 320px)",
              background: "var(--surface)",
              borderRight: "1px solid var(--separator)",
              animation: "sheet-in var(--dur) var(--sheet-ease)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Menu"
          >
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-[288px]">
        {/* Top bar — case-level fields, persistent across all tabs */}
        <header
          className="sticky top-0 z-20 safe-t safe-x"
          style={{
            background: "color-mix(in srgb, var(--surface) 88%, transparent)",
            backdropFilter: "saturate(160%) blur(16px)",
            WebkitBackdropFilter: "saturate(160%) blur(16px)",
            borderBottom: "1px solid var(--separator)",
          }}
        >
          <div className="px-4 py-2.5 flex items-center gap-2.5">
            <button
              type="button"
              className="lg:hidden tap grid place-items-center rounded-[10px] shrink-0"
              style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, background: "var(--surface-2)" }}
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu size={20} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <h1
                className="truncate m-0"
                style={{ fontSize: "var(--t-title3)", fontWeight: 700, letterSpacing: "-0.015em" }}
              >
                {active?.title.trim() || "Mental Model × DISCO"}
              </h1>
              <p
                className="mono truncate m-0"
                style={{
                  fontSize: 10,
                  color:
                    save.kind === "error" ? "var(--rust)" : save.kind === "ok" ? "var(--green)" : "var(--text-3)",
                }}
                role="status"
                aria-live="polite"
              >
                {save.msg ?? (active ? "All changes save automatically" : "No case study open")}
              </p>
            </div>
          </div>

          {active && (
            <div
              className="px-4 pb-3 grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
            >
              <Labeled label="Artifact / task title">
                <TextField
                  value={active.title}
                  onChange={(e) => patchCase({ title: e.target.value })}
                  placeholder="Hospital self check-in kiosk"
                />
              </Labeled>
              <Labeled label="User archetype / profile">
                <TextField
                  value={active.archetype}
                  onChange={(e) => patchCase({ archetype: e.target.value })}
                  placeholder="First-time visitor, 68, low digital literacy"
                />
              </Labeled>
              <Labeled label="Analyst">
                <TextField
                  value={active.student}
                  onChange={(e) => patchCase({ student: e.target.value })}
                  placeholder="Your name"
                />
              </Labeled>
              <Labeled label="Date">
                <TextField
                  type="date"
                  value={active.case_date ?? ""}
                  onChange={(e) => patchCase({ case_date: e.target.value })}
                />
              </Labeled>
            </div>
          )}

          {/* Desktop tab row */}
          <nav
            className="hidden lg:flex gap-1 px-4 pb-2"
            aria-label="Sections"
            role="tablist"
          >
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className="btn"
                  style={{
                    minHeight: 38,
                    fontSize: "var(--t-footnote)",
                    background: on ? "var(--surface-3)" : "transparent",
                    color: on ? "var(--text)" : "var(--text-2)",
                    fontWeight: on ? 650 : 500,
                  }}
                  onClick={() => goTab(t.key)}
                >
                  <span className="mono" aria-hidden>{t.n}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main
          className="px-4 pt-4 safe-x"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))", maxWidth: 1180 }}
        >
          {tab === "gallery" ? (
            <GalleryTab
              submissions={submissions}
              loading={galleryLoading}
              profile={profile}
              onRefresh={loadGallery}
              onDelete={deleteSubmission}
            />
          ) : !active ? (
            <div className="card p-8 text-center grid gap-4 place-items-center" style={{ marginTop: 24 }}>
              <span
                className="mono grid place-items-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--surface-3)",
                  color: "var(--text-3)",
                  fontSize: 18,
                }}
                aria-hidden
              >
                M×D
              </span>
              <div>
                <h2 style={{ fontSize: "var(--t-title2)", fontWeight: 700, margin: "0 0 4px" }}>
                  No case study open
                </h2>
                <p style={{ color: "var(--text-2)", fontSize: "var(--t-subhead)", margin: 0 }}>
                  A case study covers one artifact or task, analysed for one user archetype.
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={newCase}>
                <Plus size={16} aria-hidden />
                New case study
              </button>
            </div>
          ) : tab === "mm" ? (
            <MentalModelTab c={active} setMM={(mm: MentalModel) => patchCase({ mm })} />
          ) : tab === "disco" ? (
            <TaskAnalysisTab c={active} setDisco={(disco: Disco) => patchCase({ disco })} />
          ) : (
            <FinalBriefTab
              c={active}
              setBrief={(t) => patchCase({ final_cognitive_brief: t })}
              onSubmitGallery={submitToGallery}
              submitState={submitState}
            />
          )}

          <div className="mt-10 lg:hidden">
            <AttributionFooter />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 safe-b safe-x z-30"
        aria-label="Sections"
        role="tablist"
        style={{
          background: "color-mix(in srgb, var(--surface) 90%, transparent)",
          backdropFilter: "saturate(160%) blur(18px)",
          WebkitBackdropFilter: "saturate(160%) blur(18px)",
          borderTop: "1px solid var(--separator)",
        }}
      >
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                className="tap grid place-items-center gap-0.5 py-1.5"
                style={{ background: "transparent", color: on ? "var(--brass)" : "var(--text-3)" }}
                onClick={() => goTab(t.key)}
              >
                <t.Icon size={21} aria-hidden strokeWidth={on ? 2.4 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: on ? 650 : 500, lineHeight: 1.2 }}>
                  {t.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AboutModal open={modal === "about"} onClose={() => setModal(null)} />
      <FociModal open={modal === "foci"} onClose={() => setModal(null)} />
      <PrinciplesModal open={modal === "principles"} onClose={() => setModal(null)} />
    </div>
  );
}
