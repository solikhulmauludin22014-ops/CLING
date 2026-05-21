-- Add `analysis_result` JSONB column to `exam_answers` table
-- Run this in Supabase SQL Editor (or psql) to add the missing column

BEGIN;

-- Add column if it doesn't exist
ALTER TABLE exam_answers
  ADD COLUMN IF NOT EXISTS analysis_result JSONB;

-- Optional: set a sensible default to avoid null checks
ALTER TABLE exam_answers
  ALTER COLUMN analysis_result SET DEFAULT '{}'::jsonb;

-- Optional: create an index for common lookups (submission_id, question_id)
CREATE INDEX IF NOT EXISTS idx_exam_answers_submission_question
  ON exam_answers (submission_id, question_id);

COMMIT;

-- Verification queries:
-- 1) Ensure column exists:
-- SELECT column_name FROM information_schema.columns WHERE table_name='exam_answers' AND column_name='analysis_result';
-- 2) Check a few rows:
-- SELECT id, submission_id, question_id, analysis_result FROM exam_answers LIMIT 5;
