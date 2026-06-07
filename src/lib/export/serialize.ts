// Convert TipTap/ProseMirror JSON into Markdown and HTML. Kept dependency-free
// so it runs in any server context (export route handlers, etc.).

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type?: string;
  text?: string;
  marks?: Mark[];
  content?: Node[];
  attrs?: Record<string, unknown>;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Markdown ────────────────────────────────────────────────────────────────
function markText(text: string, marks: Mark[] = []): string {
  let t = text;
  for (const m of marks) {
    if (m.type === "bold") t = `**${t}**`;
    else if (m.type === "italic") t = `*${t}*`;
    else if (m.type === "strike") t = `~~${t}~~`;
    else if (m.type === "code") t = `\`${t}\``;
    else if (m.type === "link") {
      const href = (m.attrs?.href as string) ?? "";
      t = `[${t}](${href})`;
    }
  }
  return t;
}

function inlineMd(node: Node): string {
  if (node.type === "text") return markText(node.text ?? "", node.marks);
  if (node.type === "hardBreak") return "  \n";
  return (node.content ?? []).map(inlineMd).join("");
}

export function docToMarkdown(doc: unknown): string {
  const root = doc as Node;
  const lines: string[] = [];

  const block = (node: Node, prefix = ""): void => {
    switch (node.type) {
      case "heading": {
        const level = Number(node.attrs?.level ?? 1);
        lines.push(`${"#".repeat(level)} ${(node.content ?? []).map(inlineMd).join("")}`);
        lines.push("");
        break;
      }
      case "paragraph": {
        const text = (node.content ?? []).map(inlineMd).join("");
        lines.push(prefix + text);
        lines.push("");
        break;
      }
      case "blockquote": {
        (node.content ?? []).forEach((c) => block(c, "> "));
        break;
      }
      case "bulletList": {
        (node.content ?? []).forEach((li) => {
          const text = (li.content ?? []).map(inlineMd).join("");
          lines.push(`- ${text}`);
        });
        lines.push("");
        break;
      }
      case "orderedList": {
        (node.content ?? []).forEach((li, i) => {
          const text = (li.content ?? []).map(inlineMd).join("");
          lines.push(`${i + 1}. ${text}`);
        });
        lines.push("");
        break;
      }
      case "horizontalRule":
        lines.push("---", "");
        break;
      case "codeBlock":
        lines.push("```", (node.content ?? []).map(inlineMd).join(""), "```", "");
        break;
      default:
        (node.content ?? []).forEach((c) => block(c, prefix));
    }
  };

  (root?.content ?? []).forEach((c) => block(c));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── HTML (used for EPUB/print) ───────────────────────────────────────────────
function inlineHtml(node: Node): string {
  if (node.type === "text") {
    let t = escapeHtml(node.text ?? "");
    for (const m of node.marks ?? []) {
      if (m.type === "bold") t = `<strong>${t}</strong>`;
      else if (m.type === "italic") t = `<em>${t}</em>`;
      else if (m.type === "underline") t = `<u>${t}</u>`;
      else if (m.type === "strike") t = `<s>${t}</s>`;
      else if (m.type === "code") t = `<code>${t}</code>`;
      else if (m.type === "link")
        t = `<a href="${escapeHtml(String(m.attrs?.href ?? ""))}">${t}</a>`;
    }
    return t;
  }
  if (node.type === "hardBreak") return "<br/>";
  return (node.content ?? []).map(inlineHtml).join("");
}

export function docToHtml(doc: unknown): string {
  const root = doc as Node;
  const html: string[] = [];
  const block = (node: Node): void => {
    switch (node.type) {
      case "heading":
        html.push(`<h${node.attrs?.level ?? 1}>${(node.content ?? []).map(inlineHtml).join("")}</h${node.attrs?.level ?? 1}>`);
        break;
      case "paragraph":
        html.push(`<p>${(node.content ?? []).map(inlineHtml).join("")}</p>`);
        break;
      case "blockquote":
        html.push("<blockquote>");
        (node.content ?? []).forEach(block);
        html.push("</blockquote>");
        break;
      case "bulletList":
        html.push("<ul>");
        (node.content ?? []).forEach((li) =>
          html.push(`<li>${(li.content ?? []).map(inlineHtml).join("")}</li>`)
        );
        html.push("</ul>");
        break;
      case "orderedList":
        html.push("<ol>");
        (node.content ?? []).forEach((li) =>
          html.push(`<li>${(li.content ?? []).map(inlineHtml).join("")}</li>`)
        );
        html.push("</ol>");
        break;
      case "horizontalRule":
        html.push("<hr/>");
        break;
      case "codeBlock":
        html.push(`<pre><code>${escapeHtml((node.content ?? []).map((c) => c.text ?? "").join(""))}</code></pre>`);
        break;
      default:
        (node.content ?? []).forEach(block);
    }
  };
  (root?.content ?? []).forEach(block);
  return html.join("\n");
}

/** Paragraph-level structure used by the DOCX builder. */
export interface FlatPara {
  kind: "h1" | "h2" | "h3" | "p" | "quote";
  runs: { text: string; bold?: boolean; italic?: boolean }[];
}

export function docToParas(doc: unknown): FlatPara[] {
  const root = doc as Node;
  const paras: FlatPara[] = [];
  const runsOf = (nodes: Node[] = []): FlatPara["runs"] =>
    nodes.flatMap((n) => {
      if (n.type === "text") {
        const marks = n.marks ?? [];
        return [
          {
            text: n.text ?? "",
            bold: marks.some((m) => m.type === "bold"),
            italic: marks.some((m) => m.type === "italic"),
          },
        ];
      }
      if (n.type === "hardBreak") return [{ text: "\n" }];
      return runsOf(n.content);
    });

  const block = (node: Node): void => {
    if (node.type === "heading") {
      const lvl = Number(node.attrs?.level ?? 1);
      paras.push({ kind: (`h${Math.min(lvl, 3)}` as FlatPara["kind"]), runs: runsOf(node.content) });
    } else if (node.type === "paragraph") {
      paras.push({ kind: "p", runs: runsOf(node.content) });
    } else if (node.type === "blockquote") {
      (node.content ?? []).forEach((c) =>
        paras.push({ kind: "quote", runs: runsOf(c.content) })
      );
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      (node.content ?? []).forEach((li) =>
        paras.push({ kind: "p", runs: [{ text: "• " }, ...runsOf(li.content)] })
      );
    } else if (node.content) {
      node.content.forEach(block);
    }
  };
  (root?.content ?? []).forEach(block);
  return paras;
}
