import Link from "next/link";
import { Feather, BookOpen } from "lucide-react";
import { isConfigured } from "@/lib/supabase/server";
import { getProjects, getWordTotals } from "@/lib/data";
import { NewProjectButton } from "@/components/NewProjectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pluralize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isConfigured()) return <SetupScreen />;

  const [projects, totals] = await Promise.all([getProjects(), getWordTotals()]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-accent text-white">
            <Feather size={20} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold leading-none">Inkwell</h1>
            <p className="text-sm text-ink-muted">Novel writing studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NewProjectButton />
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-20 text-center">
          <BookOpen size={40} className="text-ink-muted" />
          <div>
            <p className="text-lg font-medium">No novels yet</p>
            <p className="text-sm text-ink-muted">Create your first manuscript to begin writing.</p>
          </div>
          <NewProjectButton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const words = totals[p.id] ?? 0;
            const pct = Math.min(100, Math.round((words / Math.max(1, p.target_word_count)) * 100));
            return (
              <Link
                key={p.id}
                href={`/project/${p.id}/write`}
                className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="h-2" style={{ background: p.cover_color }} />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-serif text-xl font-semibold leading-snug group-hover:text-ink-accent">
                    {p.title}
                  </h2>
                  {p.subtitle && <p className="text-sm text-ink-muted">{p.subtitle}</p>}
                  <p className="mt-1 text-xs text-ink-muted">
                    {[p.genre, p.author].filter(Boolean).join(" · ") || "—"}
                  </p>

                  <div className="mt-auto pt-5">
                    <div className="mb-1 flex justify-between text-xs text-ink-muted">
                      <span>{pluralize(words, "word")}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-border">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: p.cover_color }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function SetupScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <div className="card p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-accent text-white">
            <Feather size={20} />
          </div>
          <h1 className="font-serif text-2xl font-bold">Welcome to Inkwell</h1>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          Almost ready. Connect your Supabase database to get started:
        </p>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1.</strong> Create a project at{" "}
            <a className="text-ink-accent underline" href="https://supabase.com/dashboard" target="_blank">
              supabase.com
            </a>
            .
          </li>
          <li>
            <strong>2.</strong> Run <code className="rounded bg-ink-border/40 px-1">supabase/schema.sql</code> in
            the SQL editor.
          </li>
          <li>
            <strong>3.</strong> Set <code className="rounded bg-ink-border/40 px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code className="rounded bg-ink-border/40 px-1">SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
            <code className="rounded bg-ink-border/40 px-1">APP_PASSWORD</code>, and{" "}
            <code className="rounded bg-ink-border/40 px-1">AUTH_SECRET</code> in <code className="rounded bg-ink-border/40 px-1">.env.local</code>.
          </li>
          <li>
            <strong>4.</strong> Restart the dev server.
          </li>
        </ol>
      </div>
    </main>
  );
}
