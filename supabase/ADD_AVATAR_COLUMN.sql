-- =============================================
-- ADD AVATAR COLUMN TO PROFILES TABLE
-- =============================================
-- Run this in Supabase SQL Editor

-- Add avatar_url column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create avatars storage bucket (if not exists)
-- Note: You need to create bucket manually in Supabase Dashboard > Storage
-- Bucket name: avatars
-- Public: true

-- =============================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- =============================================
-- Run these after creating the bucket in Supabase Dashboard

-- Policy 1: Anyone can view avatars (public bucket)
-- CREATE POLICY "Public avatar access" ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'avatars');

-- Policy 2: Authenticated users can upload their own avatar
-- CREATE POLICY "Users can upload own avatar" ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy 3: Users can update their own avatar
-- CREATE POLICY "Users can update own avatar" ON storage.objects
--   FOR UPDATE
--   USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy 4: Users can delete their own avatar
-- CREATE POLICY "Users can delete own avatar" ON storage.objects
--   FOR DELETE
--   USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- =============================================
-- VERIFICATION
-- =============================================

-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'avatar_url';

-- =============================================
-- INSTRUCTIONS
-- =============================================
-- 1. Run the ALTER TABLE statement above
-- 2. Go to Supabase Dashboard > Storage
-- 3. Create new bucket named "avatars"
-- 4. Set to Public
-- 5. (Optional) Enable storage policies above for security
