# Inkwell — Novel Writing Studio

A focused, production-ready studio for writing novels. Distraction-free editor,
manuscript binder, corkboard outliner, story bible, writing analytics, version
history, and one-click export. Built with **Next.js** (App Router) and
**Supabase**, deployable to **Vercel** in minutes.

> Single-user by design. It’s locked behind one passphrase so you can host it
> publicly and still be the only one who can read or edit your work.

## Features

- **Rich editor** — TipTap-based, with headings, lists, quotes, task lists,
  highlight, links, and smart typography. Autosaves as you type.
- **Manuscript binder** — folders → chapters → scenes, reorderable, with status
  colours, POV/location, per-scene word targets, and inline rename.
- **Focus tools** — distraction-free mode, focus (dim other paragraphs),
  typewriter scrolling, adjustable typeface / size / line width, light & dark.
- **Writing sprints** — Pomodoro-style timer that counts the words you write in
  the session and logs the time.
- **Find & replace** — across the current scene, with case / whole-word options.
- **Corkboard outliner** — drag-and-drop index cards grouped by chapter, edit
  synopses and statuses at a glance.
- **Story bible** — characters, locations, factions, items & lore with custom
  attributes, relationships, long-form notes, and automatic “appears in” scene
  links.
- **Notes & ideas** — a colour-coded scratchpad for sparks, research, reminders.
- **Analytics** — total/target progress, daily goal ring, current & longest
  streaks, a one-year activity heatmap, a 30-day bar chart, status breakdown,
  projected finish date, and deadline pacing.
- **Version history** — manual & automatic per-scene snapshots with restore.
- **Export** — Markdown, Word (`.docx`), EPUB, and print-to-PDF, compiled from
  the binder in reading order.

## Tech

- Next.js 14 (App Router, Server Actions) · React 18 · TypeScript · Tailwind CSS
- Supabase (Postgres) — all access is **server-side** via the service-role key
- `docx` + `jszip` for document/EPUB generation, `@dnd-kit` for the corkboard

## Getting started

### 1. Create the database

1. Make a project at [supabase.com](https://supabase.com/dashboard).
2. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. From **Project Settings → API**, copy your project URL and the
   **`service_role`** key (keep this secret).

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret service-role key (server-only) |
| `APP_PASSWORD` | The passphrase that unlocks the app |
| `AUTH_SECRET` | Random string to sign the auth cookie (`openssl rand -hex 32`) |

> If `APP_PASSWORD` is left empty, the gate is disabled (handy for local dev).

### 3. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, enter your passphrase, and start writing.

## Deploy to Vercel

1. Push this folder to a Git repository and import it in Vercel.
2. Add the four environment variables above in **Project → Settings → Environment
   Variables** (use the same values; `SUPABASE_SERVICE_ROLE_KEY` and `AUTH_SECRET`
   must stay secret).
3. Deploy. That’s it — the app runs entirely on Vercel + Supabase.

## Architecture notes

- **Security model.** There is no per-user auth. A single passphrase issues a
  signed, HTTP-only cookie checked by `middleware.ts`. All database queries run
  on the server with the service-role key, so the anon key is never used and
  RLS is enabled with no public policies (defense in depth).
- **Saving.** The editor autosaves (debounced) through a Server Action that also
  recomputes word counts and credits the day’s writing session — which powers
  streaks and the heatmap.
- **Compilation.** Export and the print view flatten the binder tree
  depth-first by position, including only scenes flagged *include in compile*.

## Project layout

```
src/
  app/                     routes (home, login, project/*, api/*)
  components/              editor, write, outline, bible, notes, analytics, …
  lib/
    supabase/server.ts     service-role client (server-only)
    data.ts                read queries
    export/                markdown / docx / epub builders
    tiptap.ts, compile.ts  document helpers
supabase/schema.sql        database schema (run once)
```

A daily word counted on the wrong side of midnight? The “today” boundary uses
the **browser’s** local day when saving and the **server’s** local day when the
analytics page loads — set your Vercel project region/timezone if you want them
to match exactly.
