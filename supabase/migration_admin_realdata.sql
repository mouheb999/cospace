-- Migration: Admin panel real data + responsable access
-- Run this in your Supabase SQL Editor

-- =============================================
-- DAILY REVENUE TABLE (manual logging by responsable/admin)
-- =============================================
CREATE TABLE IF NOT EXISTS daily_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  logged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_date ON daily_revenue(date);
ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and responsable can manage daily_revenue"
  ON daily_revenue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );

-- =============================================
-- RESPONSABLE ACCESS POLICIES
-- =============================================

-- Memberships: responsable can view all + insert + update
CREATE POLICY "Responsable can view all memberships"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

CREATE POLICY "Responsable can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

CREATE POLICY "Responsable can update memberships"
  ON memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Income logs: responsable can view + insert
CREATE POLICY "Responsable can view income logs"
  ON income_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

CREATE POLICY "Responsable can insert income logs"
  ON income_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Checkins: responsable can view all
CREATE POLICY "Responsable can view all checkins"
  ON checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Price audit: responsable can view + insert
CREATE POLICY "Responsable can view price audit"
  ON price_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

CREATE POLICY "Responsable can insert price audit"
  ON price_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Pricing: responsable can update
CREATE POLICY "Responsable can update pricing"
  ON pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Announcements: responsable can manage
CREATE POLICY "Responsable can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Leaderboard settings: responsable can update
CREATE POLICY "Responsable can update leaderboard settings"
  ON leaderboard_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

CREATE POLICY "Responsable can insert leaderboard settings"
  ON leaderboard_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );

-- Settings: responsable can manage
CREATE POLICY "Responsable can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'responsable'
    )
  );
