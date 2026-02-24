-- ============================================
-- FIX 3 SECURITY ISSUES
-- Jalankan di Supabase SQL Editor
-- ============================================

-- =====================================================
-- Issue 1 & 2: leaderboard_insert_all dan leaderboard_update_all
-- terlalu permissive. 
-- Karena kita menggunakan service_role (bypass RLS) untuk update
-- leaderboard dari API, kita tidak perlu policy INSERT/UPDATE
-- =====================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "leaderboard_insert_all" ON public.leaderboard;
DROP POLICY IF EXISTS "leaderboard_update_all" ON public.leaderboard;

-- Leaderboard hanya perlu SELECT policy (untuk read)
-- INSERT dan UPDATE akan dilakukan via service_role yang bypass RLS

-- Pastikan SELECT policy masih ada
DROP POLICY IF EXISTS "leaderboard_select_all" ON public.leaderboard;
CREATE POLICY "leaderboard_select_all" ON public.leaderboard
    FOR SELECT USING (true);

-- =====================================================
-- Issue 3: Supabase Auth compromised passwords
-- Ini adalah INFO bukan error - tidak perlu difix
-- Ini fitur keamanan Supabase yang mengecek password lemah
-- =====================================================

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
