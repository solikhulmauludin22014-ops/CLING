-- ============================================
-- CLEANUP DATABASE - HAPUS SEMUA YANG TIDAK PERLU
-- Jalankan di Supabase SQL Editor
-- ============================================

-- =====================================================
-- 1. DROP OLD VIEWS (yang menyebabkan security issues)
-- =====================================================
DROP VIEW IF EXISTS public.v_siswa_with_kelas CASCADE;
DROP VIEW IF EXISTS public.v_guru_with_mapel CASCADE;
DROP VIEW IF EXISTS public.v_pjbl_progress CASCADE;
DROP VIEW IF EXISTS public.v_kelompok_members CASCADE;
DROP VIEW IF EXISTS public.v_asesmen_results CASCADE;
DROP VIEW IF EXISTS public.v_materi_progress CASCADE;

-- =====================================================
-- 2. DROP OLD TABLES (yang tidak diperlukan lagi)
-- =====================================================
-- Tabel lama dari LMS sebelumnya
DROP TABLE IF EXISTS public.pjbl_submissions CASCADE;
DROP TABLE IF EXISTS public.pjbl_projects CASCADE;
DROP TABLE IF EXISTS public.pjbl_tahapan CASCADE;
DROP TABLE IF EXISTS public.kelompok_members CASCADE;
DROP TABLE IF EXISTS public.kelompok CASCADE;
DROP TABLE IF EXISTS public.asesmen_answers CASCADE;
DROP TABLE IF EXISTS public.asesmen_results CASCADE;
DROP TABLE IF EXISTS public.asesmen_questions CASCADE;
DROP TABLE IF EXISTS public.asesmen CASCADE;
DROP TABLE IF EXISTS public.materi_progress CASCADE;
DROP TABLE IF EXISTS public.materi CASCADE;
DROP TABLE IF EXISTS public.siswa_kelas CASCADE;
DROP TABLE IF EXISTS public.guru_mapel CASCADE;
DROP TABLE IF EXISTS public.wali_kelas CASCADE;
DROP TABLE IF EXISTS public.mapel CASCADE;
DROP TABLE IF EXISTS public.kelas CASCADE;
DROP TABLE IF EXISTS public.tahun_ajaran CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- =====================================================
-- 3. DROP OLD FUNCTIONS (yang tidak diperlukan)
-- =====================================================
DROP FUNCTION IF EXISTS public.update_leaderboard_on_submission() CASCADE;
DROP FUNCTION IF EXISTS public.get_student_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_class_statistics(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_grade(DECIMAL) CASCADE;

-- =====================================================
-- 4. FIX handle_updated_at function (security issue)
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
-- 5. RECREATE CLEAN TABLES (hanya yang diperlukan)
-- =====================================================

-- Pastikan profiles table ada dan benar
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
-- 6. ENABLE RLS
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. DROP ALL OLD POLICIES AND RECREATE
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Code submissions policies
DROP POLICY IF EXISTS "Students view own submissions" ON public.code_submissions;
DROP POLICY IF EXISTS "Teachers view all submissions" ON public.code_submissions;
DROP POLICY IF EXISTS "Students insert own submissions" ON public.code_submissions;

CREATE POLICY "Students view own submissions" ON public.code_submissions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers view all submissions" ON public.code_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'guru'
        )
    );

CREATE POLICY "Students insert own submissions" ON public.code_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Leaderboard policies
DROP POLICY IF EXISTS "Leaderboard viewable by all" ON public.leaderboard;
DROP POLICY IF EXISTS "System update leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Allow insert leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Allow update leaderboard" ON public.leaderboard;

CREATE POLICY "Leaderboard viewable by all" ON public.leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Allow insert leaderboard" ON public.leaderboard
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update leaderboard" ON public.leaderboard
    FOR UPDATE USING (true);

-- =====================================================
-- 8. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.code_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.code_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON public.leaderboard(total_points DESC);

-- =====================================================
-- 9. ADD TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 10. VERIFY FINAL STATE
-- =====================================================
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show table counts
SELECT 'profiles' as table_name, count(*) as count FROM public.profiles
UNION ALL
SELECT 'code_submissions', count(*) FROM public.code_submissions
UNION ALL
SELECT 'leaderboard', count(*) FROM public.leaderboard;
