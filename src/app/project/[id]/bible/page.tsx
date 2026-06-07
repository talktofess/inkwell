import { notFound } from "next/navigation";
import { getProject, getEntities, getRelationships, getDocuments } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { StoryBible } from "@/components/bible/StoryBible";

export const dynamic = "force-dynamic";

export default async function BiblePage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const [entities, relationships, documents] = await Promise.all([
    getEntities(params.id),
    getRelationships(params.id),
    getDocuments(params.id),
  ]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Story Bible" subtitle="Characters, places, factions, items & lore" />
      <div className="min-h-0 flex-1">
        <StoryBible project={project} entities={entities} relationships={relationships} documents={documents} />
      </div>
    </div>
  );
}
