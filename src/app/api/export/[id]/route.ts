import { NextRequest } from "next/server";
import { getProject, getDocuments } from "@/lib/data";
import { compileTree } from "@/lib/compile";
import { buildMarkdown, buildDocx, buildEpub } from "@/lib/export/builders";

export const dynamic = "force-dynamic";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "manuscript";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const format = req.nextUrl.searchParams.get("format") ?? "md";
  const project = await getProject(params.id);
  if (!project) return new Response("Not found", { status: 404 });

  const documents = await getDocuments(params.id);
  const items = compileTree(documents);
  const base = slug(project.title);

  try {
    if (format === "md") {
      const md = buildMarkdown(project, items);
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.md"`,
        },
      });
    }
    if (format === "docx") {
      const buf = await buildDocx(project, items);
      return new Response(buf as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}.docx"`,
        },
      });
    }
    if (format === "epub") {
      const buf = await buildEpub(project, items);
      return new Response(buf as BodyInit, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${base}.epub"`,
        },
      });
    }
    return new Response("Unknown format", { status: 400 });
  } catch (err) {
    console.error("export failed", err);
    return new Response("Export failed", { status: 500 });
  }
}
