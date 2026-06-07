// Utilities for working with TipTap/ProseMirror JSON documents on the server
// (where we don't have a DOM) and the client alike.

type JSONNode = {
  type?: string;
  text?: string;
  content?: JSONNode[];
  attrs?: Record<string, unknown>;
};

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "horizontalRule",
]);

/** Flatten a TipTap document into plain text, one block per line. */
export function docToText(doc: unknown): string {
  const out: string[] = [];
  const walk = (node: JSONNode | undefined, line: string[]): void => {
    if (!node) return;
    if (node.type === "text" && node.text) {
      line.push(node.text);
      return;
    }
    if (node.type === "hardBreak") {
      line.push("\n");
      return;
    }
    const isBlock = node.type ? BLOCK_TYPES.has(node.type) : false;
    if (isBlock) {
      const local: string[] = [];
      node.content?.forEach((c) => walk(c, local));
      const text = local.join("").trim();
      if (text) out.push(text);
      return;
    }
    node.content?.forEach((c) => walk(c, line));
  };
  const root = doc as JSONNode | undefined;
  root?.content?.forEach((c) => walk(c, []));
  return out.join("\n\n");
}

/** Count words in a plain-text string. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Convenience: word count straight from a TipTap document. */
export function docWordCount(doc: unknown): number {
  return countWords(docToText(doc));
}

export const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
