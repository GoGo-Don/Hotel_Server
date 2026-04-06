-- ============================================================
-- Hotel Room Service — Initial Schema
-- Run this once in the Supabase SQL editor for a new project.
-- ============================================================

-- Requests table
CREATE TABLE IF NOT EXISTS requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room        VARCHAR(10)  NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  notes       TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'done')),
  assigned_to VARCHAR(100),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Prevent duplicate pending requests for the same room + type
-- (a second tap on "Towels" is rejected gracefully)
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_request
  ON requests (room, type)
  WHERE status = 'pending';

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT a new request (anon = guest on their own device,
-- authenticated = staff submitting on behalf of a guest).
-- Neither role can read, update, or delete via this policy.
CREATE POLICY "anyone_can_insert"
  ON requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Staff (authenticated role): can read all requests.
CREATE POLICY "staff_can_select"
  ON requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Staff: can update requests (claim, resolve).
CREATE POLICY "staff_can_update"
  ON requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Table-level grants
-- Required: without these, PostgREST returns 403 before RLS even runs.
-- Supabase does NOT auto-grant these when tables are created via SQL editor.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.requests TO anon, authenticated;

-- ============================================================
-- Enable Realtime for this table
-- (also enable in Dashboard → Database → Replication → Realtime)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

-- ============================================================
-- Sample data (remove before production)
-- ============================================================
-- INSERT INTO requests (room, type, status) VALUES
--   ('101', 'water', 'pending'),
--   ('205', 'towels', 'in_progress'),
--   ('312', 'cleaning', 'pending');
