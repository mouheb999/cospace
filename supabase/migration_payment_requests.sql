-- Migration: Payment Requests table
-- Run this in your Supabase SQL Editor

CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  membership TEXT NOT NULL CHECK (membership IN ('daily', 'weekly', 'monthly', 'quarterly')),
  source TEXT NOT NULL CHECK (source IN ('user', 'public')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  handled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form + logged-in users)
CREATE POLICY "Anyone can create payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (true);

-- Logged-in users can view their own requests
CREATE POLICY "Users can view own requests"
  ON payment_requests FOR SELECT
  USING (user_id = auth.uid());

-- Staff (responsable + admin) can view all requests
CREATE POLICY "Staff can view all requests"
  ON payment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );

-- Staff can update requests (approve/reject)
CREATE POLICY "Staff can update requests"
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );

-- Staff can delete requests
CREATE POLICY "Staff can delete requests"
  ON payment_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'responsable')
    )
  );
