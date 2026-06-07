// Plain-data text search/replace over TipTap JSON. Safe for client use.

type Node = { type?: string; text?: string; content?: Node[] };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildRegex(query: string, caseSensitive: boolean, whole: boolean): RegExp | null {
  if (!query) return null;
  let body = escapeRegex(query);
  if (whole) body = `\\b${body}\\b`;
  return new RegExp(body, caseSensitive ? "g" : "gi");
}

export function countMatches(text: string, re: RegExp | null): number {
  if (!re) return 0;
  const m = text.match(re);
  return m ? m.length : 0;
}

/** Returns a new document with all matches replaced, plus the replacement count. */
export function replaceInDoc(
  doc: unknown,
  re: RegExp | null,
  replacement: string
): { doc: unknown; count: number } {
  if (!re) return { doc, count: 0 };
  let count = 0;
  const clone = (node: Node): Node => {
    if (node.type === "text" && typeof node.text === "string") {
      const replaced = node.text.replace(re, () => {
        count += 1;
        return replacement;
      });
      return { ...node, text: replaced };
    }
    if (node.content) return { ...node, content: node.content.map(clone) };
    return node;
  };
  const next = clone(doc as Node);
  return { doc: next, count };
}
