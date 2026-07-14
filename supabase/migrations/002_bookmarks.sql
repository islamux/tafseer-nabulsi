-- Supabase Migration: 002_bookmarks
-- Users can bookmark ayahs with optional notes.
-- UNIQUE constraint: one bookmark per (user, surah, ayah).

create table public.bookmarks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  surah_id     int not null check (surah_id between 1 and 114),
  ayah_number  int not null check (ayah_number > 0),
  note         text,
  created_at   timestamptz default now(),
  unique (user_id, surah_id, ayah_number)
);

alter table public.bookmarks enable row level security;

-- Users can read their own bookmarks
create policy "bookmarks_select_own"
  on public.bookmarks for select
  using (auth.uid() = user_id);

-- Users can insert their own bookmarks
create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

-- Users can update their own bookmarks
create policy "bookmarks_update_own"
  on public.bookmarks for update
  using (auth.uid() = user_id);

-- Users can delete their own bookmarks
create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- Index for efficient queries
create index idx_bookmarks_user_id on public.bookmarks(user_id);
create index idx_bookmarks_user_surah on public.bookmarks(user_id, surah_id);
