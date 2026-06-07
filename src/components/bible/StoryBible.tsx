"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search, X, Link2 } from "lucide-react";
import type { DocNode, Entity, EntityRelationship, EntityType, Project } from "@/lib/types";
import { ENTITY_META } from "@/lib/types";
import {
  createEntity,
  updateEntity,
  deleteEntity,
  createRelationship,
  deleteRelationship,
} from "@/app/project/[id]/actions";

const TYPES = Object.keys(ENTITY_META) as EntityType[];
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444", "#64748b"];

export function StoryBible({
  project,
  entities: initialEntities,
  relationships,
  documents,
}: {
  project: Project;
  entities: Entity[];
  relationships: EntityRelationship[];
  documents: DocNode[];
}) {
  const router = useRouter();
  const [entities, setEntities] = useState(initialEntities);
  const [filterType, setFilterType] = useState<EntityType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialEntities[0]?.id ?? null);

  const selected = entities.find((e) => e.id === selectedId) ?? null;

  const filtered = useMemo(
    () =>
      entities.filter(
        (e) =>
          (filterType === "all" || e.type === filterType) &&
          e.name.toLowerCase().includes(search.toLowerCase())
      ),
    [entities, filterType, search]
  );

  const patch = (id: string, p: Partial<Entity>) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));
    updateEntity(project.id, id, p as Record<string, unknown>);
  };

  const add = async (type: EntityType) => {
    const id = await createEntity(project.id, type);
    router.refresh();
    setSelectedId(id);
    setEntities((prev) => [
      ...prev,
      {
        id,
        project_id: project.id,
        type,
        name: "New " + type,
        summary: "",
        color: "#64748b",
        fields: {},
        body: "",
        position: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setEntities((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    await deleteEntity(project.id, id);
    router.refresh();
  };

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-ink-border bg-ink-surface">
        <div className="border-b border-ink-border p-3">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bible…"
              className="input pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip active={filterType === "all"} onClick={() => setFilterType("all")}>
              All
            </Chip>
            {TYPES.map((t) => (
              <Chip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
                {ENTITY_META[t].plural}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`mb-1 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left ${
                selectedId === e.id ? "bg-ink-accent/15" : "hover:bg-ink-border/40"
              }`}
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{e.name}</span>
                {e.summary && <span className="block truncate text-xs text-ink-muted">{e.summary}</span>}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-4 text-xs text-ink-muted">Nothing here yet.</p>}
        </div>

        <div className="border-t border-ink-border p-2">
          <div className="grid grid-cols-2 gap-1">
            {TYPES.slice(0, 4).map((t) => (
              <button key={t} onClick={() => add(t)} className="btn-subtle h-8 text-xs">
                <Plus size={13} /> {ENTITY_META[t].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <EntityEditor
            key={selected.id}
            entity={selected}
            allEntities={entities}
            relationships={relationships}
            documents={documents}
            projectId={project.id}
            onPatch={(p) => patch(selected.id, p)}
            onDelete={() => remove(selected.id)}
            onRefresh={() => router.refresh()}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            Select or create an entry to begin.
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? "bg-ink-accent text-white" : "bg-ink-border/40 text-ink-muted hover:bg-ink-border/70"
      }`}
    >
      {children}
    </button>
  );
}

function EntityEditor({
  entity,
  allEntities,
  relationships,
  documents,
  projectId,
  onPatch,
  onDelete,
  onRefresh,
}: {
  entity: Entity;
  allEntities: Entity[];
  relationships: EntityRelationship[];
  documents: DocNode[];
  projectId: string;
  onPatch: (p: Partial<Entity>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(entity.name);
  const [summary, setSummary] = useState(entity.summary);
  const [body, setBody] = useState(entity.body);
  const [fields, setFields] = useState<Record<string, string>>(entity.fields ?? {});
  const [newKey, setNewKey] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relLabel, setRelLabel] = useState("knows");

  const appearances = useMemo(() => {
    const needle = entity.name.trim().toLowerCase();
    if (!needle) return [];
    return documents.filter(
      (d) => d.type === "scene" && d.content_text.toLowerCase().includes(needle)
    );
  }, [documents, entity.name]);

  const rels = relationships.filter((r) => r.from_entity === entity.id || r.to_entity === entity.id);
  const nameOf = (id: string) => allEntities.find((e) => e.id === id)?.name ?? "—";

  const saveField = (key: string, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onPatch({ fields: next });
  };
  const removeField = (key: string) => {
    const next = { ...fields };
    delete next[key];
    setFields(next);
    onPatch({ fields: next });
  };
  const addField = () => {
    const k = newKey.trim();
    if (!k || fields[k] !== undefined) return;
    saveField(k, "");
    setNewKey("");
  };

  const addRelationship = async () => {
    if (!relTarget) return;
    await createRelationship(projectId, entity.id, relTarget, relLabel || "knows");
    setRelTarget("");
    onRefresh();
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="h-6 w-6 rounded-full" style={{ background: entity.color }} />
        </div>
        <div className="flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== entity.name && onPatch({ name })}
            className="w-full bg-transparent font-serif text-2xl font-bold outline-none"
            placeholder="Name"
          />
          <p className="text-xs uppercase tracking-wide text-ink-muted">{ENTITY_META[entity.type].label}</p>
        </div>
        <button onClick={onDelete} className="btn-ghost h-9 w-9 p-0 text-ink-muted hover:text-red-500">
          <Trash2 size={17} />
        </button>
      </div>

      <div className="mb-4 flex gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onPatch({ color: c })}
            className={`h-5 w-5 rounded-full ${entity.color === c ? "ring-2 ring-offset-2 ring-ink-accent ring-offset-ink-bg" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <label className="label mb-1 block">One-line summary</label>
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={() => summary !== entity.summary && onPatch({ summary })}
        className="input mb-5"
        placeholder="A short description"
      />

      {/* Custom fields */}
      <div className="mb-5">
        <label className="label mb-2 block">Attributes</label>
        <div className="space-y-2">
          {Object.entries(fields).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-sm font-medium text-ink-muted">{key}</span>
              <input
                defaultValue={value}
                onBlur={(e) => saveField(key, e.target.value)}
                className="input flex-1"
              />
              <button onClick={() => removeField(key)} className="text-ink-muted hover:text-red-500">
                <X size={15} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addField()}
              placeholder="Add attribute (e.g. Age, Role, Eyes)"
              className="input flex-1"
            />
            <button onClick={addField} className="btn-subtle h-9 px-3">
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      <label className="label mb-1 block">Notes</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => body !== entity.body && onPatch({ body })}
        rows={8}
        placeholder="Backstory, arc, descriptions, voice…"
        className="input mb-5 resize-y leading-relaxed"
      />

      {/* Relationships */}
      <div className="mb-5">
        <label className="label mb-2 block">Relationships</label>
        <div className="space-y-1">
          {rels.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg bg-ink-border/30 px-3 py-1.5 text-sm">
              <Link2 size={13} className="text-ink-muted" />
              <span>
                {r.from_entity === entity.id ? entity.name : nameOf(r.from_entity)}{" "}
                <span className="text-ink-muted">{r.label}</span>{" "}
                {r.to_entity === entity.id ? entity.name : nameOf(r.to_entity)}
              </span>
              <button
                onClick={async () => {
                  await deleteRelationship(projectId, r.id);
                  onRefresh();
                }}
                className="ml-auto text-ink-muted hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={relLabel}
            onChange={(e) => setRelLabel(e.target.value)}
            className="input w-32"
            placeholder="relation"
          />
          <select value={relTarget} onChange={(e) => setRelTarget(e.target.value)} className="input flex-1">
            <option value="">Select entity…</option>
            {allEntities
              .filter((e) => e.id !== entity.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
          <button onClick={addRelationship} disabled={!relTarget} className="btn-subtle h-9 px-3">
            <Plus size={15} /> Link
          </button>
        </div>
      </div>

      {/* Appearances */}
      <div>
        <label className="label mb-2 block">Appears in {appearances.length} scene{appearances.length === 1 ? "" : "s"}</label>
        {appearances.length === 0 ? (
          <p className="text-xs text-ink-muted">No scene mentions “{entity.name}” yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {appearances.map((d) => (
              <Link
                key={d.id}
                href={`/project/${projectId}/write?doc=${d.id}`}
                className="rounded-full bg-ink-border/40 px-2.5 py-1 text-xs hover:bg-ink-accent hover:text-white"
              >
                {d.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
