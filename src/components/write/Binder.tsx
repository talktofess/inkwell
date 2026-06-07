"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  BookOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronUp,
} from "lucide-react";
import type { DocNode, DocType } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

interface TreeNode extends DocNode {
  children: TreeNode[];
}

function buildTree(docs: DocNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  docs.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.position - b.position);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

const ICONS: Record<DocType, typeof FileText> = {
  folder: Folder,
  chapter: BookOpen,
  scene: FileText,
};

export function Binder({
  documents,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: {
  documents: DocNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: DocType, parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onReorder: (parentId: string | null, orderedIds: string[]) => void;
}) {
  const tree = useMemo(() => buildTree(documents), [documents]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(documents.filter((d) => d.type !== "scene").map((d) => d.id))
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const move = (siblings: TreeNode[], index: number, dir: -1 | 1, parentId: string | null) => {
    const target = index + dir;
    if (target < 0 || target >= siblings.length) return;
    const ids = siblings.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(parentId, ids);
  };

  const renderNodes = (nodes: TreeNode[], depth: number, parentId: string | null) =>
    nodes.map((node, i) => {
      const Icon = ICONS[node.type];
      const isOpen = expanded.has(node.id);
      const isActive = node.id === activeId;
      const status = STATUS_META[node.status];
      return (
        <div key={node.id}>
          <div
            className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${
              isActive ? "bg-ink-accent/15 text-ink-text" : "hover:bg-ink-border/40"
            }`}
            style={{ paddingLeft: depth * 12 + 4 }}
          >
            {node.type !== "scene" ? (
              <button onClick={() => toggle(node.id)} className="p-0.5 text-ink-muted">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-[18px]" />
            )}

            <button
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => setEditing(node.id)}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
            >
              <Icon size={14} className="shrink-0 text-ink-muted" />
              {editing === node.id ? (
                <input
                  autoFocus
                  defaultValue={node.title}
                  onBlur={(e) => {
                    onRename(node.id, e.target.value.trim() || "Untitled");
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-full rounded border border-ink-accent bg-ink-bg px-1 text-sm outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{node.title}</span>
              )}
            </button>

            {node.type === "scene" && node.word_count > 0 && editing !== node.id && (
              <span className="shrink-0 text-[10px] tabular-nums text-ink-muted">{node.word_count}</span>
            )}
            {node.type === "scene" && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: status.color }}
                title={status.label}
              />
            )}

            <div className="relative flex shrink-0 items-center opacity-0 group-hover:opacity-100">
              <button onClick={() => move(nodes, i, -1, parentId)} className="p-0.5 text-ink-muted hover:text-ink-text" title="Move up">
                <ChevronUp size={13} />
              </button>
              {node.type !== "scene" && (
                <button onClick={() => onAdd("scene", node.id)} className="p-0.5 text-ink-muted hover:text-ink-text" title="Add scene">
                  <Plus size={13} />
                </button>
              )}
              <button onClick={() => setMenuFor(menuFor === node.id ? null : node.id)} className="p-0.5 text-ink-muted hover:text-ink-text">
                <MoreHorizontal size={13} />
              </button>
              {menuFor === node.id && (
                <div
                  className="card absolute right-0 top-6 z-20 w-32 p-1 text-sm shadow-lg"
                  onMouseLeave={() => setMenuFor(null)}
                >
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-ink-border/50"
                    onClick={() => {
                      setEditing(node.id);
                      setMenuFor(null);
                    }}
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-red-500 hover:bg-ink-border/50"
                    onClick={() => {
                      if (confirm(`Delete “${node.title}”? This cannot be undone.`)) onDelete(node.id);
                      setMenuFor(null);
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {node.type !== "scene" && isOpen && node.children.length > 0 && (
            <div>{renderNodes(node.children, depth + 1, node.id)}</div>
          )}
        </div>
      );
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-border px-3 py-2">
        <span className="label">Manuscript</span>
        <div className="flex gap-0.5">
          <button onClick={() => onAdd("scene", null)} className="btn-ghost h-7 w-7 p-0" title="Add scene">
            <FileText size={14} />
          </button>
          <button onClick={() => onAdd("chapter", null)} className="btn-ghost h-7 w-7 p-0" title="Add chapter">
            <BookOpen size={14} />
          </button>
          <button onClick={() => onAdd("folder", null)} className="btn-ghost h-7 w-7 p-0" title="Add folder">
            <Folder size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">{renderNodes(tree, 0, null)}</div>
    </div>
  );
}
