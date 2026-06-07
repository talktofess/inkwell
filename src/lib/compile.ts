import type { DocNode } from "./types";
import { docToText } from "./tiptap";

export interface CompiledItem {
  doc: DocNode;
  depth: number;
  text: string;
}

/**
 * Flatten the binder tree into reading order (depth-first by `position`),
 * keeping only nodes flagged for compilation. Folders/chapters become
 * headings; scenes contribute prose.
 */
export function compileTree(all: DocNode[]): CompiledItem[] {
  const byParent = new Map<string | null, DocNode[]>();
  for (const d of all) {
    const key = d.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(d);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  }

  const out: CompiledItem[] = [];
  const visit = (parent: string | null, depth: number): void => {
    for (const doc of byParent.get(parent) ?? []) {
      const include = doc.include_in_compile;
      if (include) {
        out.push({ doc, depth, text: docToText(doc.content) });
      }
      visit(doc.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

export function totalWords(all: DocNode[]): number {
  return all.reduce((sum, d) => sum + (d.type === "scene" ? d.word_count : 0), 0);
}
