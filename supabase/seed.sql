-- Supabase Seed Data
-- Run after migrations to populate test data.
-- WARNING: This is for development only.

-- Insert a test profile (requires a matching auth.users row)
-- For local dev, use Supabase Studio to create a test user first,
-- then uncomment and replace the UUID below:

-- insert into public.profiles (id, email, display_name)
-- values ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User');

-- Sample bookmarks
-- insert into public.bookmarks (user_id, surah_id, ayah_number, note)
-- values
--   ('00000000-0000-0000-0000-000000000001', 1, 1, 'بسم الله — آية التبريك'),
--   ('00000000-0000-0000-0000-000000000001', 2, 255, 'آية الكرسي');

-- Sample reading progress
-- insert into public.reading_progress (user_id, surah_id, last_ayah_number)
-- values
--   ('00000000-0000-0000-0000-000000000001', 1, 7),
--   ('00000000-0000-0000-0000-000000000001', 2, 100);
