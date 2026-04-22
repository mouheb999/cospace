-- =====================================================================
-- Fix: public /pay page inserts were silently failing.
-- Causes addressed:
--   1. The INSERT RLS policy wasn't explicitly scoped to anon+authenticated
--   2. The `membership` CHECK constraint might not include newer plan types
--      (biweekly, half_day) used by the pricing table.
--   3. Ensure realtime is enabled so admin sees them instantly.
-- Safe to re-run.
-- =====================================================================

-- 1. Drop + re-create the INSERT policy explicitly for anon + authenticated
DROP POLICY IF EXISTS "Anyone can create payment requests" ON payment_requests;

CREATE POLICY "Anyone can create payment requests"
  ON payment_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Rebuild the membership CHECK constraint to include all plan_types
--    currently present in the pricing table (plus known future ones).
ALTER TABLE payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_membership_check;

DO $$
DECLARE
  allowed TEXT;
BEGIN
  -- Collect every plan_type that exists in pricing, union with a known set
  SELECT string_agg(DISTINCT quote_literal(plan_type), ', ')
  INTO allowed
  FROM (
    SELECT plan_type FROM pricing
    UNION
    SELECT unnest(ARRAY['daily','weekly','biweekly','monthly','quarterly','half_day'])
  ) t;

  EXECUTE format(
    'ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_membership_check CHECK (membership IN (%s))',
    allowed
  );
END $$;

-- 3. Ensure anon role has table-level INSERT grant too (Supabase default, but
--    explicit is safer — some managed instances revoke this).
GRANT INSERT ON payment_requests TO anon, authenticated;
GRANT SELECT ON pricing TO anon;  -- /pay page needs to list plans

-- 4. Ensure realtime publication includes payment_requests (no-op if already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payment_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests';
  END IF;
END $$;
