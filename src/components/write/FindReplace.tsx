"use client";

import { useMemo, useState } from "react";
import { X, Replace } from "lucide-react";
import { buildRegex, countMatches, replaceInDoc } from "@/lib/textsearch";

export function FindReplace({
  text,
  getDoc,
  onReplaced,
  onClose,
}: {
  text: string;
  getDoc: () => unknown;
  onReplaced: (doc: unknown) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [whole, setWhole] = useState(false);

  const matches = useMemo(() => {
    const re = buildRegex(query, caseSensitive, whole);
    return countMatches(text, re);
  }, [query, text, caseSensitive, whole]);

  const replaceAll = () => {
    const re = buildRegex(query, caseSensitive, whole);
    const { doc, count } = replaceInDoc(getDoc(), re, replacement);
    if (count > 0) onReplaced(doc);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-border bg-ink-surface px-2 py-1.5 shadow-sm">
      <Replace size={15} className="text-ink-muted" />
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find"
        className="w-32 rounded border border-ink-border bg-ink-bg px-2 py-1 text-sm outline-none focus:border-ink-accent"
      />
      <input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="Replace"
        className="w-32 rounded border border-ink-border bg-ink-bg px-2 py-1 text-sm outline-none focus:border-ink-accent"
      />
      <span className="min-w-[60px] text-xs tabular-nums text-ink-muted">{matches} match{matches === 1 ? "" : "es"}</span>
      <button
        onClick={() => setCaseSensitive((v) => !v)}
        className={`rounded px-1.5 py-1 text-xs font-medium ${caseSensitive ? "bg-ink-accent text-white" : "text-ink-muted hover:bg-ink-border/40"}`}
        title="Match case"
      >
        Aa
      </button>
      <button
        onClick={() => setWhole((v) => !v)}
        className={`rounded px-1.5 py-1 text-xs font-medium ${whole ? "bg-ink-accent text-white" : "text-ink-muted hover:bg-ink-border/40"}`}
        title="Whole word"
      >
        W
      </button>
      <button onClick={replaceAll} disabled={!matches} className="btn-subtle h-7 px-2 text-xs">
        Replace all
      </button>
      <button onClick={onClose} className="text-ink-muted hover:text-ink-text">
        <X size={16} />
      </button>
    </div>
  );
}
