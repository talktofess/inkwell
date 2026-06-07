"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import type { EditorSettings } from "@/components/editor/Editor";

const FONTS: { id: EditorSettings["fontFamily"]; label: string }[] = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans" },
  { id: "mono", label: "Mono" },
];

export function WriteSettings({
  settings,
  onChange,
}: {
  settings: EditorSettings;
  onChange: (patch: Partial<EditorSettings>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-9 w-9 p-0" title="Typography">
        <Settings2 size={17} />
      </button>
      {open && (
        <div className="card absolute right-0 top-11 z-30 w-64 space-y-4 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="label">Typography</span>
            <button onClick={() => setOpen(false)} className="text-ink-muted">
              <X size={15} />
            </button>
          </div>

          <div>
            <label className="label mb-1 block">Typeface</label>
            <div className="grid grid-cols-3 gap-1">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onChange({ fontFamily: f.id })}
                  className={`h-8 rounded-md text-sm ${
                    settings.fontFamily === f.id ? "bg-ink-accent text-white" : "bg-ink-border/40 hover:bg-ink-border/70"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-1 block">Font size · {settings.fontSize}px</label>
            <input
              type="range"
              min={14}
              max={26}
              value={settings.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-ink-accent"
            />
          </div>

          <div>
            <label className="label mb-1 block">Line width · {settings.lineWidth}px</label>
            <input
              type="range"
              min={520}
              max={900}
              step={20}
              value={settings.lineWidth}
              onChange={(e) => onChange({ lineWidth: Number(e.target.value) })}
              className="w-full accent-ink-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
