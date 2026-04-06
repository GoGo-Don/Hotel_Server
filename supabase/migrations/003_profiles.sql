-- Migration 003: Staff profiles table with roles.
-- Run in Supabase SQL editor after 002_improvements.sql.
--
-- After running, insert a row for every existing auth user:
--   INSERT INTO profiles (id, display_name, email, role)
--   VALUES ('<auth-user-uuid>', 'Test User', 'test@test.com', 'admin');

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('staff', 'manager', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all profiles (needed for manager dropdown)
CREATE POLICY "authenticated_read_profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Users can update their own display_name only
CREATE POLICY "own_profile_update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── Grants ───────────────────────────────────────────────────────────────────

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- ─── Example seed (replace UUIDs with real values from Auth > Users) ─────────

-- INSERT INTO profiles (id, display_name, email, role) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Test Admin',   'test@test.com',  'admin'),
--   ('00000000-0000-0000-0000-000000000002', 'Test Staff 2', 'test2@test.com', 'staff'),
--   ('00000000-0000-0000-0000-000000000003', 'Test Staff 3', 'test3@test.com', 'staff');
