-- ============================================
-- FIX LEADERBOARD & PROFILES TABLE
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Drop existing policies first (to avoid "already exists" error)
DROP POLICY IF EXISTS "leaderboard_select" ON public.leaderboard;
DROP POLICY IF EXISTS "leaderboard_insert_service" ON public.leaderboard;
DROP POLICY IF EXISTS "leaderboard_update_service" ON public.leaderboard;
DROP POLICY IF EXISTS "submissions_insert_own" ON public.code_submissions;
DROP POLICY IF EXISTS "submissions_select_own" ON public.code_submissions;
DROP POLICY IF EXISTS "submissions_select_all" ON public.code_submissions;

-- 2. Drop dan recreate leaderboard table
DROP TABLE IF EXISTS public.leaderboard CASCADE;

CREATE TABLE public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    highest_score DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies untuk leaderboard
CREATE POLICY "leaderboard_select" ON public.leaderboard FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaderboard_insert_service" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "leaderboard_update_service" ON public.leaderboard FOR UPDATE USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON public.leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_student ON public.leaderboard(student_id);

-- 3. Update profiles table untuk support NIS, Kelas, Role, Name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nis VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kelas VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'siswa';

-- Update profile policy untuk allow upsert dari service role
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);

-- 4. Drop dan recreate code_submissions table
DROP TABLE IF EXISTS public.code_submissions CASCADE;

CREATE TABLE public.code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    clean_code_score DECIMAL(4,2) DEFAULT 0,
    grade VARCHAR(20),
    analysis_result JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

-- Policies untuk code_submissions
CREATE POLICY "submissions_insert_own" ON public.code_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "submissions_select_own" ON public.code_submissions FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "submissions_select_all" ON public.code_submissions FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.code_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.code_submissions(submitted_at DESC);

-- 5. Sync profiles dengan user_metadata (untuk akun yang sudah ada)
-- Update profiles dari auth.users metadata
UPDATE public.profiles p
SET 
  name = COALESCE(u.raw_user_meta_data->>'name', p.name),
  full_name = COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', p.full_name),
  role = COALESCE(u.raw_user_meta_data->>'role', p.role, 'siswa'),
  nis = COALESCE(u.raw_user_meta_data->>'nis', p.nis),
  kelas = COALESCE(u.raw_user_meta_data->>'kelas', p.kelas)
FROM auth.users u
WHERE p.id = u.id;

-- Insert missing profiles from auth.users
INSERT INTO public.profiles (id, email, name, full_name, role, nis, kelas, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name',
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  COALESCE(u.raw_user_meta_data->>'role', 'siswa'),
  u.raw_user_meta_data->>'nis',
  u.raw_user_meta_data->>'kelas',
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 6. Verify struktur profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 7. Show all profiles to verify
SELECT id, email, name, full_name, role, nis, kelas FROM public.profiles;
