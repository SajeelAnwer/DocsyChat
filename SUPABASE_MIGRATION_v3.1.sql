-- ============================================================
-- DocsyChat v3.1 — Migration: 1536-dim embeddings
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Drop old index
drop index if exists idx_chunks_embedding;

-- Step 2: Change embedding column to 1536 dims
alter table document_chunks drop column if exists embedding;
alter table document_chunks add column embedding vector(1536);

-- Step 3: Recreate ivfflat index (1536 is under the 2000-dim limit)
create index idx_chunks_embedding on document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Step 4: Recreate match_chunks function with 1536 dims
drop function if exists match_chunks;
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

-- Step 5: Clear all old data
delete from messages;
delete from threads;
delete from document_chunks;
delete from documents;

-- ============================================================
-- Done. Re-upload your documents in DocsyChat.
-- ============================================================
