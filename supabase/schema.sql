-- ============================================================================
-- Inkwell — Supabase schema
-- ----------------------------------------------------------------------------
-- This project SHARES a Supabase database with the vault/wallet apps, so every
-- Inkwell object is namespaced with an `inkwell_` prefix to coexist alongside
-- `vault_keys`, `items`, etc. without collisions.
--
-- Run this in the Supabase SQL editor (or `supabase db push`). It is idempotent
-- — safe to re-run. All access happens server-side with the service-role key,
-- which bypasses RLS; the anon/authenticated key (used by vault/wallet) is NOT
-- granted access to these tables, and RLS is enabled with no public policies as
-- defense in depth.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── updated_at helper (own name; does not touch vault's touch_updated_at) ───
create or replace function inkwell_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── enums (prefixed to avoid clashing with other apps in the same db) ───────
do $$ begin
  create type inkwell_doc_type    as enum ('folder', 'chapter', 'scene');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inkwell_doc_status  as enum ('idea', 'outline', 'draft', 'revised', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inkwell_entity_type as enum ('character', 'location', 'faction', 'item', 'lore', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inkwell_note_kind   as enum ('idea', 'note', 'research');
exception when duplicate_object then null; end $$;

-- ── projects (a novel) ─────────────────────────────────────────────────────
create table if not exists inkwell_projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null default 'Untitled Novel',
  subtitle          text default '',
  author            text default '',
  genre             text default '',
  description       text default '',
  target_word_count integer not null default 80000,
  daily_word_goal   integer not null default 1000,
  deadline          date,
  status            text not null default 'drafting',
  cover_color       text not null default '#6366f1',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists trg_inkwell_projects_updated on inkwell_projects;
create trigger trg_inkwell_projects_updated before update on inkwell_projects
  for each row execute function inkwell_set_updated_at();

-- ── documents (the binder tree: folders, chapters, scenes) ─────────────────
create table if not exists inkwell_documents (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references inkwell_projects(id) on delete cascade,
  parent_id          uuid references inkwell_documents(id) on delete cascade,
  type               inkwell_doc_type not null default 'scene',
  title              text not null default 'Untitled',
  synopsis           text default '',
  status             inkwell_doc_status not null default 'draft',
  label_color        text default '',
  pov                text default '',
  location           text default '',
  content            jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text       text not null default '',
  word_count         integer not null default 0,
  target_words       integer not null default 0,
  include_in_compile boolean not null default true,
  position           integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_inkwell_documents_project on inkwell_documents(project_id);
create index if not exists idx_inkwell_documents_parent  on inkwell_documents(parent_id);
create index if not exists idx_inkwell_documents_order   on inkwell_documents(project_id, parent_id, position);
drop trigger if exists trg_inkwell_documents_updated on inkwell_documents;
create trigger trg_inkwell_documents_updated before update on inkwell_documents
  for each row execute function inkwell_set_updated_at();

-- ── snapshots (per-document version history) ───────────────────────────────
create table if not exists inkwell_snapshots (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references inkwell_documents(id) on delete cascade,
  project_id   uuid not null references inkwell_projects(id) on delete cascade,
  content      jsonb not null,
  content_text text not null default '',
  word_count   integer not null default 0,
  label        text default '',
  kind         text not null default 'manual', -- 'manual' | 'auto'
  created_at   timestamptz not null default now()
);
create index if not exists idx_inkwell_snapshots_document on inkwell_snapshots(document_id, created_at desc);

-- ── entities (story bible: characters, locations, etc.) ────────────────────
create table if not exists inkwell_entities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references inkwell_projects(id) on delete cascade,
  type        inkwell_entity_type not null default 'character',
  name        text not null default 'Unnamed',
  summary     text default '',
  color       text not null default '#64748b',
  fields      jsonb not null default '{}'::jsonb,  -- arbitrary key/value attributes
  body        text default '',                      -- long-form notes (markdown)
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_inkwell_entities_project on inkwell_entities(project_id, type, position);
drop trigger if exists trg_inkwell_entities_updated on inkwell_entities;
create trigger trg_inkwell_entities_updated before update on inkwell_entities
  for each row execute function inkwell_set_updated_at();

-- ── entity relationships (graph edges between bible entries) ───────────────
create table if not exists inkwell_entity_relationships (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references inkwell_projects(id) on delete cascade,
  from_entity uuid not null references inkwell_entities(id) on delete cascade,
  to_entity   uuid not null references inkwell_entities(id) on delete cascade,
  label       text not null default 'knows',
  created_at  timestamptz not null default now()
);
create index if not exists idx_inkwell_rel_project on inkwell_entity_relationships(project_id);

-- ── notes (ideas inbox / research / scratchpad) ────────────────────────────
create table if not exists inkwell_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references inkwell_projects(id) on delete cascade,
  kind       inkwell_note_kind not null default 'idea',
  title      text not null default '',
  body       text not null default '',
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inkwell_notes_project on inkwell_notes(project_id, pinned desc, updated_at desc);
drop trigger if exists trg_inkwell_notes_updated on inkwell_notes;
create trigger trg_inkwell_notes_updated before update on inkwell_notes
  for each row execute function inkwell_set_updated_at();

-- ── writing sessions (one row per project per day; powers analytics) ───────
create table if not exists inkwell_writing_sessions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references inkwell_projects(id) on delete cascade,
  day         date not null,
  words_added integer not null default 0,
  minutes     integer not null default 0,
  unique (project_id, day)
);
create index if not exists idx_inkwell_sessions_project on inkwell_writing_sessions(project_id, day);

-- ── lock everything down (service-role bypasses RLS) ───────────────────────
alter table inkwell_projects             enable row level security;
alter table inkwell_documents            enable row level security;
alter table inkwell_snapshots            enable row level security;
alter table inkwell_entities             enable row level security;
alter table inkwell_entity_relationships enable row level security;
alter table inkwell_notes                enable row level security;
alter table inkwell_writing_sessions     enable row level security;
-- (No policies and no grants to anon/authenticated: only the service-role key
--  gets through — which is all the Inkwell server ever uses.)
