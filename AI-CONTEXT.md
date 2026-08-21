# Project context — paste this when starting a new AI session

This file exists so a fresh conversation can pick up the project without you
re-explaining it. **Copy everything between the two `---` rules below** into the
first message of a new session, then add what you actually want changed.

Keep this file updated as the project changes. It is the handover note.

---

I'm working on an existing Next.js app called **Mental Model × DISCO** — a
cognitive-design analysis tool for design students at NID Bangalore. It's already
built, deployed and in use. I want to make a change to it, described at the end.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 ·
Supabase (Postgres + Auth) · deployed on Vercel from a GitHub repo, auto-deploying
on push to `main`. I work on Windows in PowerShell.

**What the app does:** one case study at a time, four tabs — ① Mental Model,
② Task Analysis (7-step DISCO), ③ Final Cognitive Design Brief, ④ Class Gallery.
Students analyse an artifact for one user archetype; the tool merges both
frameworks into a Final Cognitive Design Brief they export as a document.
There's a separate faculty-only `/admin` usage dashboard.

**File map:**

```
src/app/
  layout.tsx              root layout, PWA + Apple meta, viewport
  page.tsx                auth gate / setup-incomplete screen
  globals.css             ALL design tokens — colours, type scale, components
  admin/page.tsx          faculty usage dashboard
  api/generate-vision|generate-consideration|generate-brief/route.ts
                          server-only Anthropic proxies
  api/session/start/route.ts
                          creates the session row + coarse geo, server-side
src/components/
  AppShell.tsx            auth, session identity, case CRUD, autosave, nav
  AuthScreen.tsx          register / sign in / resend confirmation
  AccessibilityPanel.tsx  text size, contrast, dyslexic font, reduce motion
  ReferenceModals.tsx     About, 5 Foci, 14 Principles, attribution footer
  ui.tsx                  Sheet, Modal, PillRow, DotRating, Segmented, TagInput
  admin/Charts.tsx        LineChart, BarChart, StatTile, Legend
  tabs/                   MentalModelTab, TaskAnalysisTab, FinalBriefTab, GalleryTab
src/lib/
  types.ts                canonical shapes — six cognitive dimensions, four levels
  defaults.ts             empty structures + tolerant normalisers for stored JSONB
  content.ts              About / 5 Foci / 14 Principles / attribution / privacy
  exporters.ts            printable case document, faculty JSON + CSV
  analytics.ts            pure aggregation for the admin dashboard
  supabaseClient.ts       browser client
  server/anthropic.ts     SERVER ONLY — never import from a client component
supabase/
  schema.sql              base tables, triggers, RLS
  002_analytics.sql       geo columns, is_faculty(), faculty read policies
scripts/
  check-contrast.mjs      WCAG audit of the palette
  make-icons.mjs          regenerates PWA icons
```

**Database:** `profiles` ← `sessions` ← `cases` → `gallery_submissions`.
`cases.mm` and `cases.disco` are JSONB mirroring `src/lib/types.ts`. Row Level
Security is on for all four tables: a student sees only their own rows; faculty
get SELECT across everything via the `is_faculty()` SECURITY DEFINER helper.

## Rules this project holds to — please don't break these

1. **The Anthropic API key is server-only.** `ANTHROPIC_API_KEY` has no
   `NEXT_PUBLIC_` prefix and is referenced only inside `src/app/api/**`. Never
   call `api.anthropic.com` from client code.
2. **Colour changes must re-pass the contrast audit.** All palette values live as
   CSS custom properties at the top of `globals.css`. After any change run
   `npm run check:contrast` — it checks 46 foreground/background pairs across
   light and dark against WCAG AA and exits non-zero on a failure.
3. **Chart colours are separate from UI colours.** `--chart-1` / `--chart-2` are
   validated as data marks (lightness band, chroma floor, CVD separation), not as
   text. Don't substitute the UI accent tokens into charts.
4. **Accessibility is not optional here.** 44×44pt minimum touch targets; all text
   inputs ≥16px computed so iOS Safari doesn't zoom on focus; `prefers-reduced-motion`
   plus the app's own Reduce Motion toggle both respected; the Accessibility panel
   in the sidebar must keep working.
5. **iOS Human Interface Guidelines** shape the visual language: system font stack
   (real San Francisco on Apple devices), grouped inset cards, 10–14px radii,
   hairline dividers, sidebar on desktop and bottom tab bar on mobile,
   `env(safe-area-inset-*)` padding.
6. **The attribution block must stay** — in the footer, the About modal, and every
   exported document. Text is in `src/lib/content.ts` as `ATTRIBUTION_LINES`.
7. **Stored data must keep opening.** `mm` and `disco` are JSONB written by earlier
   versions. Any new field goes through the normalisers in `defaults.ts` so an old
   row still loads. Never assume a field exists.
8. **RLS is the security boundary, not the UI.** If you add a table or a faculty
   feature, add the policy in SQL. Hiding a button is not access control.
9. **Verify before declaring done.** `npm run typecheck`, `npm run lint`,
   `npm run build` must all pass. That's what Vercel runs.

## How I work

- I edit and run everything in PowerShell on Windows.
- Give me exact commands to paste, not descriptions of what to do.
- `npm run dev` → http://localhost:3000 to check changes locally.
- To ship: `git add .` → `git commit -m "..."` → `git push`. Vercel redeploys
  automatically in a couple of minutes.
- Database changes are a `.sql` file I paste into the Supabase SQL Editor and Run.
  Write migrations so they're safe to run twice.

---

**What I want to change:** _(describe it here)_

---

## Notes for you, not for the AI

**Include a screenshot when the change is visual.** "Move the stress toggle" is
ambiguous; a screenshot with the thing circled is not.

**One change per session.** A session that does three unrelated things produces a
commit you can't review and can't cleanly revert. Finish, push, verify on the live
site, then start the next one.

**Branch for anything you're unsure about.** On `main` a bad push is live in two
minutes. On a branch, Vercel builds it as a *preview* deployment with its own URL
that students never see:

```powershell
git checkout -b feature/whatever
# ...make changes, commit...
git push -u origin feature/whatever
```

Vercel comments the preview URL on the branch. When you're happy:

```powershell
git checkout main
git merge feature/whatever
git push
```

**If a deploy breaks the live site**, don't debug under pressure. In the Vercel
dashboard → **Deployments** → find the last good one → ⋯ → **Promote to
Production**. That's an instant rollback. Then fix at your own pace.

**Keep this file current.** When a session adds a feature or changes a rule, update
the relevant section here before you push. The next session is only as good as this
file.
