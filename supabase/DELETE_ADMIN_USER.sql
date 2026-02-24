-- =============================================
-- DELETE ADMIN USER SAFELY
-- =============================================
-- Run this in Supabase SQL Editor to delete admin@smkantartika2.sch.id

-- 1. Check if admin user exists in profiles
SELECT id, email, name, role, created_at 
FROM profiles 
WHERE email = 'admin@smkantartika2.sch.id';

-- 2. Check related data (code_submissions)
SELECT COUNT(*) as submission_count
FROM code_submissions cs
WHERE cs.student_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- 3. Check leaderboard data
SELECT COUNT(*) as leaderboard_count
FROM leaderboard l
WHERE l.student_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- 4. Check materials data (if exists)
SELECT COUNT(*) as materials_count
FROM materials m
WHERE m.teacher_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- =============================================
-- DELETE PROCESS
-- =============================================

-- Step 1: Delete from leaderboard (if any)
DELETE FROM leaderboard 
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- Step 2: Delete from code_submissions (if any)
DELETE FROM code_submissions 
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- Step 3: Delete from materials (if any)
DELETE FROM materials 
WHERE teacher_id IN (
  SELECT id FROM profiles WHERE email = 'admin@smkantartika2.sch.id'
);

-- Step 4: Delete from profiles
DELETE FROM profiles 
WHERE email = 'admin@smkantartika2.sch.id';

-- Step 5: Delete from auth.users (final step)
-- Run this AFTER confirming profile is deleted
DELETE FROM auth.users 
WHERE email = 'admin@smkantartika2.sch.id';

-- =============================================
-- VERIFICATION
-- =============================================

-- Check if user is deleted
SELECT id, email FROM auth.users WHERE email = 'admin@smkantartika2.sch.id';
SELECT id, email FROM profiles WHERE email = 'admin@smkantartika2.sch.id';

-- If both return 0 rows, deletion is successful
