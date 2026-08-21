# Setup & Deployment — Mental Model × DISCO

Written for someone who has **not** set up Supabase or Vercel before. Follow it in
order; nothing here assumes prior knowledge. Total time: about 45 minutes, most of
it waiting for things to install.

Everything you type goes into **VS Code's integrated terminal** (`View → Terminal`,
or `` Ctrl+` ``).

---

## Before you start

You need three things installed / signed up for:

| What | Where | Notes |
|---|---|---|
| Node.js 18 or newer | https://nodejs.org — download the **LTS** build | Check with `node -v` |
| A Supabase account | https://supabase.com | Free tier is plenty for a class |
| An Anthropic API key | https://console.anthropic.com | Needed only for the three ✨ Generate buttons |

Check Node is working:

```bash
node -v
```

If that prints something like `v22.x.x`, you're set. If it says "command not
found", install Node and reopen the terminal.

---

## Step 1 — Open the project and install dependencies

Unzip the project folder somewhere sensible (Documents, not Downloads). Then in
VS Code: `File → Open Folder…` and pick the `mental-model-disco` folder.

In the terminal:

```bash
npm install
```

This downloads the libraries the app needs into a `node_modules` folder. It takes
a minute or two and prints a lot of text. As long as it ends without the word
`error`, you're fine.

---

## Step 2 — Create the Supabase project

1. Go to https://supabase.com and click **Start your project** / **Sign in**.
2. Click **New project**.
3. Fill in:
   - **Name**: `mental-model-disco`
   - **Database Password**: click **Generate a password** and **save it somewhere
     safe** — a password manager, not a sticky note. You won't need it for this
     app, but you'll need it if you ever connect to the database directly, and it
     cannot be recovered.
   - **Region**: pick the one closest to your students. For NID Bangalore, choose
     **Southeast Asia (Singapore)** or **South Asia (Mumbai)** if offered.
4. Click **Create new project** and wait. Provisioning takes 1–3 minutes.

---

## Step 3 — Create the database tables

1. In the left sidebar of your Supabase project, click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this project in VS Code, select all
   (`Ctrl+A` / `Cmd+A`), copy it.
4. Paste it into the Supabase SQL editor and click **Run** (or `Ctrl+Enter`).

You should see **Success. No rows returned**. That's what success looks like for
this kind of script.

> The script is safe to run more than once. If you edit it later and re-run it,
> nothing breaks and no data is lost.

**What you just created:** four tables — `profiles`, `sessions`, `cases`,
`gallery_submissions` — plus the Row Level Security policies that make one
student's work invisible to another student. Click **Table Editor** in the sidebar
to see them.

---

## Step 4 — Turn on email sign-up

1. Sidebar → **Authentication** → **Sign In / Providers**.
2. Confirm **Email** is enabled. It is on by default.
3. Make sure **Confirm email** is switched **on**. This is what sends students a
   confirmation link they must click before they can sign in.
4. Optional: **Authentication → Emails** lets you reword the confirmation email.

> **A note on Supabase's built-in email.** The free built-in mailer is rate-limited
> to a few messages per hour — fine for testing, not fine for a class of forty all
> registering in the same tutorial. Before you run a class, either stagger
> registration, or connect your own SMTP under
> **Project Settings → Authentication → SMTP Settings**. Your institution's mail
> server or a free tier of Resend / SendGrid will do.

---

## Step 5 — Copy your keys into the project

1. In Supabase: **Project Settings** (the gear icon) → **API**.
2. You need two values from that page:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public** key — a very long string starting `eyJ...`
3. In VS Code, create a new file in the project root called exactly:

   ```
   .env.local
   ```

4. Paste this in, replacing the placeholders with your two values and your
   Anthropic key:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-anon-key...
   ANTHROPIC_API_KEY=sk-ant-...your-key...
   ```

   There is a copy of this template at `.env.local.example` if you'd rather
   duplicate that file and rename it.

