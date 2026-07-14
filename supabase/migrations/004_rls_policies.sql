-- Supabase Migration: 004_rls_policies
-- (Consolidated RLS is defined inline in 001-003.
--  This file adds any additional policies or cross-table views.)

-- View: user's bookmarks enriched with surah name (for web app)
-- This is a convenience view, not a table.

-- Note: Supabase RLS is per-table. Policies are already in 001-003.
-- This file is reserved for future RLS additions (e.g., shared notes, groups).

-- Placeholder: future "shared_bookmarks" policy for community features
-- create policy "shared_bookmarks_read"
--   on public.bookmarks for select
--   using (true);  -- read-only public sharing (opt-in)
