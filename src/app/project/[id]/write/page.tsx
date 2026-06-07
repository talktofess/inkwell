import { notFound } from "next/navigation";
import { getProject, getDocuments, getSnapshots, getSessions } from "@/lib/data";
import { WriteWorkspace } from "@/components/write/WriteWorkspace";
import { localDay } from "@/lib/utils";
import type { DocNode } from "@/lib/types";

export const dynamic = "force-dynamic";

function firstScene(docs: DocNode[]): DocNode | null {
  const scenes = docs.filter((d) => d.type === "scene");
  if (scenes.length === 0) return null;
  // Order by the document tree position so "first" matches the binder.
  return scenes.sort((a, b) => a.position - b.position)[0];
}

export default async function WritePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const documents = await getDocuments(params.id);
  const active =
    (searchParams.doc && documents.find((d) => d.id === searchParams.doc)) ||
    firstScene(documents) ||
    null;

  const [snapshots, sessions] = await Promise.all([
    active ? getSnapshots(active.id) : Promise.resolve([]),
    getSessions(params.id),
  ]);

  const today = localDay();
  const todayWords = sessions.find((s) => s.day === today)?.words_added ?? 0;

  return (
    <WriteWorkspace
      project={project}
      documents={documents}
      activeDoc={active}
      snapshots={snapshots}
      todayWords={todayWords}
    />
  );
}
