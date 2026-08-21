# Mental Model × DISCO

A mobile-first, installable web app that combines two cognitive-ergonomics
frameworks — the **Mental Model Mapper** and the **7-Step DISCO Cognitive Task
Analysis** — into one instrument that produces a **Final Cognitive Design Brief**.

Built for design students and faculty. Multi-user, account-based, with every
student's work saved centrally so the same login works across phone, tablet and
laptop, and faculty can pull records across the whole class.

**→ Setting it up for the first time? Read [SETUP.md](./SETUP.md).** It assumes no
prior Supabase or Vercel experience.

---

## The four tabs

| | Tab | What it does |
|---|---|---|
| ① | **Mental Model** | Six accordion sheets: user model, metaphor & expectations, an AI-assisted Design Vision writeup, the interaction flow with ⚡ stress points, auto-populated Resolve cards, and closure satisfaction. |
| ② | **Task Analysis** | The DISCO stage table — one row per task-flow stage, seven step-columns, six cognition-dimension dropdowns per stage, plus a Summary & Design Considerations writeup and six 0–10 overall load sliders. |
| ③ | **Final Cognitive Design Brief** | Three colour-coded bands. Design Vision (from ①) → Design Consideration (from ②) → the merged brief. Contains the **Interaction Timeline**, which puts Mental Model step *N* beside DISCO stage *N* and is the view that proves both frameworks are describing the same journey. |
| ④ | **Class Gallery** | Submitted case studies, readable by the whole class. Faculty exports: full JSON, and a gradebook-style CSV. |

Everything autosaves. A case study covers one artifact or task, analysed for one
user archetype.

---

## Architecture

```
┌──────────────────────────────┐
│  Client (Next.js App Router) │  student/faculty phone, tablet, laptop
│  · auth screens              │
│  · 4-tab tool UI             │
│  · @supabase/ssr browser     │
│    client (auth + CRUD)      │
└──────────┬───────────────────┘
           │ HTTPS
     ┌─────┴──────────────────────────────┐
     ▼                                    ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│  Supabase (managed)     │   │  /api/generate-vision       │
│  · Postgres             │   │  /api/generate-consideration│
│  · Auth (email+confirm) │   │  /api/generate-brief        │
│  · Row Level Security   │   │    server-only; hold the    │
└─────────────────────────┘   │    Anthropic key            │
                              └─────────────────────────────┘
```

Deliberately thin. Supabase is both the database and the auth provider; the only
custom backend code is the three AI-proxy routes. There are no Supabase Edge
Functions — the routes live in the same Next.js app, so there is one repo and one
deploy.

### The API key correction

The original single-file version of this tool ran inside a sandbox where the
browser could call `api.anthropic.com` directly with no key. **That does not work
in a deployed app**, and reproducing it would mean shipping a real API key to
every visitor.

Here, the client calls this app's own `/api/generate-*` routes. Those routes read
`ANTHROPIC_API_KEY` — no `NEXT_PUBLIC_` prefix, so Next.js keeps it server-side —
and call Anthropic from the server. Verified: a production build with a sentinel
value in that variable contains zero occurrences of it anywhere under
`.next/static`.

### Data model

```
profiles ─┬─ sessions ─── cases ─── gallery_submissions
          └─────────────────┘
```

- `profiles` — one row per user, created automatically by a trigger on `auth.users`. Carries `role` (`student` | `faculty`) and a reserved `verified_by_faculty` flag for a stronger verification step later.
- `sessions` — one row per **login**, not per user. Every case created or edited during that visit is stamped with its `session_id`, so faculty can ask "what was written during Tuesday's studio" separately from "what has this student ever written".
- `cases` — the working case study. `mm` and `disco` are JSONB, mirroring the shapes in `src/lib/types.ts`.
- `gallery_submissions` — an immutable snapshot of a case at submission time, so a later edit to the case never silently rewrites what was submitted.

RLS is enforced on all four tables. `cases` and `sessions` are private to their
owner. `gallery_submissions` is readable by any authenticated user and writable
only by its owner — that is the whole security model of the Class Gallery.

---

## Design system

iOS Human Interface Guidelines, applied to the existing palette rather than
replacing it.

