import { notFound } from "next/navigation";
import { getProject, getNotes } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { NotesBoard } from "@/components/notes/NotesBoard";

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const notes = await getNotes(params.id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Notes & Ideas" subtitle="A scratchpad for sparks, research and reminders" />
      <div className="flex-1 overflow-y-auto p-6">
        <NotesBoard project={project} notes={notes} />
      </div>
    </div>
  );
}
