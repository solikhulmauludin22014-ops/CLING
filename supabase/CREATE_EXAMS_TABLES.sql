-- =============================================
-- EXAMS TABLES FOR PRETEST / POSTTEST
-- =============================================

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('pretest', 'posttest')),
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(is_active);

-- Create exam questions table
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  instruction_text TEXT NOT NULL,
  dirty_code_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (exam_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);

-- Create exam submissions table
CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_submitted BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  final_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (exam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_submissions_user ON exam_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam ON exam_submissions(exam_id);

-- Create exam answers table
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_code TEXT NOT NULL,
  run_status VARCHAR(20) DEFAULT 'not_run',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_submission ON exam_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON exam_answers(question_id);

-- Create material progress table
CREATE TABLE IF NOT EXISTS material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_material_progress_user ON material_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_material_progress_material ON material_progress(material_id);

-- Enable RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;

-- Exams policies
DROP POLICY IF EXISTS "Exams viewable by authenticated" ON exams;
CREATE POLICY "Exams viewable by authenticated" ON exams
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Exams managed by teachers" ON exams;
CREATE POLICY "Exams managed by teachers" ON exams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Exam questions policies
DROP POLICY IF EXISTS "Exam questions viewable by authenticated" ON exam_questions;
CREATE POLICY "Exam questions viewable by authenticated" ON exam_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Exam questions managed by teachers" ON exam_questions;
CREATE POLICY "Exam questions managed by teachers" ON exam_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Exam submissions policies
DROP POLICY IF EXISTS "Students insert own exam submissions" ON exam_submissions;
CREATE POLICY "Students insert own exam submissions" ON exam_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students view own exam submissions" ON exam_submissions;
CREATE POLICY "Students view own exam submissions" ON exam_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own exam submissions" ON exam_submissions;
CREATE POLICY "Students update own exam submissions" ON exam_submissions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers view exam submissions" ON exam_submissions;
CREATE POLICY "Teachers view exam submissions" ON exam_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Exam answers policies
DROP POLICY IF EXISTS "Students manage own exam answers" ON exam_answers;
CREATE POLICY "Students manage own exam answers" ON exam_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exam_submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers view exam answers" ON exam_answers;
CREATE POLICY "Teachers view exam answers" ON exam_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Material progress policies
DROP POLICY IF EXISTS "Students manage own progress" ON material_progress;
CREATE POLICY "Students manage own progress" ON material_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON exams TO authenticated;
GRANT ALL ON exam_questions TO authenticated;
GRANT ALL ON exam_submissions TO authenticated;
GRANT ALL ON exam_answers TO authenticated;
GRANT ALL ON material_progress TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
