-- Supabase Migration: 003_reading_progress
-- Tracks the last ayah read per surah per user.
-- PK is composite (user_id, surah_id) — one row per user per surah.

create table public.reading_progress (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  surah_id          int not null check (surah_id between 1 and 114),
  last_ayah_number  int not null check (last_ayah_number > 0),
  updated_at        timestamptz default now(),
  primary key (user_id, surah_id)
);

alter table public.reading_progress enable row level security;

-- Users can read their own progress
create policy "reading_progress_select_own"
  on public.reading_progress for select
  using (auth.uid() = user_id);

-- Users can insert their own progress
create policy "reading_progress_insert_own"
  on public.reading_progress for insert
  with check (auth.uid() = user_id);

-- Users can update their own progress
create policy "reading_progress_update_own"
  on public.reading_progress for update
  using (auth.uid() = user_id);

-- Users can delete their own progress
create policy "reading_progress_delete_own"
  on public.reading_progress for delete
  using (auth.uid() = user_id);
