import { Feather } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const hasError = searchParams.error === "1";
  const next = searchParams.next ?? "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-bg px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-accent text-white shadow-lg">
            <Feather size={26} />
          </div>
          <h1 className="font-serif text-3xl font-bold">Inkwell</h1>
          <p className="text-sm text-ink-muted">Your private novel-writing studio.</p>
        </div>

        <form action="/api/unlock" method="post" className="card space-y-4 p-6">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label mb-1 block" htmlFor="password">
              Passphrase
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="input"
              placeholder="Enter your passphrase"
            />
          </div>
          {hasError && (
            <p className="text-sm text-red-500">That passphrase didn’t match. Try again.</p>
          )}
          <button type="submit" className="btn-primary w-full">
            Unlock
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Set with the <code className="rounded bg-ink-border/40 px-1">APP_PASSWORD</code> environment variable.
        </p>
      </div>
    </main>
  );
}
