-- Migration: Admin delete policies
-- Run this in your Supabase SQL Editor

-- Allow admins to delete profiles (cascades to memberships, checkins, income_logs, messages)
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow admins to delete memberships directly
CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete checkins directly
CREATE POLICY "Admins can delete checkins"
  ON checkins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete income_logs directly
CREATE POLICY "Admins can delete income_logs"
  ON income_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete daily_revenue entries
CREATE POLICY "Admins can delete daily_revenue"
  ON daily_revenue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users to delete conversations they are part of (sender or receiver)
CREATE POLICY "Users can delete own conversation messages"
  ON messages FOR DELETE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );
