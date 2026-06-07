import "server-only";
import { db } from "./supabase/server";
import type {
  Project,
  DocNode,
  Entity,
  EntityRelationship,
  Note,
  Snapshot,
  WritingSession,
} from "./types";

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await db()
    .from("inkwell_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Project[];
}

/** Map of projectId → total scene word count, for dashboard progress bars. */
export async function getWordTotals(): Promise<Record<string, number>> {
  const { data, error } = await db()
    .from("inkwell_documents")
    .select("project_id, word_count, type");
  if (error) throw error;
  const totals: Record<string, number> = {};
  for (const row of (data ?? []) as { project_id: string; word_count: number; type: string }[]) {
    if (row.type !== "scene") continue;
    totals[row.project_id] = (totals[row.project_id] ?? 0) + row.word_count;
  }
  return totals;
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await db().from("inkwell_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function getDocuments(projectId: string): Promise<DocNode[]> {
  const { data, error } = await db()
    .from("inkwell_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as DocNode[];
}

export async function getDocument(id: string): Promise<DocNode | null> {
  const { data, error } = await db().from("inkwell_documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DocNode) ?? null;
}

export async function getEntities(projectId: string): Promise<Entity[]> {
  const { data, error } = await db()
    .from("inkwell_entities")
    .select("*")
    .eq("project_id", projectId)
    .order("type")
    .order("position");
  if (error) throw error;
  return data as Entity[];
}

export async function getRelationships(projectId: string): Promise<EntityRelationship[]> {
  const { data, error } = await db()
    .from("inkwell_entity_relationships")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  return data as EntityRelationship[];
}

export async function getNotes(projectId: string): Promise<Note[]> {
  const { data, error } = await db()
    .from("inkwell_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function getSnapshots(documentId: string): Promise<Snapshot[]> {
  const { data, error } = await db()
    .from("inkwell_snapshots")
    .select("id, document_id, project_id, word_count, label, kind, created_at, content_text")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Snapshot[];
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const { data, error } = await db().from("inkwell_snapshots").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Snapshot) ?? null;
}

export async function getSessions(projectId: string): Promise<WritingSession[]> {
  const { data, error } = await db()
    .from("inkwell_writing_sessions")
    .select("*")
    .eq("project_id", projectId)
    .order("day", { ascending: true });
  if (error) throw error;
  return data as WritingSession[];
}
