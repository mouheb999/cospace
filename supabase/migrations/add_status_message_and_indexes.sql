-- Migration: Add status_message column and performance indexes
-- Run this in your Supabase SQL Editor

-- 1. Add status_message column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status_message TEXT CHECK (char_length(status_message) <= 120);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(current_streak DESC, longest_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_checkin ON profiles(last_checkin);

-- 3. Enable Realtime on profiles and checkins tables (required for subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
