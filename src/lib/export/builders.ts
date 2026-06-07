import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import JSZip from "jszip";
import type { Project } from "../types";
import type { CompiledItem } from "../compile";
import { docToMarkdown, docToHtml, docToParas } from "./serialize";

// ── Markdown ─────────────────────────────────────────────────────────────────
export function buildMarkdown(project: Project, items: CompiledItem[]): string {
  const out: string[] = [`# ${project.title}`];
  if (project.subtitle) out.push(`### ${project.subtitle}`);
  if (project.author) out.push(`*by ${project.author}*`);
  out.push("");

  for (const { doc, depth } of items) {
    if (doc.type !== "scene") {
      const level = Math.min(depth + 1, 6);
      out.push(`${"#".repeat(level)} ${doc.title}`, "");
    } else {
      const md = docToMarkdown(doc.content);
      if (md) out.push(md, "");
      else out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
export async function buildDocx(
  project: Project,
  items: CompiledItem[]
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: project.title, bold: true, size: 56 })],
    }),
  ];
  if (project.subtitle)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: project.subtitle, italics: true, size: 28 })],
      })
    );
  if (project.author)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `by ${project.author}`, size: 24 })],
      })
    );

  for (const { doc, depth } of items) {
    if (doc.type !== "scene") {
      children.push(
        new Paragraph({
          heading: depth === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          pageBreakBefore: depth === 0,
          spacing: { before: 360, after: 160 },
          children: [new TextRun({ text: doc.title, bold: true })],
        })
      );
    } else {
      for (const para of docToParas(doc.content)) {
        const runs = para.runs.map(
          (r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic })
        );
        if (para.kind.startsWith("h")) {
          const map: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
            h1: HeadingLevel.HEADING_1,
            h2: HeadingLevel.HEADING_2,
            h3: HeadingLevel.HEADING_3,
          };
          children.push(new Paragraph({ heading: map[para.kind], children: runs }));
        } else {
          children.push(
            new Paragraph({
              children: runs.length ? runs : [new TextRun("")],
              spacing: { line: 360 },
              indent: para.kind === "quote" ? { left: 480 } : { firstLine: 480 },
            })
          );
        }
      }
    }
  }

  const document = new Document({
    creator: project.author || "Inkwell",
    title: project.title,
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}

// ── EPUB ─────────────────────────────────────────────────────────────────────
function xhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:Georgia,serif;line-height:1.6;margin:5%}h1,h2{font-family:Georgia,serif}p{text-indent:1.4em;margin:0}p:first-of-type{text-indent:0}blockquote{font-style:italic;margin:1em 2em}</style>
</head>
<body>${body}</body></html>`;
}

export async function buildEpub(
  project: Project,
  items: CompiledItem[]
): Promise<Buffer> {
  const zip = new JSZip();
  // mimetype must be first and uncompressed.
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`
  );

  // Group scenes under their nearest chapter/folder so each chapter is one file.
  type Chapter = { id: string; title: string; html: string[] };
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let n = 0;
  const ensure = (title: string): Chapter => {
    n += 1;
    const c: Chapter = { id: `ch${n}`, title, html: [] };
    chapters.push(c);
    return c;
  };
  for (const { doc } of items) {
    if (doc.type !== "scene") {
      current = ensure(doc.title);
      current.html.push(`<h1>${escapeXml(doc.title)}</h1>`);
    } else {
      if (!current) current = ensure(project.title);
      current.html.push(docToHtml(doc.content));
    }
  }
  if (chapters.length === 0) ensure(project.title).html.push("<p></p>");

  chapters.forEach((c) =>
    zip.file(`OEBPS/${c.id}.xhtml`, xhtml(c.title, c.html.join("\n")))
  );

  const manifestItems = chapters
    .map((c) => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("\n    ");
  const spineItems = chapters.map((c) => `<itemref idref="${c.id}"/>`).join("\n    ");
  const navList = chapters
    .map((c) => `<li><a href="${c.id}.xhtml">${escapeXml(c.title)}</a></li>`)
    .join("\n      ");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${project.id}</dc:identifier>
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>${escapeXml(project.author || "Inkwell")}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`
  );

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><h1>Contents</h1><ol>
      ${navList}
</ol></nav></body></html>`
  );

  return zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
