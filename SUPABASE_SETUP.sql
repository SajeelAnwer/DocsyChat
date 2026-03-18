-- ============================================================
-- DocsyChat v4.3.2 — Supabase Database Setup
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Enable pgvector extension (required for RAG embeddings)
create extension if not exists vector;

-- 2. Users table
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  first_name    text not null,
  last_name     text not null,
  is_verified   boolean default false,
  created_at    timestamptz default now()
);

-- 3. Verification codes table
create table if not exists verification_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  code       text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique(user_id)
);

-- 4. Documents table
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  file_name   text not null,
  char_count  int default 0,
  chunk_count int default 0,
  created_at  timestamptz default now()
);

-- 5. Document chunks table
-- gemini-embedding-001 outputs 3072 dimensions
create table if not exists document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

-- 6. Threads table
create table if not exists threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  title       text not null,
  file_name   text not null,
  created_at  timestamptz default now()
);

-- 7. Messages table
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- 8. Indexes for performance
create index if not exists idx_users_email       on users(email);
create index if not exists idx_threads_user      on threads(user_id);
create index if not exists idx_messages_thread   on messages(thread_id);
create index if not exists idx_chunks_document   on document_chunks(document_id);

-- Vector index for similarity search (1536 dims, within Supabase ivfflat limit)
create index if not exists idx_chunks_embedding on document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 9. Vector similarity search function
create or replace function match_chunks(
  p_document_id     uuid,
  p_query_embedding vector(1536),
  p_match_count     int default 5
)
returns table (
  id          uuid,
  content     text,
  chunk_index int,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    chunk_index,
    1 - (embedding <=> p_query_embedding) as similarity
  from document_chunks
  where document_id = p_document_id
  order by embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- 10. Row Level Security
alter table users             enable row level security;
alter table documents         enable row level security;
alter table threads           enable row level security;
alter table messages          enable row level security;
alter table document_chunks   enable row level security;
alter table verification_codes enable row level security;

create policy "Allow all for anon" on users              for all using (true) with check (true);
create policy "Allow all for anon" on documents          for all using (true) with check (true);
create policy "Allow all for anon" on threads            for all using (true) with check (true);
create policy "Allow all for anon" on messages           for all using (true) with check (true);
create policy "Allow all for anon" on document_chunks    for all using (true) with check (true);
create policy "Allow all for anon" on verification_codes for all using (true) with check (true);

-- ============================================================
-- Done! All tables use gemini-embedding-001 (1536 dimensions).
-- ============================================================
