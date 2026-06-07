"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pin, Trash2, Lightbulb, StickyNote, BookOpen } from "lucide-react";
import type { Note, NoteKind, Project } from "@/lib/types";
import { createNote, updateNote, deleteNote } from "@/app/project/[id]/actions";

const KIND_META: Record<NoteKind, { label: string; icon: typeof Lightbulb; color: string }> = {
  idea: { label: "Idea", icon: Lightbulb, color: "#f59e0b" },
  note: { label: "Note", icon: StickyNote, color: "#6366f1" },
  research: { label: "Research", icon: BookOpen, color: "#10b981" },
};

export function NotesBoard({ project, notes: initial }: { project: Project; notes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [filter, setFilter] = useState<NoteKind | "all">("all");

  const shown = notes.filter((n) => filter === "all" || n.kind === filter);

  const add = async (kind: NoteKind) => {
    const id = await createNote(project.id, kind);
    setNotes((prev) => [
      {
        id,
        project_id: project.id,
        kind,
        title: "",
        body: "",
        pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };
  const patch = (id: string, p: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...p } : n)));
    updateNote(project.id, id, p as Record<string, unknown>);
  };
  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    deleteNote(project.id, id);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {(Object.keys(KIND_META) as NoteKind[]).map((k) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {KIND_META[k].label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(KIND_META) as NoteKind[]).map((k) => {
            const Icon = KIND_META[k].icon;
            return (
              <button key={k} onClick={() => add(k)} className="btn-subtle h-9 px-3 text-sm">
                <Plus size={15} /> <Icon size={15} /> {KIND_META[k].label}
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          No notes yet. Capture an idea before it slips away.
        </p>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {shown
            .slice()
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
            .map((n) => {
              const meta = KIND_META[n.kind];
              const Icon = meta.icon;
              return (
                <div key={n.id} className="card break-inside-avoid p-3" style={{ borderTopColor: meta.color, borderTopWidth: 3 }}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon size={14} style={{ color: meta.color }} />
                    <input
                      defaultValue={n.title}
                      onBlur={(e) => e.target.value !== n.title && patch(n.id, { title: e.target.value })}
                      placeholder="Title"
                      className="flex-1 bg-transparent text-sm font-semibold outline-none"
                    />
                    <button
                      onClick={() => patch(n.id, { pinned: !n.pinned })}
                      className={n.pinned ? "text-ink-accent" : "text-ink-muted hover:text-ink-text"}
                      title="Pin"
                    >
                      <Pin size={14} fill={n.pinned ? "currentColor" : "none"} />
                    </button>
                    <button onClick={() => remove(n.id)} className="text-ink-muted hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    defaultValue={n.body}
                    onBlur={(e) => e.target.value !== n.body && patch(n.id, { body: e.target.value })}
                    placeholder="Write your thought…"
                    rows={4}
                    className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-ink-muted"
                  />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-ink-accent text-white" : "bg-ink-border/40 text-ink-muted hover:bg-ink-border/70"
      }`}
    >
      {children}
    </button>
  );
}
