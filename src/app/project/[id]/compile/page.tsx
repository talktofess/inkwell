import { notFound } from "next/navigation";
import { getProject, getDocuments } from "@/lib/data";
import { compileTree } from "@/lib/compile";
import { docToHtml } from "@/lib/export/serialize";
import { PageHeader } from "@/components/PageHeader";
import { CompileToolbar } from "@/components/compile/CompileToolbar";
import { pluralize, readingMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompilePage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const documents = await getDocuments(params.id);
  const items = compileTree(documents);
  const words = items.reduce((s, i) => s + (i.doc.type === "scene" ? i.doc.word_count : 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="no-print">
        <PageHeader
          title="Compile & Export"
          subtitle={`${pluralize(words, "word")} · ~${readingMinutes(words)} min read · ${items.filter((i) => i.doc.type === "scene").length} scenes`}
        >
          <CompileToolbar projectId={project.id} />
        </PageHeader>
      </div>

      <div className="flex-1 overflow-y-auto bg-ink-bg">
        <article className="print-page mx-auto my-8 max-w-3xl rounded-xl border border-ink-border bg-ink-surface px-12 py-16 font-serif leading-loose shadow-sm print:border-0 print:shadow-none">
          {/* Title page */}
          <div className="mb-16 text-center">
            <h1 className="font-serif text-4xl font-bold">{project.title}</h1>
            {project.subtitle && <p className="mt-2 text-xl text-ink-muted">{project.subtitle}</p>}
            {project.author && <p className="mt-8 text-lg">by {project.author}</p>}
          </div>

          {items.length === 0 && (
            <p className="text-center text-ink-muted">
              Nothing to compile yet. Write some scenes and make sure they’re marked “include in compile.”
            </p>
          )}

          {items.map(({ doc }) =>
            doc.type !== "scene" ? (
              <h2
                key={doc.id}
                className="print-chapter mb-6 mt-12 text-center font-serif text-2xl font-semibold first:mt-0"
              >
                {doc.title}
              </h2>
            ) : (
              <div
                key={doc.id}
                className="ink-prose mb-6"
                dangerouslySetInnerHTML={{ __html: docToHtml(doc.content) }}
              />
            )
          )}
        </article>
      </div>
    </div>
  );
}