- **Type** — the system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text"…`), so real San Francisco renders on Apple devices. SF Pro cannot be bundled or self-hosted; the system stack is the license-compliant way to get the native look. iOS type scale in `rem`: Large Title 34pt through Caption 12pt.
- **Colour** — warm neutral grounds; five semantic accents kept at their original *meanings*: **brass** (primary action / medium severity), **teal** (positive / low severity / links), **rust** (high severity / danger), **green** (resolved), **purple** (Design Vision / Mental Model). Cognition dimensions are colour-coded Low=teal, Medium=brass, High=rust everywhere they appear.
- **Contrast** — every foreground/background pair is machine-audited. `npm run check:contrast` checks 46 pairs across light and dark; all pass WCAG AA. Run it after any colour change.
- **Dark mode** — via `prefers-color-scheme`, with the same semantics remapped, not inverted.
- **Layout** — grouped inset cards, 10–14px radii, hairline dividers, sidebar on desktop and a bottom tab bar on mobile, `env(safe-area-inset-*)` padding so content clears the notch and home indicator.
- **Touch** — 44×44pt minimum on every interactive target. All text inputs are ≥16px computed, which is what stops iOS Safari zooming when a field is focused.
- **Motion** — iOS-style spring easing, disabled by both `prefers-reduced-motion` and the app's own Reduce Motion toggle.
- **Icons** — Lucide, in the SF Symbols spirit. Actual SF Symbols are Apple-proprietary and are not bundled.

### Accessibility panel

Per-user, persisted locally: text size (100–145%, never below 100%), high
contrast, dyslexia-friendly font (Atkinson Hyperlegible, self-hosted via
`@fontsource` so nothing is fetched from Google), reduce motion. All four are
implemented as data attributes on `<html>` that the token layer in
`globals.css` responds to.

---

## Project layout

```
src/
  app/
    layout.tsx                    root layout, PWA + Apple meta, viewport
    page.tsx                      auth gate / setup-incomplete screen
    globals.css                   ALL design tokens live here
    api/generate-vision/          ─┐
    api/generate-consideration/    ├─ server-only Anthropic proxies
    api/generate-brief/           ─┘
  components/
    AppShell.tsx                  auth, session identity, case CRUD, autosave, nav
    AuthScreen.tsx                register / sign in / resend confirmation
    AccessibilityPanel.tsx        text size, contrast, font, motion
    ReferenceModals.tsx           About, 5 Foci, 14 Principles, attribution footer
    ui.tsx                        Sheet, Modal, PillRow, DotRating, Segmented, TagInput
    tabs/
      MentalModelTab.tsx
      TaskAnalysisTab.tsx
      FinalBriefTab.tsx           also renders gallery detail, via readOnly
      GalleryTab.tsx
  lib/
    types.ts                      canonical shapes; six dimensions, four levels
    defaults.ts                   empty structures + tolerant normalisers
    content.ts                    About / 5 Foci / 14 Principles / attribution
    exporters.ts                  printable case doc, faculty JSON + CSV, JSON backup
    supabaseClient.ts             browser client
    server/anthropic.ts           SERVER ONLY — never import from a client component
supabase/schema.sql               tables, triggers, RLS. Paste into the SQL editor.
scripts/check-contrast.mjs        WCAG audit of the token palette
scripts/make-icons.mjs            regenerates the PWA icons
```

---

## Commands

```bash
npm run dev              # local dev server on :3000
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run check:contrast   # WCAG AA audit of the palette (light + dark)
npm run make:icons       # regenerate public/icon-*.png
```

---

## Extending it later

The schema and UI were shaped so these don't require a rebuild:

- **Restrict sign-up to an institutional domain** — add the check in the sign-up handler in `AuthScreen.tsx`, and/or uncomment the trigger at the bottom of `supabase/schema.sql`.
- **Faculty approval before a student can submit** — `profiles.verified_by_faculty` already exists; gate the Submit button on it and add an RLS condition to the gallery insert policy.
- **Per-session faculty views** — `cases.session_id` is already populated; a query grouped by `sessions.started_at` gives you "everything written during this studio".

---

## Attribution

*Reference Source — User Mental Model Framework developed by Nijoo Dubey & VS
Ravishankar and 7-Step DISCO Cognitive Task Analysis Framework developed by VS
Ravishankar — Course Work, MDes Universal Design, NID Bangalore, India.*

*Interactive Framework Conceptualised and Developed by VS Ravishankar, Industrial
Design + Academic, RS Design, Bangalore.*

The 14 Universal Principles of Design summaries are original paraphrases after
Lidwell, Holden & Butler, compiled by VS Ravishankar for academic input.

This attribution appears in the app's footer, in the About modal, and on every
exported case study document. Please keep it there.
