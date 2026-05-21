-- Add `submitted_at` and `updated_at` columns to `exam_answers` if missing
-- Run this in Supabase SQL Editor (or psql) to add the missing columns

BEGIN;

ALTER TABLE exam_answers
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exam_answers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure defaults
ALTER TABLE exam_answers
  ALTER COLUMN submitted_at SET DEFAULT NOW();
ALTER TABLE exam_answers
  ALTER COLUMN updated_at SET DEFAULT NOW();

COMMIT;

-- Verification queries:
-- SELECT column_name FROM information_schema.columns WHERE table_name='exam_answers' AND column_name IN ('submitted_at','updated_at');
-- SELECT id, submission_id, question_id, submitted_at, updated_at FROM exam_answers LIMIT 5;
