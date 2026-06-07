"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, User } from "lucide-react";
import type { DocNode, DocStatus, Project } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { reorderSiblings, updateDocumentMeta } from "@/app/project/[id]/actions";

interface Group {
  parent: DocNode | null;
  scenes: DocNode[];
}

export function Corkboard({ project, documents }: { project: Project; documents: DocNode[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(documents);

  const groups = useMemo<Group[]>(() => {
    const containers = docs
      .filter((d) => d.type !== "scene")
      .sort((a, b) => a.position - b.position);
    const result: Group[] = [];
    const rootScenes = docs
      .filter((d) => d.type === "scene" && !d.parent_id)
      .sort((a, b) => a.position - b.position);
    if (rootScenes.length) result.push({ parent: null, scenes: rootScenes });
    for (const c of containers) {
      result.push({
        parent: c,
        scenes: docs.filter((d) => d.type === "scene" && d.parent_id === c.id).sort((a, b) => a.position - b.position),
      });
    }
    return result;
  }, [docs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (parentId: string | null) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const scenes = docs
      .filter((d) => d.type === "scene" && (d.parent_id ?? null) === parentId)
      .sort((a, b) => a.position - b.position);
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(scenes, oldIndex, newIndex);
    const idToPos = new Map(reordered.map((s, i) => [s.id, i]));
    setDocs((prev) =>
      prev.map((d) => (idToPos.has(d.id) ? { ...d, position: idToPos.get(d.id)! } : d))
    );
    reorderSiblings(project.id, reordered.map((s) => s.id));
  };

  const setStatus = (id: string, status: DocStatus) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    updateDocumentMeta(project.id, id, { status });
  };
  const setSynopsis = (id: string, synopsis: string) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, synopsis } : d)));
    updateDocumentMeta(project.id, id, { synopsis });
  };

  return (
    <div className="space-y-8">
      {groups.length === 0 && (
        <p className="text-sm text-ink-muted">No scenes yet. Add scenes in the writer to see them here.</p>
      )}
      {groups.map((g) => (
        <section key={g.parent?.id ?? "root"}>
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-lg font-semibold">
            {g.parent?.title ?? "Unfiled scenes"}
            <span className="text-xs font-normal text-ink-muted">
              {g.scenes.length} scene{g.scenes.length === 1 ? "" : "s"} ·{" "}
              {g.scenes.reduce((s, x) => s + x.word_count, 0).toLocaleString()} words
            </span>
          </h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(g.parent?.id ?? null)}>
            <SortableContext items={g.scenes.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.scenes.map((scene) => (
                  <Card
                    key={scene.id}
                    scene={scene}
                    projectId={project.id}
                    onStatus={(s) => setStatus(scene.id, s)}
                    onSynopsis={(v) => setSynopsis(scene.id, v)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      ))}
    </div>
  );
}

function Card({
  scene,
  projectId,
  onStatus,
  onSynopsis,
}: {
  scene: DocNode;
  projectId: string;
  onStatus: (s: DocStatus) => void;
  onSynopsis: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
  const [synopsis, setSynopsis] = useState(scene.synopsis);
  const meta = STATUS_META[scene.status];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card flex flex-col p-3 ${isDragging ? "z-10 opacity-80 shadow-xl" : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-1">
        <button {...attributes} {...listeners} className="cursor-grab text-ink-muted active:cursor-grabbing" title="Drag to reorder">
          <GripVertical size={15} />
        </button>
        <Link
          href={`/project/${projectId}/write?doc=${scene.id}`}
          className="min-w-0 flex-1 truncate font-medium hover:text-ink-accent"
        >
          {scene.title}
        </Link>
        <span className="shrink-0 text-[10px] tabular-nums text-ink-muted">{scene.word_count}</span>
      </div>

      <textarea
        value={synopsis}
        onChange={(e) => setSynopsis(e.target.value)}
        onBlur={() => synopsis !== scene.synopsis && onSynopsis(synopsis)}
        placeholder="Summarise this scene…"
        rows={3}
        className="mb-2 w-full resize-none rounded-md bg-ink-bg/60 p-2 text-xs text-ink-text outline-none placeholder:text-ink-muted focus:bg-ink-bg"
      />

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 gap-2 text-[10px] text-ink-muted">
          {scene.pov && (
            <span className="flex items-center gap-0.5 truncate">
              <User size={10} /> {scene.pov}
            </span>
          )}
          {scene.location && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin size={10} /> {scene.location}
            </span>
          )}
        </div>
        <select
          value={scene.status}
          onChange={(e) => onStatus(e.target.value as DocStatus)}
          className="shrink-0 rounded-md border-0 px-1.5 py-0.5 text-[10px] font-semibold text-white outline-none"
          style={{ background: meta.color }}
        >
          {(Object.keys(STATUS_META) as DocStatus[]).map((s) => (
            <option key={s} value={s} className="bg-ink-surface text-ink-text">
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
