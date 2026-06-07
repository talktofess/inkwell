"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";
import { EMPTY_DOC } from "@/lib/tiptap";

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") || "Untitled Novel").trim() || "Untitled Novel";
  const author = String(formData.get("author") || "").trim();
  const genre = String(formData.get("genre") || "").trim();
  const target = parseInt(String(formData.get("target_word_count") || "80000"), 10) || 80000;
  const dailyGoal = parseInt(String(formData.get("daily_word_goal") || "1000"), 10) || 1000;
  const color = String(formData.get("cover_color") || "#6366f1");

  const { data: project, error } = await db()
    .from("projects")
    .insert({
      title,
      author,
      genre,
      target_word_count: target,
      daily_word_goal: dailyGoal,
      cover_color: color,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Seed a starter structure: a chapter with one scene.
  const { data: chapter } = await db()
    .from("documents")
    .insert({
      project_id: project.id,
      type: "chapter",
      title: "Chapter One",
      position: 0,
    })
    .select("id")
    .single();

  await db().from("documents").insert({
    project_id: project.id,
    parent_id: chapter?.id ?? null,
    type: "scene",
    title: "Opening Scene",
    content: EMPTY_DOC,
    position: 0,
  });

  revalidatePath("/");
  redirect(`/project/${project.id}/write`);
}

export async function updateProject(id: string, patch: Record<string, unknown>) {
  const { error } = await db().from("projects").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/project/${id}`);
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  const { error } = await db().from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
