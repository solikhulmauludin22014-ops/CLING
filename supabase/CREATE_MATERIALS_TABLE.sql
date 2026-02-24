-- =============================================
-- MATERIALS TABLE FOR LEARNING MATERIALS
-- =============================================
-- This table stores learning materials uploaded by teachers
-- Students can view and download these materials

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'ppt', 'pptx')),
  file_size BIGINT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_materials_teacher_id ON materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can insert materials" ON materials;
DROP POLICY IF EXISTS "Teachers can update own materials" ON materials;
DROP POLICY IF EXISTS "Teachers can delete own materials" ON materials;
DROP POLICY IF EXISTS "Anyone authenticated can view materials" ON materials;

-- Policy: Teachers can insert materials
CREATE POLICY "Teachers can insert materials" ON materials
  FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Policy: Teachers can update their own materials
CREATE POLICY "Teachers can update own materials" ON materials
  FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Policy: Teachers can delete their own materials
CREATE POLICY "Teachers can delete own materials" ON materials
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- Policy: All authenticated users can view materials
CREATE POLICY "Anyone authenticated can view materials" ON materials
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- STORAGE BUCKET FOR MATERIALS
-- =============================================
-- Run this in SQL editor or use Supabase Dashboard

-- Create storage bucket (run in Supabase Dashboard > Storage)
-- Bucket name: materials
-- Public: true (or false if you want to restrict access)

-- Storage policies (if bucket is private):
-- INSERT: authenticated users with role = guru
-- SELECT: all authenticated users
-- DELETE: owner only

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON materials TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================
-- Uncomment to insert sample data

-- INSERT INTO materials (teacher_id, title, description, file_name, file_url, file_type, file_size, category)
-- VALUES 
-- ('your-teacher-uuid', 'Pengantar Python', 'Materi dasar pemrograman Python', 'intro_python.pdf', 'https://example.com/intro_python.pdf', 'pdf', 1048576, 'Dasar'),
-- ('your-teacher-uuid', 'Clean Code Principles', 'Prinsip-prinsip clean code', 'clean_code.pptx', 'https://example.com/clean_code.pptx', 'pptx', 2097152, 'Best Practice');