### Why the anon key is safe to expose but the Anthropic key is not

The `NEXT_PUBLIC_` prefix is a Next.js instruction meaning *"put this value into
the JavaScript sent to the browser."*

- The Supabase **anon key** is designed to be public. Anyone can read it out of
  your site. What stops them reading your students' data is Row Level Security —
  the policies you ran in Step 3 — not secrecy of the key.
- The **Anthropic key** is a billing credential. It has **no** `NEXT_PUBLIC_`
  prefix, which is what keeps it on the server. The browser never sees it; it
  calls this app's own `/api/generate-*` routes, and those routes call Anthropic.

Never add `NEXT_PUBLIC_` to `ANTHROPIC_API_KEY`. That single change would publish
your API key to everyone who visits the site.

`.env.local` is already git-ignored, so it will not be committed or uploaded.

---

## Step 6 — Run it locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

Register an account, check your inbox, click the confirmation link, come back and
sign in. You should land on an empty tool with a **New case study** button.

To stop the server, press `Ctrl+C` in the terminal.

**Testing on your phone while developing:** run
`npm run dev -- --hostname 0.0.0.0`, then visit `http://<your-computer's-ip>:3000`
from a phone on the same Wi-Fi. `ipconfig` (Windows) or `ifconfig | grep inet`
(Mac/Linux) will tell you the IP.

---

## Step 7 — Make yourself faculty

The Class Gallery's export buttons are visible to everyone, but the ability to
remove *other people's* submissions is faculty-only. After you've registered:

1. Supabase → **SQL Editor** → **New query**.
2. Run this, with your own email:

   ```sql
   update public.profiles set role = 'faculty' where email = 'you@example.com';
   ```

3. Sign out and back in for it to take effect.

---

## Step 8 — Deploy to Vercel

### 8a. Install the CLI and log in

```bash
npm install -g vercel
vercel login
```

`vercel login` opens a browser window. Sign in with GitHub, GitLab, or email —
whichever you prefer; you do not need a Git repository for this route.

### 8b. First deploy

```bash
vercel
```

Answer the prompts:

- *Set up and deploy?* → **Y**
- *Which scope?* → your own account
- *Link to existing project?* → **N**
- *Project name?* → press Enter to accept `mental-model-disco`
- *In which directory is your code located?* → press Enter for `./`
- *Want to modify these settings?* → **N** (it detects Next.js correctly)

This produces a **preview** URL. The app will show the "Connect Supabase" screen,
because you haven't given Vercel your keys yet. That's next.

### 8c. Add the environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY
```

For each one: paste the value, then when asked which environments, select
**Production, Preview, and Development** (space to select, Enter to confirm).

Paste carefully. A trailing space in the Supabase URL is the single most common
cause of "it works locally but not deployed."

### 8d. Deploy to production

```bash
vercel --prod
```

You'll get a live URL like `https://mental-model-disco.vercel.app`. That's the
link you give your students.

### 8e. Tell Supabase about the live URL

Confirmation emails need to send people back to the deployed site, not to
localhost.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: `https://your-project.vercel.app`
3. **Redirect URLs**: add both:
   - `https://your-project.vercel.app/**`
   - `http://localhost:3000/**`

Save. Skipping this step is why confirmation links sometimes bounce people to a
dead localhost address.

### Optional — automatic redeploys from GitHub

If you'd rather push code and have it deploy itself:

```bash
git init
git add .
git commit -m "Initial commit: Mental Model x DISCO web app"
```

