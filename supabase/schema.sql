-- CoSpace Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'responsable')),
  avatar_url TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  freeze_tokens INTEGER DEFAULT 3,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_checkin TIMESTAMPTZ,
  status_message TEXT CHECK (char_length(status_message) <= 120),
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEMBERSHIPS TABLE
-- =============================================
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  price_paid DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHECKINS TABLE
-- =============================================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  streak_count INTEGER NOT NULL DEFAULT 1,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters INTEGER
);

-- =============================================
-- PRICING TABLE
-- =============================================
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ANNOUNCEMENTS TABLE
-- =============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INCOME LOGS TABLE
-- =============================================
CREATE TABLE income_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  plan_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRICE AUDIT TABLE
-- =============================================
CREATE TABLE price_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pricing_id UUID NOT NULL REFERENCES pricing(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEADERBOARD SETTINGS TABLE
-- =============================================
CREATE TABLE leaderboard_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_text TEXT NOT NULL DEFAULT '🎁 Récompense : 1 mois gratuit + Badge Champion',
  updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY REVENUE TABLE (manual logging)
-- =============================================
CREATE TABLE daily_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  logged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGES TABLE (User <-> Responsable chat)
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_checkins_user_id ON checkins(user_id);
CREATE INDEX idx_checkins_date ON checkins(checked_in_at);
CREATE INDEX idx_income_logs_user_id ON income_logs(user_id);
CREATE INDEX idx_income_logs_date ON income_logs(created_at);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_profiles_online ON profiles(is_online);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- MEMBERSHIPS POLICIES
-- =============================================
CREATE POLICY "Users can view their own memberships"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all memberships"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- CHECKINS POLICIES
-- =============================================
CREATE POLICY "Users can view their own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
  ON checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PRICING POLICIES
-- =============================================
CREATE POLICY "Anyone can view pricing"
  ON pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can update pricing"
  ON pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert pricing"
  ON pricing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ANNOUNCEMENTS POLICIES
-- =============================================
CREATE POLICY "Anyone can view announcements"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- INCOME LOGS POLICIES
-- =============================================
CREATE POLICY "Admins can view income logs"
  ON income_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert income logs"
  ON income_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PRICE AUDIT POLICIES
-- =============================================
CREATE POLICY "Admins can view price audit"
  ON price_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert price audit"
  ON price_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- LEADERBOARD SETTINGS POLICIES
-- =============================================
CREATE POLICY "Anyone can view leaderboard settings"
  ON leaderboard_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update leaderboard settings"
  ON leaderboard_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- MESSAGES POLICIES
-- =============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can mark messages as read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Responsable and admin can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );

-- =============================================
-- SETTINGS POLICIES
-- =============================================
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get user streak
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  last_date DATE;
  current_date_check DATE;
BEGIN
  FOR last_date IN
    SELECT DATE(checked_in_at) 
    FROM checkins 
    WHERE user_id = p_user_id 
    ORDER BY checked_in_at DESC
  LOOP
    IF streak = 0 THEN
      IF last_date = CURRENT_DATE OR last_date = CURRENT_DATE - 1 THEN
        streak := 1;
        current_date_check := last_date;
      ELSE
        RETURN 0;
      END IF;
    ELSE
      IF last_date = current_date_check - 1 THEN
        streak := streak + 1;
        current_date_check := last_date;
      ELSE
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  streak INTEGER,
  checked_in_today BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.first_name,
    p.last_name,
    get_user_streak(p.id) as streak,
    EXISTS (
      SELECT 1 FROM checkins c 
      WHERE c.user_id = p.id 
      AND DATE(c.checked_in_at) = CURRENT_DATE
    ) as checked_in_today
  FROM profiles p
  WHERE p.role = 'client'
  ORDER BY streak DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pricing_updated_at
  BEFORE UPDATE ON pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-expire memberships
CREATE OR REPLACE FUNCTION expire_memberships()
RETURNS void AS $$
BEGIN
  UPDATE memberships
  SET status = 'expired'
  WHERE end_date < CURRENT_DATE
  AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP (OAuth + Email)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, referral_code)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      CASE 
        WHEN position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')) > 0 
        THEN substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')) + 1)
        ELSE ''
      END
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    'CS' || upper(substring(md5(random()::text) from 1 for 6))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED DATA
-- =============================================

-- Insert default pricing (TND - Tunisian Dinar)
INSERT INTO pricing (plan_type, name, description, price, duration_days, features, is_featured) VALUES
  ('daily', 'Journalier', 'Accès 1 jour', 10, 1, ARRAY['Accès 8h–23h', 'Wifi inclus', 'Café offert'], false),
  ('weekly', 'Hebdomadaire', '7 jours consécutifs', 50, 7, ARRAY['Accès 8h–23h', 'Wifi inclus', 'Café offert', 'Casier temporaire'], false),
  ('biweekly', '2 Semaines', '14 jours · Le plus populaire', 90, 14, ARRAY['Accès illimité', 'Wifi inclus', 'Café offert', 'Casier personnel'], true),
  ('monthly', 'Mensuel', '30 jours', 160, 30, ARRAY['Accès illimité', 'Bureau dédié', 'Locker personnel', 'Support prioritaire'], false)
ON CONFLICT (plan_type) DO NOTHING;

-- Insert default leaderboard settings
INSERT INTO leaderboard_settings (reward_text, updated_by)
SELECT '🎁 Récompense : 1 mois gratuit + Badge Champion', id
FROM profiles WHERE role = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('referral_enabled', 'true'),
  ('freeze_enabled', 'true'),
  ('push_notifications', 'true'),
  ('camera_only_checkin', 'true'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- STORAGE BUCKETS
-- =============================================
-- Run these in Supabase Dashboard > Storage

-- Create checkins bucket for check-in photos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('checkins', 'checkins', true);

-- Create avatars bucket for profile pictures
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
