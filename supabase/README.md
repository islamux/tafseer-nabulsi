# Supabase Schema — Tafsir Nabulsi

> **Status — historical / reference only.** This schema is **not wired into the web app.**
> On 2026-07-21 the web app migrated its bookmarks + reading-progress backend from
> Supabase (auth + Postgres) to a Cloudflare Worker + D1 (`workers/tafsir-api/`).
> These migrations are retained as a **reference for the planned Kotlin/Android app**.

## Relationship to the web app

The web app no longer connects to Supabase. Its live backend is `workers/tafsir-api/`
(device-ID keyed, no auth). The two schemas have **diverged** and are not cross-compatible:

| | This Supabase schema | Web app's D1 schema (`workers/.../schema.sql`) |
|---|---|---|
| Identity | `user_id uuid` (Supabase Auth, RLS via `auth.uid()`) | `device_id TEXT` (no auth, no PII) |
| `bookmarks.note` | present (`text`) | absent |
| `profiles` table | present | absent |
| Access control | Postgres Row Level Security | CORS allow-list (no row-level security) |

**Forward-looking note.** If the Kotlin app adopts this Supabase schema, its bookmarks and
reading progress will **not** sync with the web app's Worker+D1 data — the identity models
differ (user vs device). To enable cross-platform sync later, pick one backend as the single
source of truth (or build an explicit bridge). See
[`docs/all-cloudflare-migration-status.md`](../docs/all-cloudflare-migration-status.md) for the
migration rationale.

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
