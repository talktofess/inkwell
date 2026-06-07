-- ============================================================================
-- Inkwell — Supabase schema
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh
-- project. All access happens server-side with the service-role key, which
-- bypasses RLS. We still ENABLE RLS with no public policies so that the anon
-- key cannot read or write anything if it ever leaks.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── updated_at helper ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type doc_type   as enum ('folder', 'chapter', 'scene');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('idea', 'outline', 'draft', 'revised', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_type as enum ('character', 'location', 'faction', 'item', 'lore', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_kind as enum ('idea', 'note', 'research');
exception when duplicate_object then null; end $$;

-- ── projects (a novel) ─────────────────────────────────────────────────────
create table if not exists projects (
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
drop trigger if exists trg_projects_updated on projects;
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

-- ── documents (the binder tree: folders, chapters, scenes) ─────────────────
create table if not exists documents (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  parent_id          uuid references documents(id) on delete cascade,
  type               doc_type not null default 'scene',
  title              text not null default 'Untitled',
  synopsis           text default '',
  status             doc_status not null default 'draft',
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
create index if not exists idx_documents_project on documents(project_id);
create index if not exists idx_documents_parent  on documents(parent_id);
create index if not exists idx_documents_order    on documents(project_id, parent_id, position);
drop trigger if exists trg_documents_updated on documents;
create trigger trg_documents_updated before update on documents
  for each row execute function set_updated_at();

-- ── snapshots (per-document version history) ───────────────────────────────
create table if not exists snapshots (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  content     jsonb not null,
  content_text text not null default '',
  word_count  integer not null default 0,
  label       text default '',
  kind        text not null default 'manual', -- 'manual' | 'auto'
  created_at  timestamptz not null default now()
);
create index if not exists idx_snapshots_document on snapshots(document_id, created_at desc);

-- ── entities (story bible: characters, locations, etc.) ────────────────────
create table if not exists entities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  type        entity_type not null default 'character',
  name        text not null default 'Unnamed',
  summary     text default '',
  color       text not null default '#64748b',
  fields      jsonb not null default '{}'::jsonb,  -- arbitrary key/value attributes
  body        text default '',                      -- long-form notes (markdown)
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_entities_project on entities(project_id, type, position);
drop trigger if exists trg_entities_updated on entities;
create trigger trg_entities_updated before update on entities
  for each row execute function set_updated_at();

-- ── entity relationships (graph edges between bible entries) ───────────────
create table if not exists entity_relationships (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  from_entity uuid not null references entities(id) on delete cascade,
  to_entity   uuid not null references entities(id) on delete cascade,
  label       text not null default 'knows',
  created_at  timestamptz not null default now()
);
create index if not exists idx_rel_project on entity_relationships(project_id);

-- ── notes (ideas inbox / research / scratchpad) ────────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind       note_kind not null default 'idea',
  title      text not null default '',
  body       text not null default '',
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_project on notes(project_id, pinned desc, updated_at desc);
drop trigger if exists trg_notes_updated on notes;
create trigger trg_notes_updated before update on notes
  for each row execute function set_updated_at();

-- ── writing sessions (one row per project per day; powers analytics) ───────
create table if not exists writing_sessions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  day         date not null,
  words_added integer not null default 0,
  minutes     integer not null default 0,
  unique (project_id, day)
);
create index if not exists idx_sessions_project on writing_sessions(project_id, day);

-- ── lock everything down (service-role bypasses RLS) ───────────────────────
alter table projects             enable row level security;
alter table documents            enable row level security;
alter table snapshots            enable row level security;
alter table entities             enable row level security;
alter table entity_relationships enable row level security;
alter table notes                enable row level security;
alter table writing_sessions     enable row level security;
-- (No policies are created on purpose: only the service-role key gets through.)
