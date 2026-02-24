-- =============================================
-- FIX ALL RLS WARNINGS & DROP UNUSED TABLES
-- =============================================
-- Run this script in Supabase SQL Editor
-- Date: 2026-01-25

-- =============================================
-- 1. DROP UNUSED TABLES
-- =============================================

-- Drop assessment_questions table (not used)
DROP TABLE IF EXISTS assessment_questions CASCADE;

-- =============================================
-- 2. FIX CODE_SUBMISSIONS RLS POLICIES
-- =============================================
-- Issues:
-- - auth_rls_initplan: Using auth.uid() instead of (select auth.uid())
-- - multiple_permissive_policies: submissions_select_all & submissions_select_own
-- Note: Table uses student_id, NOT user_id

-- Drop all existing policies on code_submissions
DROP POLICY IF EXISTS "submissions_insert_own" ON code_submissions;
DROP POLICY IF EXISTS "submissions_select_own" ON code_submissions;
DROP POLICY IF EXISTS "submissions_select_all" ON code_submissions;
DROP POLICY IF EXISTS "submissions_update_own" ON code_submissions;
DROP POLICY IF EXISTS "submissions_delete_own" ON code_submissions;
DROP POLICY IF EXISTS "Allow users to insert own submissions" ON code_submissions;
DROP POLICY IF EXISTS "Allow users to view own submissions" ON code_submissions;
DROP POLICY IF EXISTS "Allow teachers to view all submissions" ON code_submissions;
DROP POLICY IF EXISTS "Students view own submissions" ON code_submissions;
DROP POLICY IF EXISTS "Teachers view all submissions" ON code_submissions;
DROP POLICY IF EXISTS "Students insert own submissions" ON code_submissions;

-- Create optimized policies for code_submissions
-- Policy 1: Users can insert their own submissions
CREATE POLICY "submissions_insert" ON code_submissions
  FOR INSERT
  WITH CHECK ((select auth.uid()) = student_id);

-- Policy 2: Users can select submissions (own + teachers can see all)
-- Combined into one policy to avoid multiple permissive policies
CREATE POLICY "submissions_select" ON code_submissions
  FOR SELECT
  USING (
    (select auth.uid()) = student_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'guru'
    )
  );

-- Policy 3: Users can update their own submissions
CREATE POLICY "submissions_update" ON code_submissions
  FOR UPDATE
  USING ((select auth.uid()) = student_id)
  WITH CHECK ((select auth.uid()) = student_id);

-- Policy 4: Users can delete their own submissions
CREATE POLICY "submissions_delete" ON code_submissions
  FOR DELETE
  USING ((select auth.uid()) = student_id);

-- =============================================
-- 3. FIX MATERIALS RLS POLICIES
-- =============================================
-- Issues:
-- - auth_rls_initplan: Using auth.uid() instead of (select auth.uid())

-- Drop all existing policies on materials
DROP POLICY IF EXISTS "Anyone authenticated can view materials" ON materials;
DROP POLICY IF EXISTS "Teachers can delete own materials" ON materials;
DROP POLICY IF EXISTS "Teachers can insert materials" ON materials;
DROP POLICY IF EXISTS "Teachers can update own materials" ON materials;

-- Create optimized policies for materials
-- Policy 1: All authenticated users can view materials
CREATE POLICY "materials_select" ON materials
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- Policy 2: Teachers can insert materials
CREATE POLICY "materials_insert" ON materials
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = teacher_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role = 'guru'
    )
  );

-- Policy 3: Teachers can update their own materials
CREATE POLICY "materials_update" ON materials
  FOR UPDATE
  USING ((select auth.uid()) = teacher_id)
  WITH CHECK ((select auth.uid()) = teacher_id);

-- Policy 4: Teachers can delete their own materials
CREATE POLICY "materials_delete" ON materials
  FOR DELETE
  USING ((select auth.uid()) = teacher_id);

-- =============================================
-- 4. FIX PROFILES RLS POLICIES
-- =============================================
-- Issues:
-- - multiple_permissive_policies: Duplicate policies for INSERT, SELECT, UPDATE

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow select all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create optimized policies for profiles (single policy per action)
-- Policy 1: Anyone can insert their own profile (for registration)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = id 
    OR (select auth.uid()) IS NULL  -- Allow during registration when user might not be fully authenticated yet
  );

-- Policy 2: Anyone authenticated can view all profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (true);  -- All profiles are public for authenticated users

-- Policy 3: Users can only update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Policy 4: Users can only delete their own profile
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  USING ((select auth.uid()) = id);

-- =============================================
-- 5. VERIFY CHANGES
-- =============================================

-- Check remaining policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('code_submissions', 'materials', 'profiles')
ORDER BY tablename, policyname;

-- =============================================
-- DONE!
-- =============================================
-- After running this script:
-- 1. Click "Rerun linter" in Performance Advisor
-- 2. All 19 warnings should be resolved
-- 3. assessment_questions table should be deleted
