import { notFound } from "next/navigation";
import { getProject, getDocuments } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { Corkboard } from "@/components/outline/Corkboard";

export const dynamic = "force-dynamic";

export default async function OutlinePage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const documents = await getDocuments(params.id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Outline" subtitle="Drag the index cards to reorder · click a title to open it" />
      <div className="flex-1 overflow-y-auto p-6">
        <Corkboard project={project} documents={documents} />
      </div>
    </div>
  );
}
