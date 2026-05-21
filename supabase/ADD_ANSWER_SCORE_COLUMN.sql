-- Add `answer_score` column to `exam_answers` table if missing
-- Run this in Supabase SQL Editor (or psql) to add the missing column

BEGIN;

-- Add numeric answer_score column if it doesn't exist
ALTER TABLE exam_answers
  ADD COLUMN IF NOT EXISTS answer_score DECIMAL(5,2) DEFAULT 0;

-- Ensure default is set
ALTER TABLE exam_answers
  ALTER COLUMN answer_score SET DEFAULT 0;

-- Optional: create index for faster aggregation (if not exists)
CREATE INDEX IF NOT EXISTS idx_exam_answers_answer_score
  ON exam_answers (answer_score);

COMMIT;

-- Verification queries:
-- SELECT column_name FROM information_schema.columns WHERE table_name='exam_answers' AND column_name='answer_score';
-- SELECT submission_id, question_id, answer_score FROM exam_answers LIMIT 5;
