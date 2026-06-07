"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Square, X } from "lucide-react";

const DURATIONS = [10, 15, 25, 45];

export function SprintTimer({
  getWords,
  onComplete,
}: {
  getWords: () => number;
  onComplete: (minutes: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [sprintWords, setSprintWords] = useState(0);
  const baseline = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    baseline.current = getWords();
    setSprintWords(0);
    setRemaining(minutes * 60);
    setRunning(true);
  };

  const stop = (completed: boolean) => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    setRunning(false);
    if (completed) onComplete(minutes);
  };

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setSprintWords(Math.max(0, getWords() - baseline.current));
      setRemaining((r) => {
        if (r <= 1) {
          stop(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn-subtle h-9 px-3 text-sm ${running ? "text-ink-accent" : ""}`}
        title="Writing sprint"
      >
        <Timer size={16} />
        {running ? `${mm}:${ss}` : "Sprint"}
      </button>

      {open && (
        <div className="card absolute right-0 top-11 z-30 w-60 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="label">Writing sprint</span>
            <button onClick={() => setOpen(false)} className="text-ink-muted">
              <X size={15} />
            </button>
          </div>

          {!running ? (
            <>
              <div className="mb-3 grid grid-cols-4 gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMinutes(d)}
                    className={`h-8 rounded-md text-sm ${
                      minutes === d ? "bg-ink-accent text-white" : "bg-ink-border/40 hover:bg-ink-border/70"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button onClick={start} className="btn-primary w-full">
                <Play size={15} /> Start {minutes} min
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="font-mono text-4xl font-bold tabular-nums">
                {mm}:{ss}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="font-semibold text-ink-accent">{sprintWords}</span> words this sprint
              </p>
              <button onClick={() => stop(false)} className="btn-subtle mt-3 w-full">
                <Square size={14} /> Stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
