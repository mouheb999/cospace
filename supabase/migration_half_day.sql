-- Migration: Half-Day (Demi-journée) Membership Feature
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. EXTEND CHECK CONSTRAINTS to include 'half_day'
-- =============================================

-- pricing.plan_type
ALTER TABLE pricing DROP CONSTRAINT IF EXISTS pricing_plan_type_check;
ALTER TABLE pricing ADD CONSTRAINT pricing_plan_type_check
  CHECK (plan_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'half_day'));

-- memberships.plan_type
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_plan_type_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_plan_type_check
  CHECK (plan_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'half_day'));

-- payment_requests.membership
ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS payment_requests_membership_check;
ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_membership_check
  CHECK (membership IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'half_day'));

-- =============================================
-- 2. ADD start_time / end_time TO memberships
-- =============================================
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Index for active half-day lookups
CREATE INDEX IF NOT EXISTS idx_memberships_end_time ON memberships(end_time) WHERE end_time IS NOT NULL;

-- =============================================
-- 3. ADD half_day PRICING ROW
-- =============================================
INSERT INTO pricing (plan_type, name, description, price, duration_days, features, is_featured)
VALUES (
  'half_day',
  'Demi-journée',
  'Accès demi-journée (1 créneau)',
  5,
  0,
  ARRAY['Accès 1 créneau', 'Wifi inclus', 'Café offert'],
  false
)
ON CONFLICT (plan_type) DO NOTHING;

-- =============================================
-- 4. ADD SETTINGS for half-day configuration
-- =============================================
INSERT INTO settings (key, value) VALUES
  ('half_day_enabled', 'false'),
  ('half_day_slots', '{"slot1": {"start": "08:00", "end": "15:30"}, "slot2": {"start": "15:30", "end": "23:00"}}')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 5. ADD PUBLIC READ POLICY for settings
-- =============================================
-- Allow anyone (including unauthenticated) to read settings
-- so that the public pay form and client dashboard can check half_day_enabled
DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT
  USING (true);

-- =============================================
-- 6. ALLOW responsable to insert memberships (for approval)
-- =============================================
-- Currently only admins can insert memberships. Responsable also approves requests.
DROP POLICY IF EXISTS "Responsable can insert memberships" ON memberships;
CREATE POLICY "Responsable can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );

-- =============================================
-- 7. UPDATE expire_memberships() to handle half_day
-- =============================================
CREATE OR REPLACE FUNCTION expire_memberships()
RETURNS void AS $$
BEGIN
  -- Expire date-based memberships
  UPDATE memberships
  SET status = 'expired'
  WHERE end_date < CURRENT_DATE
  AND status = 'active'
  AND (end_time IS NULL);

  -- Expire time-based (half_day) memberships
  UPDATE memberships
  SET status = 'expired'
  WHERE end_time IS NOT NULL
  AND end_time < NOW()
  AND status = 'active';
END;
$$ LANGUAGE plpgsql;
