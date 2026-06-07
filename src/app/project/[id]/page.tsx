import { redirect } from "next/navigation";

export default function ProjectIndex({ params }: { params: { id: string } }) {
  redirect(`/project/${params.id}/write`);
}
