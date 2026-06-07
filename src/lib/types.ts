// Shared domain types. These mirror the Supabase schema in supabase/schema.sql.

export type DocType = "folder" | "chapter" | "scene";
export type DocStatus = "idea" | "outline" | "draft" | "revised" | "done";
export type EntityType =
  | "character"
  | "location"
  | "faction"
  | "item"
  | "lore"
  | "other";
export type NoteKind = "idea" | "note" | "research";

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  description: string;
  target_word_count: number;
  daily_word_goal: number;
  deadline: string | null;
  status: string;
  cover_color: string;
  created_at: string;
  updated_at: string;
}

/** A node in the binder tree. `content` is a TipTap JSON document. */
export interface DocNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  type: DocType;
  title: string;
  synopsis: string;
  status: DocStatus;
  label_color: string;
  pov: string;
  location: string;
  content: unknown;
  content_text: string;
  word_count: number;
  target_words: number;
  include_in_compile: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Snapshot {
  id: string;
  document_id: string;
  project_id: string;
  content: unknown;
  content_text: string;
  word_count: number;
  label: string;
  kind: string;
  created_at: string;
}

export interface Entity {
  id: string;
  project_id: string;
  type: EntityType;
  name: string;
  summary: string;
  color: string;
  fields: Record<string, string>;
  body: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface EntityRelationship {
  id: string;
  project_id: string;
  from_entity: string;
  to_entity: string;
  label: string;
  created_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  kind: NoteKind;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface WritingSession {
  id: string;
  project_id: string;
  day: string; // YYYY-MM-DD
  words_added: number;
  minutes: number;
}

export const STATUS_META: Record<DocStatus, { label: string; color: string }> = {
  idea: { label: "Idea", color: "#94a3b8" },
  outline: { label: "Outline", color: "#a78bfa" },
  draft: { label: "Draft", color: "#60a5fa" },
  revised: { label: "Revised", color: "#fbbf24" },
  done: { label: "Done", color: "#34d399" },
};

export const ENTITY_META: Record<EntityType, { label: string; plural: string }> = {
  character: { label: "Character", plural: "Characters" },
  location: { label: "Location", plural: "Locations" },
  faction: { label: "Faction", plural: "Factions" },
  item: { label: "Item", plural: "Items" },
  lore: { label: "Lore", plural: "Lore" },
  other: { label: "Other", plural: "Other" },
};
