-- ============================================
-- SCHEMA DATABASE CLEAN CODE ANALYZER
-- Fokus: Compiler Python & Analisis Clean Code
-- Role: guru, siswa
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FUNCTION: update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. TABEL PROFILES (user profiles)
-- =====================================================
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies untuk profiles
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger update timestamp
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 2. TABEL CODE_SUBMISSIONS (hasil analisis clean code)
-- =====================================================
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

-- Enable RLS
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

-- Policies untuk code_submissions
DROP POLICY IF EXISTS "Students view own submissions" ON public.code_submissions;
CREATE POLICY "Students view own submissions" ON public.code_submissions
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers view all submissions" ON public.code_submissions;
CREATE POLICY "Teachers view all submissions" ON public.code_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'guru'
        )
    );

DROP POLICY IF EXISTS "Students insert own submissions" ON public.code_submissions;
CREATE POLICY "Students insert own submissions" ON public.code_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.code_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.code_submissions(submitted_at DESC);

-- =====================================================
-- 3. TABEL LEADERBOARD (ranking siswa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    highest_score DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies untuk leaderboard
DROP POLICY IF EXISTS "Leaderboard viewable by all" ON public.leaderboard;
CREATE POLICY "Leaderboard viewable by all" ON public.leaderboard
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System update leaderboard" ON public.leaderboard;
CREATE POLICY "System update leaderboard" ON public.leaderboard
    FOR ALL USING (true);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON public.leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_avg ON public.leaderboard(average_score DESC);

-- =====================================================
-- FUNCTION: Auto update leaderboard saat submission
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_total_points INTEGER;
    new_total_subs INTEGER;
    new_avg_score DECIMAL(5,2);
    new_highest DECIMAL(5,2);
BEGIN
    -- Get current values
    SELECT 
        COALESCE(total_points, 0),
        COALESCE(total_submissions, 0),
        COALESCE(highest_score, 0)
    INTO new_total_points, new_total_subs, new_highest
    FROM public.leaderboard
    WHERE student_id = NEW.student_id;

    -- Calculate new values
    new_total_points := COALESCE(new_total_points, 0) + COALESCE(NEW.clean_code_score, 0)::INTEGER;
    new_total_subs := COALESCE(new_total_subs, 0) + 1;
    new_highest := GREATEST(COALESCE(new_highest, 0), COALESCE(NEW.clean_code_score, 0));
    new_avg_score := new_total_points::DECIMAL / GREATEST(new_total_subs, 1);

    -- Upsert leaderboard
    INSERT INTO public.leaderboard (
        student_id, total_points, total_submissions, average_score, highest_score, updated_at
    ) VALUES (
        NEW.student_id, new_total_points, new_total_subs, new_avg_score, new_highest, NOW()
    )
    ON CONFLICT (student_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        total_submissions = EXCLUDED.total_submissions,
        average_score = EXCLUDED.average_score,
        highest_score = EXCLUDED.highest_score,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auto update leaderboard
DROP TRIGGER IF EXISTS trigger_update_leaderboard ON public.code_submissions;
CREATE TRIGGER trigger_update_leaderboard
    AFTER INSERT ON public.code_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leaderboard_on_submission();
