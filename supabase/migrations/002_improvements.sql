-- Migration 002: Performance indexes, tightened grants, stats RPC,
-- type CHECK constraint, idempotent trigger, TeaCorp service types.
-- Run once in Supabase SQL editor after 001_initial.sql.

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Composite index for fetchActiveRequests (status filter + created_at sort)
CREATE INDEX IF NOT EXISTS idx_requests_status_created
  ON requests (status, created_at DESC);

-- Index for date-range queries (fetchTodayRequests)
CREATE INDEX IF NOT EXISTS idx_requests_created_at
  ON requests (created_at DESC);

-- ─── Tighten anon grants ───────────────────────────────────────────────────────
-- anon role should only INSERT (not SELECT or UPDATE — RLS already blocks it,
-- but explicit revoke removes latent risk if a permissive policy is ever added)

REVOKE SELECT, UPDATE ON TABLE public.requests FROM anon;
-- INSERT grant for anon already exists from 001; authenticated keeps SELECT+INSERT+UPDATE

-- ─── Idempotent trigger (fixes non-idempotent CREATE TRIGGER in 001) ──────────

DROP TRIGGER IF EXISTS requests_updated_at ON requests;
CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Stats RPC (replaces client-side JS aggregation in fetchStats()) ──────────

CREATE OR REPLACE FUNCTION get_today_stats()
RETURNS TABLE (
  total               BIGINT,
  pending             BIGINT,
  in_progress         BIGINT,
  done                BIGINT,
  avg_completion_mins NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*)                                                              AS total,
    COUNT(*) FILTER (WHERE status = 'pending')                           AS pending,
    COUNT(*) FILTER (WHERE status = 'in_progress')                       AS in_progress,
    COUNT(*) FILTER (WHERE status = 'done')                              AS done,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 60.0
      ) FILTER (
        WHERE status = 'done'
          AND updated_at > created_at
          AND updated_at - created_at < INTERVAL '4 hours'
      )
    , 1)                                                                  AS avg_completion_mins
  FROM requests
  WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');
$$;

GRANT EXECUTE ON FUNCTION get_today_stats() TO authenticated;

-- ─── CHECK constraint on request type ────────────────────────────────────────

ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_type_check;
ALTER TABLE requests ADD CONSTRAINT requests_type_check
  CHECK (type IN (
    'tea_coffee', 'water', 'extra_towels', 'room_cleaning',
    'extra_pillows', 'wake_up_call', 'work_desk_setup',
    'breakfast_order', 'reception_callback', 'wifi_help',
    'maintenance'
  ));

-- ─── assigned_to guard ────────────────────────────────────────────────────────

ALTER TABLE requests DROP CONSTRAINT IF EXISTS chk_assigned_when_in_progress;
ALTER TABLE requests ADD CONSTRAINT chk_assigned_when_in_progress
  CHECK (status <> 'in_progress' OR assigned_to IS NOT NULL);
