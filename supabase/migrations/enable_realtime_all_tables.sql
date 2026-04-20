-- Enable Realtime on all tables used by the client/responsable/admin dashboards.
-- Without this, Supabase realtime subscriptions silently never fire.
-- Safe to run multiple times: each ALTER is wrapped in a DO block that skips duplicates.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'payment_requests',
    'memberships',
    'messages',
    'announcements',
    'daily_revenue',
    'checkins',
    'profiles',
    'pricing',
    'settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Skip if table already in publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to supabase_realtime', t;
    ELSE
      RAISE NOTICE '% already in supabase_realtime, skipping', t;
    END IF;
  END LOOP;
END $$;

-- Ensure REPLICA IDENTITY FULL so UPDATE events include the old row
-- (needed for filters like user_id=eq.X to work on UPDATE events reliably)
ALTER TABLE payment_requests REPLICA IDENTITY FULL;
ALTER TABLE memberships REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
