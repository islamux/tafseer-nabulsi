# Supabase Schema — Tafsir Nabulsi

Shared database schema for the Quran Tafsir project. Both the React web app and the Kotlin Android app connect to this Supabase instance.

## Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile (auto-created on signup) |
| `bookmarks` | Per-ayah bookmarks with optional notes |
| `reading_progress` | Last ayah read per surah per user |

## Setup

### Option A: Supabase CLI (recommended)
```bash
supabase db push
```

### Option B: SQL Editor
Copy each migration file into the Supabase SQL Editor and run in order:
1. `001_profiles.sql`
2. `002_bookmarks.sql`
3. `003_reading_progress.sql`
4. `004_rls_policies.sql`
5. `005_helpers.sql`

### Seed data (optional, dev only)
```bash
# After migrations, run seed.sql in SQL Editor
# WARNING: uncomment the test data first
```

## RLS Policies

All tables use Row Level Security. Users can only access their own data:
- `auth.uid() = id` (profiles)
- `auth.uid() = user_id` (bookmarks, reading_progress)

## Triggers

| Trigger | Table | Action |
|---|---|---|
| `on_auth_user_created` | `auth.users` | Auto-creates `profiles` row on signup |
| `set_reading_progress_updated_at` | `reading_progress` | Auto-updates `updated_at` on modification |
