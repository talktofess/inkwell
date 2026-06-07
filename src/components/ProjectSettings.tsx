"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import type { Project } from "@/lib/types";
import { updateProject, deleteProject } from "@/app/actions";

export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(project);
  const [saving, setSaving] = useState(false);

  const field = (k: keyof Project, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    await updateProject(project.id, {
      title: form.title,
      subtitle: form.subtitle,
      author: form.author,
      genre: form.genre,
      description: form.description,
      target_word_count: Number(form.target_word_count) || 0,
      daily_word_goal: Number(form.daily_word_goal) || 0,
      deadline: form.deadline || null,
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-subtle h-9 px-3 text-sm">
        <Settings size={16} /> Settings
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Project settings">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label mb-1 block">Title</label>
              <input className="input" value={form.title} onChange={(e) => field("title", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label mb-1 block">Subtitle</label>
              <input className="input" value={form.subtitle} onChange={(e) => field("subtitle", e.target.value)} />
            </div>
            <div>
              <label className="label mb-1 block">Author</label>
              <input className="input" value={form.author} onChange={(e) => field("author", e.target.value)} />
            </div>
            <div>
              <label className="label mb-1 block">Genre</label>
              <input className="input" value={form.genre} onChange={(e) => field("genre", e.target.value)} />
            </div>
            <div>
              <label className="label mb-1 block">Target words</label>
              <input
                type="number"
                className="input"
                value={form.target_word_count}
                onChange={(e) => field("target_word_count", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label mb-1 block">Daily goal</label>
              <input
                type="number"
                className="input"
                value={form.daily_word_goal}
                onChange={(e) => field("daily_word_goal", Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label className="label mb-1 block">Deadline</label>
              <input
                type="date"
                className="input"
                value={form.deadline ?? ""}
                onChange={(e) => field("deadline", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label mb-1 block">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                if (confirm(`Permanently delete “${project.title}” and everything in it?`))
                  deleteProject(project.id);
              }}
              className="btn-ghost text-red-500 hover:bg-red-500/10"
            >
              <Trash2 size={15} /> Delete novel
            </button>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="btn-subtle">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
