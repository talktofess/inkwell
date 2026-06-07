"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import { EMPTY_DOC, docToText, countWords } from "@/lib/tiptap";
import type { DocType, EntityType, NoteKind } from "@/lib/types";

// ── document tree ───────────────────────────────────────────────────────────
async function nextPosition(projectId: string, parentId: string | null): Promise<number> {
  const query = db()
    .from("documents")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);
  const { data } = parentId
    ? await query.eq("parent_id", parentId)
    : await query.is("parent_id", null);
  const top = data?.[0]?.position ?? -1;
  return top + 1;
}

export async function createDocument(
  projectId: string,
  type: DocType,
  parentId: string | null,
  title?: string
): Promise<string> {
  const position = await nextPosition(projectId, parentId);
  const { data, error } = await db()
    .from("documents")
    .insert({
      project_id: projectId,
      parent_id: parentId,
      type,
      title: title ?? (type === "scene" ? "New Scene" : type === "chapter" ? "New Chapter" : "New Folder"),
      content: EMPTY_DOC,
      position,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
  return data.id as string;
}

export async function renameDocument(projectId: string, id: string, title: string) {
  const { error } = await db().from("documents").update({ title }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

export async function updateDocumentMeta(
  projectId: string,
  id: string,
  patch: Record<string, unknown>
) {
  const { error } = await db().from("documents").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

/**
 * Persist editor content. Recomputes word count, and credits the positive
 * delta to today's writing session so analytics/streaks stay accurate.
 * Returns the new word count.
 */
export async function saveDocumentContent(
  projectId: string,
  id: string,
  content: unknown,
  day: string,
  minutesDelta = 0
): Promise<number> {
  const text = docToText(content);
  const words = countWords(text);

  const { data: prev } = await db()
    .from("documents")
    .select("word_count")
    .eq("id", id)
    .maybeSingle();
  const prevWords = prev?.word_count ?? 0;

  const { error } = await db()
    .from("documents")
    .update({ content, content_text: text, word_count: words })
    .eq("id", id);
  if (error) throw error;

  const added = Math.max(0, words - prevWords);
  if (added > 0 || minutesDelta > 0) {
    const { data: existing } = await db()
      .from("writing_sessions")
      .select("id, words_added, minutes")
      .eq("project_id", projectId)
      .eq("day", day)
      .maybeSingle();
    if (existing) {
      await db()
        .from("writing_sessions")
        .update({
          words_added: existing.words_added + added,
          minutes: existing.minutes + minutesDelta,
        })
        .eq("id", existing.id);
    } else {
      await db()
        .from("writing_sessions")
        .insert({ project_id: projectId, day, words_added: added, minutes: minutesDelta });
    }
  }
  return words;
}

export async function moveDocument(
  projectId: string,
  id: string,
  newParentId: string | null,
  orderedIds: string[]
) {
  await db().from("documents").update({ parent_id: newParentId }).eq("id", id);
  // Reindex siblings to match the provided order.
  await Promise.all(
    orderedIds.map((docId, index) =>
      db().from("documents").update({ position: index }).eq("id", docId)
    )
  );
  revalidatePath(`/project/${projectId}`);
}

export async function reorderSiblings(projectId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((docId, index) =>
      db().from("documents").update({ position: index }).eq("id", docId)
    )
  );
  revalidatePath(`/project/${projectId}`);
}

export async function deleteDocument(projectId: string, id: string) {
  const { error } = await db().from("documents").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

// ── snapshots / version history ──────────────────────────────────────────────
export async function createSnapshot(
  projectId: string,
  documentId: string,
  label: string,
  kind: "manual" | "auto" = "manual"
) {
  const { data: doc } = await db()
    .from("documents")
    .select("content, content_text, word_count")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return;
  const { error } = await db().from("snapshots").insert({
    project_id: projectId,
    document_id: documentId,
    content: doc.content,
    content_text: doc.content_text,
    word_count: doc.word_count,
    label,
    kind,
  });
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

export async function restoreSnapshot(projectId: string, snapshotId: string) {
  const { data: snap } = await db()
    .from("snapshots")
    .select("*")
    .eq("id", snapshotId)
    .maybeSingle();
  if (!snap) return;
  // Snapshot current state first so a restore is itself reversible.
  await createSnapshot(projectId, snap.document_id, "Before restore", "auto");
  await db()
    .from("documents")
    .update({
      content: snap.content,
      content_text: snap.content_text,
      word_count: snap.word_count,
    })
    .eq("id", snap.document_id);
  revalidatePath(`/project/${projectId}`);
}

export async function deleteSnapshot(projectId: string, snapshotId: string) {
  await db().from("snapshots").delete().eq("id", snapshotId);
  revalidatePath(`/project/${projectId}`);
}

// ── story bible (entities) ───────────────────────────────────────────────────
export async function createEntity(projectId: string, type: EntityType, name?: string): Promise<string> {
  const { data, error } = await db()
    .from("entities")
    .insert({ project_id: projectId, type, name: name ?? "New " + type })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
  return data.id as string;
}

export async function updateEntity(
  projectId: string,
  id: string,
  patch: Record<string, unknown>
) {
  const { error } = await db().from("entities").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

export async function deleteEntity(projectId: string, id: string) {
  await db().from("entities").delete().eq("id", id);
  revalidatePath(`/project/${projectId}`);
}

export async function createRelationship(
  projectId: string,
  fromEntity: string,
  toEntity: string,
  label: string
) {
  await db()
    .from("entity_relationships")
    .insert({ project_id: projectId, from_entity: fromEntity, to_entity: toEntity, label });
  revalidatePath(`/project/${projectId}`);
}

export async function deleteRelationship(projectId: string, id: string) {
  await db().from("entity_relationships").delete().eq("id", id);
  revalidatePath(`/project/${projectId}`);
}

// ── notes / ideas inbox ──────────────────────────────────────────────────────
export async function createNote(projectId: string, kind: NoteKind): Promise<string> {
  const { data, error } = await db()
    .from("notes")
    .insert({ project_id: projectId, kind, title: "", body: "" })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
  return data.id as string;
}

export async function updateNote(projectId: string, id: string, patch: Record<string, unknown>) {
  await db().from("notes").update(patch).eq("id", id);
  revalidatePath(`/project/${projectId}`);
}

export async function deleteNote(projectId: string, id: string) {
  await db().from("notes").delete().eq("id", id);
  revalidatePath(`/project/${projectId}`);
}

// ── manual session minutes (sprint timer) ────────────────────────────────────
export async function logSprintMinutes(projectId: string, day: string, minutes: number) {
  const { data: existing } = await db()
    .from("writing_sessions")
    .select("id, minutes")
    .eq("project_id", projectId)
    .eq("day", day)
    .maybeSingle();
  if (existing) {
    await db()
      .from("writing_sessions")
      .update({ minutes: existing.minutes + minutes })
      .eq("id", existing.id);
  } else {
    await db()
      .from("writing_sessions")
      .insert({ project_id: projectId, day, words_added: 0, minutes });
  }
  revalidatePath(`/project/${projectId}`);
}
