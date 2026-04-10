-- Migration: Admin panel real data
-- Run this in your Supabase SQL Editor

-- =============================================
-- DAILY REVENUE TABLE (manual logging by admin)
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

CREATE POLICY "Admin can manage daily_revenue"
  ON daily_revenue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
