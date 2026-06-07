import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { ProjectRail } from "@/components/ProjectRail";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-ink-bg">
      <ProjectRail projectId={project.id} color={project.cover_color} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
