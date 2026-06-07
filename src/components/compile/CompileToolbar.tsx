"use client";

import { Printer, FileText, FileType, BookOpen } from "lucide-react";

export function CompileToolbar({ projectId }: { projectId: string }) {
  const href = (format: string) => `/api/export/${projectId}?format=${format}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={href("md")} className="btn-subtle h-9 px-3 text-sm">
        <FileText size={15} /> Markdown
      </a>
      <a href={href("docx")} className="btn-subtle h-9 px-3 text-sm">
        <FileType size={15} /> Word (.docx)
      </a>
      <a href={href("epub")} className="btn-subtle h-9 px-3 text-sm">
        <BookOpen size={15} /> EPUB
      </a>
      <button onClick={() => window.print()} className="btn-primary h-9 px-3 text-sm">
        <Printer size={15} /> Print / PDF
      </button>
    </div>
  );
}
