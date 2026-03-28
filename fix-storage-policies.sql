-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload their own check-in photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own check-in photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all check-in photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own check-in photos" ON storage.objects;

-- Create correct policies for checkins bucket
CREATE POLICY "Allow authenticated users to upload to checkins bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'checkins' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to update their own check-in photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'checkins' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Allow public access to view check-in photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkins');

CREATE POLICY "Allow users to delete their own check-in photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'checkins' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
