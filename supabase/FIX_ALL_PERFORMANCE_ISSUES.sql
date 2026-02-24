-- ============================================
-- FIX ALL 63 PERFORMANCE ISSUES
-- Jalankan di Supabase SQL Editor
-- ============================================

-- =====================================================
-- STEP 1: DROP ALL UNUSED TABLES (dari LMS lama)
-- =====================================================
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.student_badges CASCADE;
DROP TABLE IF EXISTS public.kelas_mapel_guru CASCADE;
DROP TABLE IF EXISTS public.assessment_submissions CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.leaderboard_points CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.kenaikan_kelas CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.progress CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quiz_answers CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.mapel CASCADE;
DROP TABLE IF EXISTS public.kelas CASCADE;
DROP TABLE IF EXISTS public.tahun_ajaran CASCADE;
DROP TABLE IF EXISTS public.guru_mapel CASCADE;
DROP TABLE IF EXISTS public.siswa_kelas CASCADE;
DROP TABLE IF EXISTS public.wali_kelas CASCADE;
DROP TABLE IF EXISTS public.materi CASCADE;
DROP TABLE IF EXISTS public.materi_progress CASCADE;
DROP TABLE IF EXISTS public.asesmen CASCADE;
DROP TABLE IF EXISTS public.asesmen_questions CASCADE;
DROP TABLE IF EXISTS public.asesmen_answers CASCADE;
DROP TABLE IF EXISTS public.asesmen_results CASCADE;
DROP TABLE IF EXISTS public.kelompok CASCADE;
DROP TABLE IF EXISTS public.kelompok_members CASCADE;
DROP TABLE IF EXISTS public.pjbl_tahapan CASCADE;
DROP TABLE IF EXISTS public.pjbl_projects CASCADE;
DROP TABLE IF EXISTS public.pjbl_submissions CASCADE;

-- =====================================================
-- STEP 2: DROP ALL OLD VIEWS
-- =====================================================
DROP VIEW IF EXISTS public.v_siswa_with_kelas CASCADE;
DROP VIEW IF EXISTS public.v_guru_with_mapel CASCADE;
DROP VIEW IF EXISTS public.v_pjbl_progress CASCADE;
DROP VIEW IF EXISTS public.v_kelompok_members CASCADE;
DROP VIEW IF EXISTS public.v_asesmen_results CASCADE;
DROP VIEW IF EXISTS public.v_materi_progress CASCADE;

-- =====================================================
-- STEP 3: DROP DUPLICATE INDEXES
-- =====================================================
DROP INDEX IF EXISTS public.idx_code_submissions_student_id;
-- Keep idx_submissions_student

-- =====================================================
-- STEP 4: DROP ALL OLD FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS public.update_leaderboard_on_submission() CASCADE;
DROP FUNCTION IF EXISTS public.get_student_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_class_statistics(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_grade(DECIMAL) CASCADE;

-- =====================================================
-- STEP 5: FIX handle_updated_at function
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 6: RECREATE TABLES (hanya 3 tabel yang diperlukan)
-- =====================================================

-- Pastikan profiles table ada
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('guru', 'siswa')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan code_submissions table ada
CREATE TABLE IF NOT EXISTS public.code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    output TEXT,
    clean_code_score DECIMAL(5,2) DEFAULT 0,
    grade TEXT,
    analysis_result JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan leaderboard table ada
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    highest_score DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 7: ENABLE RLS
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: DROP ALL EXISTING POLICIES (clean slate)
-- =====================================================

-- Drop ALL policies on profiles
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on code_submissions
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'code_submissions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.code_submissions', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on leaderboard
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'leaderboard' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.leaderboard', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 9: CREATE OPTIMIZED POLICIES (using select for auth functions)
-- =====================================================

-- PROFILES POLICIES (optimized with select)
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id);

-- CODE_SUBMISSIONS POLICIES (optimized with select)
CREATE POLICY "submissions_select_own" ON public.code_submissions
    FOR SELECT USING (
        (select auth.uid()) = student_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (select auth.uid()) AND role = 'guru'
        )
    );

CREATE POLICY "submissions_insert_own" ON public.code_submissions
    FOR INSERT WITH CHECK ((select auth.uid()) = student_id);

-- LEADERBOARD POLICIES (simple, allow all)
CREATE POLICY "leaderboard_select_all" ON public.leaderboard
    FOR SELECT USING (true);

CREATE POLICY "leaderboard_insert_all" ON public.leaderboard
    FOR INSERT WITH CHECK (true);

CREATE POLICY "leaderboard_update_all" ON public.leaderboard
    FOR UPDATE USING (true);

-- =====================================================
-- STEP 10: CREATE INDEXES (only unique ones)
-- =====================================================
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_submissions_student;
DROP INDEX IF EXISTS public.idx_submissions_date;
DROP INDEX IF EXISTS public.idx_leaderboard_points;

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_submissions_student ON public.code_submissions(student_id);
CREATE INDEX idx_submissions_date ON public.code_submissions(submitted_at DESC);
CREATE INDEX idx_leaderboard_points ON public.leaderboard(total_points DESC);

-- =====================================================
-- STEP 11: ADD TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STEP 12: VERIFY - List remaining tables
-- =====================================================
SELECT 
    'TABLES' as type,
    tablename as name
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List policies
SELECT 
    'POLICIES' as type,
    tablename || ' -> ' || policyname as name
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Table counts
SELECT 'profiles' as table_name, count(*) as count FROM public.profiles
UNION ALL
SELECT 'code_submissions', count(*) FROM public.code_submissions
UNION ALL
SELECT 'leaderboard', count(*) FROM public.leaderboard;
