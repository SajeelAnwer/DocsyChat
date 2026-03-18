-- ============================================================
-- DocsyChat v4.4 — Migration: Add title and is_starred to threads
-- Run this in: Supabase Dashboard → SQL Editor
-- Only needed if upgrading from v4.3.x or earlier.
-- ============================================================

-- Add custom title column (nullable — falls back to file_name when null)
alter table threads add column if not exists custom_title text;

-- Add starred flag
alter table threads add column if not exists is_starred boolean default false;

-- Index for fast starred queries
create index if not exists idx_threads_starred on threads(user_id, is_starred);

-- ============================================================
-- Done.
-- ============================================================