Create an empty repository on github.com (no README, no .gitignore), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/mental-model-disco.git
git branch -M main
git push -u origin main
```

Then at https://vercel.com/new → **Import Git Repository** → pick the repo → add
the same three environment variables under **Settings → Environment Variables** →
**Deploy**. Every `git push` to `main` now redeploys automatically.

---

## Step 9 — Install it on a phone or tablet

The app is already a PWA — manifest, icons and Apple meta tags are in place.

- **iPhone / iPad (Safari)**: open the live URL → Share button → **Add to Home
  Screen**. It launches full-screen with no browser chrome.
- **Android (Chrome)**: open the URL → ⋮ menu → **Install app** / **Add to Home
  screen**.

Tell students to do this on day one. It's the difference between a website they
forget and a tool they open.

---

## Step 10 — Verify before you hand it to a class

Work through these in order. Each one catches a different category of failure.

**1. One student cannot see another's work.**
Register two accounts (use a second browser profile or a private window). Create
a case study in each. Confirm the sidebar in account B lists only B's case
studies. This tests the `own cases` RLS policy — the single most important one.

**2. The Class Gallery is readable by all, writable by one.**
Submit a case from account A. Sign in as B: the submission should be listed and
openable, and B should see no delete button on it.

**3. The Anthropic key is not in the browser.**
On the live site, open DevTools → **Network**, then click a ✨ Generate button.
The only request should be to `/api/generate-...` on your own domain — never to
`api.anthropic.com`. Then DevTools → **Sources**, `Ctrl+F` for `sk-ant`. Zero
results.

**4. Email confirmation works end to end.**
Register a fresh address on the live site → email arrives → link works → you can
sign in. Try signing in *before* clicking the link: you should be told your email
isn't confirmed.

**5. A new `sessions` row appears on every login.**
Supabase → **Table Editor** → `sessions`. Sign out and back in. A new row appears
each time, not just the first. Then check `cases`: a case edited during that visit
carries that `session_id`.

**6. It works one-handed on a phone.**
Open the live site on an actual phone. Bottom tab bar reachable with a thumb, no
sideways scrolling of the *page* — only the DISCO table itself should scroll
sideways, which is deliberate. Tap into a text field: the page must **not** zoom.

---

## Troubleshooting

**"Connect Supabase to continue" on the deployed site**
The environment variables aren't set on Vercel, or you added them and didn't
redeploy. Run `vercel --prod` again — env var changes only take effect on the next
deployment.

**"Invalid API key" when signing in**
The anon key was truncated on paste. It is very long (several hundred characters).
Copy it again with the copy button in the Supabase dashboard.

**Confirmation email never arrives**
Check spam first. Then check Supabase's rate limit (Step 4) — the built-in mailer
allows only a handful per hour. The **Resend confirmation email** button on the
sign-in screen is there for this.

**Generate button says "Generation failed"**
Check `ANTHROPIC_API_KEY` is set on Vercel with no `NEXT_PUBLIC_` prefix and no
trailing whitespace, and that the key has credit at console.anthropic.com. The
app is designed so this failure never blocks you — every generated field stays
editable by hand.

**"new row violates row-level security policy"**
The schema didn't finish running. Re-run `supabase/schema.sql` in the SQL Editor
and check for a red error message.

**Nothing loads and the console says `sessions` doesn't exist**
Same cause — Step 3 didn't complete. Re-run the schema.

---

## Where things are, if you want to change them

| You want to change… | Edit this |
|---|---|
| Colours, type scale, dark mode, high contrast | `src/app/globals.css` (all tokens are at the top) |
| The three AI prompts | `src/app/api/generate-*/route.ts` |
| Which AI model is used | `ANTHROPIC_MODEL` in `.env.local`, or the default in `src/lib/server/anthropic.ts` |
| About / 5 Foci / 14 Principles text | `src/lib/content.ts` |
| The printed / PDF export layout | `src/lib/exporters.ts` |
| The database shape | `supabase/schema.sql`, then re-run it |
| App icons | `scripts/make-icons.mjs`, then `npm run make:icons` |

After changing colours, run `npm run check:contrast` — it re-audits every
foreground/background pair against WCAG AA in both light and dark and fails loudly
if a change drops one below threshold.
