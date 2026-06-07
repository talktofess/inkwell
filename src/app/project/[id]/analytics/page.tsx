import { notFound } from "next/navigation";
import { getProject, getDocuments, getSessions } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { Analytics } from "@/components/analytics/Analytics";
import { ProjectSettings } from "@/components/ProjectSettings";
import type { DocStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const [documents, sessions] = await Promise.all([
    getDocuments(params.id),
    getSessions(params.id),
  ]);

  const statusCounts = { idea: 0, outline: 0, draft: 0, revised: 0, done: 0 } as Record<DocStatus, number>;
  let totalWords = 0;
  for (const d of documents) {
    if (d.type === "scene") {
      statusCounts[d.status]++;
      totalWords += d.word_count;
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Analytics" subtitle="Progress, streaks & writing habits">
        <ProjectSettings project={project} />
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-6">
        <Analytics project={project} sessions={sessions} statusCounts={statusCounts} totalWords={totalWords} />
      </div>
    </div>
  );
}
