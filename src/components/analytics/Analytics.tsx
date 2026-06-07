import {
  eachDayOfInterval,
  subDays,
  startOfWeek,
  format,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import type { DocStatus, Project, WritingSession } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { localDay, readingMinutes } from "@/lib/utils";

function computeStreaks(daysWithWords: Set<string>): { current: number; longest: number } {
  const today = new Date();
  // current streak: walk backwards from today (allow today to be empty).
  let current = 0;
  for (let i = 0; i < 3650; i++) {
    const d = localDay(subDays(today, i));
    if (daysWithWords.has(d)) current++;
    else if (i === 0) continue; // today not yet written — keep counting from yesterday
    else break;
  }
  // longest streak across all recorded days.
  const sorted = Array.from(daysWithWords).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export function Analytics({
  project,
  sessions,
  statusCounts,
  totalWords,
}: {
  project: Project;
  sessions: WritingSession[];
  statusCounts: Record<DocStatus, number>;
  totalWords: number;
}) {
  const byDay = new Map(sessions.map((s) => [s.day, s.words_added]));
  const daysWithWords = new Set(sessions.filter((s) => s.words_added > 0).map((s) => s.day));
  const { current, longest } = computeStreaks(daysWithWords);

  const activeDays = sessions.filter((s) => s.words_added > 0);
  const totalWritten = sessions.reduce((s, x) => s + x.words_added, 0);
  const avgPerActiveDay = activeDays.length ? Math.round(totalWritten / activeDays.length) : 0;
  const bestDay = activeDays.reduce(
    (best, s) => (s.words_added > best.words_added ? s : best),
    { day: "", words_added: 0 } as WritingSession
  );
  const totalMinutes = sessions.reduce((s, x) => s + x.minutes, 0);

  const today = localDay();
  const todayWords = byDay.get(today) ?? 0;
  const goalPct = Math.min(100, Math.round((todayWords / Math.max(1, project.daily_word_goal)) * 100));
  const remaining = Math.max(0, project.target_word_count - totalWords);
  const targetPct = Math.min(100, Math.round((totalWords / Math.max(1, project.target_word_count)) * 100));

  // Projected finish at the daily goal pace.
  const daysToFinish = project.daily_word_goal > 0 ? Math.ceil(remaining / project.daily_word_goal) : 0;
  const projectedFinish = daysToFinish ? localDay(subDays(new Date(), -daysToFinish)) : null;

  let deadlineInfo: string | null = null;
  if (project.deadline) {
    const daysLeft = differenceInCalendarDays(parseISO(project.deadline), new Date());
    if (daysLeft > 0) {
      const needed = Math.ceil(remaining / daysLeft);
      deadlineInfo = `${daysLeft} days left · ${needed.toLocaleString()} words/day to finish`;
    } else {
      deadlineInfo = "Deadline has passed";
    }
  }

  // Heatmap: ~1 year of days, grouped into weeks.
  const end = new Date();
  const start = startOfWeek(subDays(end, 363));
  const allDays = eachDayOfInterval({ start, end });
  const weeks: { day: string; words: number }[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(
      allDays.slice(i, i + 7).map((d) => {
        const key = localDay(d);
        return { day: key, words: byDay.get(key) ?? 0 };
      })
    );
  }
  const level = (w: number) => {
    if (w <= 0) return 0;
    const g = project.daily_word_goal || 1000;
    if (w < g * 0.25) return 1;
    if (w < g * 0.5) return 2;
    if (w < g) return 3;
    return 4;
  };
  const levelColor = ["bg-ink-border/50", "bg-ink-accent/30", "bg-ink-accent/50", "bg-ink-accent/75", "bg-ink-accent"];

  // Last 30 days bar chart.
  const last30 = eachDayOfInterval({ start: subDays(end, 29), end }).map((d) => {
    const key = localDay(d);
    return { day: key, words: byDay.get(key) ?? 0 };
  });
  const max30 = Math.max(project.daily_word_goal, ...last30.map((d) => d.words), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total words" value={totalWords.toLocaleString()} sub={`${targetPct}% of target`} />
        <Stat label="Today" value={todayWords.toLocaleString()} sub={`${goalPct}% of daily goal`} accent />
        <Stat label="Current streak" value={`${current} day${current === 1 ? "" : "s"}`} sub={`Best: ${longest}`} />
        <Stat label="Avg / writing day" value={avgPerActiveDay.toLocaleString()} sub={`${activeDays.length} active days`} />
      </div>

      {/* Progress + projections */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Manuscript progress</h3>
          <div className="mb-1 flex justify-between text-sm text-ink-muted">
            <span>{totalWords.toLocaleString()} words</span>
            <span>{project.target_word_count.toLocaleString()} target</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ink-border">
            <div className="h-full rounded-full bg-ink-accent transition-all" style={{ width: `${targetPct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Mini label="Words remaining" value={remaining.toLocaleString()} />
            <Mini label="Reading time" value={`${readingMinutes(totalWords)} min`} />
            <Mini label="At goal pace, done" value={projectedFinish ? format(parseISO(projectedFinish), "d MMM yyyy") : "—"} />
            <Mini label="Time writing" value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`} />
          </div>
          {deadlineInfo && (
            <p className="mt-3 rounded-lg bg-ink-accent/10 px-3 py-2 text-sm text-ink-accent">{deadlineInfo}</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Scenes by status</h3>
          <div className="space-y-2">
            {(Object.keys(STATUS_META) as DocStatus[]).map((s) => {
              const count = statusCounts[s] ?? 0;
              const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-ink-muted">{STATUS_META[s].label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-border">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / total) * 100}%`, background: STATUS_META[s].color }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-ink-muted">{count}</span>
                </div>
              );
            })}
          </div>
          {bestDay.day && (
            <p className="mt-4 text-sm text-ink-muted">
              🏆 Best day: <strong className="text-ink-text">{bestDay.words_added.toLocaleString()}</strong> words on{" "}
              {format(parseISO(bestDay.day), "d MMM")}
            </p>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold">Writing activity</h3>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d) => (
                <div
                  key={d.day}
                  className={`h-3 w-3 rounded-sm ${levelColor[level(d.words)]}`}
                  title={`${format(parseISO(d.day), "d MMM yyyy")}: ${d.words.toLocaleString()} words`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-muted">
          Less
          {levelColor.map((c, i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ${c}`} />
          ))}
          More
        </div>
      </div>

      {/* Last 30 days */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold">Last 30 days</h3>
        <div className="flex h-32 items-end gap-1">
          {last30.map((d) => (
            <div key={d.day} className="group flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-ink-accent/80 transition-all group-hover:bg-ink-accent"
                style={{ height: `${(d.words / max30) * 100}%`, minHeight: d.words > 0 ? 2 : 0 }}
                title={`${format(parseISO(d.day), "d MMM")}: ${d.words.toLocaleString()} words`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "ring-1 ring-ink-accent/40" : ""}`}>
      <p className="label">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
