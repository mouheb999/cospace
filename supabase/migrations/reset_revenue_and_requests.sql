-- =====================================================================
-- RESET: Clear all revenue, payment requests, and memberships data.
-- Run this in Supabase SQL Editor to start fresh with real data.
-- WARNING: This deletes data but keeps all table structures intact.
-- =====================================================================

-- 1. Clear all revenue entries
DELETE FROM daily_revenue;

-- 2. Clear all payment requests (pending + approved + rejected)
DELETE FROM payment_requests;

-- 3. Clear all memberships (active, expired, everything)
DELETE FROM memberships;

-- 4. Optionally reset user streaks / last_checkin if you also want to
--    clear the "Check-ins" history. Uncomment the next two lines if desired:
-- UPDATE profiles SET current_streak = 0, longest_streak = 0, last_checkin = NULL WHERE role = 'client';
-- DELETE FROM checkins;

-- 5. Done. Your tables are empty but schemas + RLS policies remain.
