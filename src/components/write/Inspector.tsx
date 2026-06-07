"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Trash2, Camera } from "lucide-react";
import type { DocNode, DocStatus, Snapshot } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

export function Inspector({
  doc,
  snapshots,
  onMeta,
  onSnapshot,
  onRestore,
  onDeleteSnapshot,
}: {
  doc: DocNode;
  snapshots: Snapshot[];
  onMeta: (patch: Partial<DocNode>) => void;
  onSnapshot: (label: string) => void;
  onRestore: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
}) {
  const [synopsis, setSynopsis] = useState(doc.synopsis);
  const [pov, setPov] = useState(doc.pov);
  const [location, setLocation] = useState(doc.location);
  const [target, setTarget] = useState(doc.target_words);

  useEffect(() => {
    setSynopsis(doc.synopsis);
    setPov(doc.pov);
    setLocation(doc.location);
    setTarget(doc.target_words);
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const targetPct = target > 0 ? Math.min(100, Math.round((doc.word_count / target) * 100)) : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-ink-border px-4 py-2">
        <span className="label">Inspector</span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="label mb-1 block">Synopsis</label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            onBlur={() => onMeta({ synopsis })}
            rows={4}
            placeholder="What happens in this scene…"
            className="input resize-none"
          />
        </div>

        <div>
          <label className="label mb-1 block">Status</label>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(STATUS_META) as DocStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onMeta({ status: s })}
                title={STATUS_META[s].label}
                className={`h-7 rounded-md border text-[10px] font-medium transition-colors ${
                  doc.status === s ? "text-white" : "border-ink-border text-ink-muted hover:bg-ink-border/40"
                }`}
                style={
                  doc.status === s
                    ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color }
                    : {}
                }
              >
                {STATUS_META[s].label[0]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">{STATUS_META[doc.status].label}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-1 block">POV</label>
            <input value={pov} onChange={(e) => setPov(e.target.value)} onBlur={() => onMeta({ pov })} className="input" placeholder="—" />
          </div>
          <div>
            <label className="label mb-1 block">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} onBlur={() => onMeta({ location })} className="input" placeholder="—" />
          </div>
        </div>

        <div>
          <label className="label mb-1 block">Word target</label>
          <input
            type="number"
            value={target || ""}
            onChange={(e) => setTarget(parseInt(e.target.value, 10) || 0)}
            onBlur={() => onMeta({ target_words: target })}
            className="input"
            placeholder="No target"
          />
          {target > 0 && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-border">
                <div className="h-full rounded-full bg-ink-accent transition-all" style={{ width: `${targetPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {doc.word_count.toLocaleString()} / {target.toLocaleString()} ({targetPct}%)
              </p>
            </>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span>Include in compile</span>
          <input
            type="checkbox"
            checked={doc.include_in_compile}
            onChange={(e) => onMeta({ include_in_compile: e.target.checked })}
            className="h-4 w-4 accent-ink-accent"
          />
        </label>
      </div>

      {/* Snapshots */}
      <div className="mt-auto border-t border-ink-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label flex items-center gap-1">
            <History size={12} /> Snapshots
          </span>
          <button
            onClick={() => onSnapshot(new Date().toLocaleString())}
            className="btn-subtle h-7 px-2 text-xs"
          >
            <Camera size={13} /> Capture
          </button>
        </div>
        {snapshots.length === 0 ? (
          <p className="text-xs text-ink-muted">No snapshots yet. Capture one before big revisions.</p>
        ) : (
          <div className="space-y-1">
            {snapshots.slice(0, 12).map((s) => (
              <div key={s.id} className="group flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-ink-border/40">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.kind === "auto" ? "#94a3b8" : "#34d399" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{s.label || "Snapshot"}</p>
                  <p className="text-[10px] text-ink-muted">
                    {s.word_count.toLocaleString()} words · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => confirm("Restore this snapshot? Current text is saved first.") && onRestore(s.id)}
                  className="p-1 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink-accent"
                  title="Restore"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => onDeleteSnapshot(s.id)}
                  className="p-1 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
