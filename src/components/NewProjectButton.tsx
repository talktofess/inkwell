"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "./Modal";
import { createProject } from "@/app/actions";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444"];

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(COLORS[0]);

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={18} /> New Novel
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Start a new novel">
        <form action={createProject} className="space-y-4">
          <div>
            <label className="label mb-1 block">Title</label>
            <input name="title" className="input" placeholder="The Great Novel" autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Author</label>
              <input name="author" className="input" placeholder="Your name" />
            </div>
            <div>
              <label className="label mb-1 block">Genre</label>
              <input name="genre" className="input" placeholder="Fantasy" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Target word count</label>
              <input name="target_word_count" type="number" defaultValue={80000} className="input" />
            </div>
            <div>
              <label className="label mb-1 block">Daily goal</label>
              <input name="daily_word_goal" type="number" defaultValue={1000} className="input" />
            </div>
          </div>
          <div>
            <label className="label mb-2 block">Cover colour</label>
            <input type="hidden" name="cover_color" value={color} />
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-ink-accent ring-offset-ink-surface" : ""
                  }`}
                  style={{ background: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-subtle" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create novel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
