BEGIN;

UPDATE exams
SET title = CASE
  WHEN title IS NULL OR btrim(title) = '' THEN
    CASE exam_type
      WHEN 'pretest' THEN 'Pretest'
      WHEN 'posttest' THEN 'Posttest'
      ELSE 'Ujian'
    END
  ELSE title
END,
updated_at = NOW();

WITH ranked_exams AS (
  SELECT
    id,
    exam_type,
    ROW_NUMBER() OVER (PARTITION BY exam_type ORDER BY created_at DESC, title DESC, id DESC) AS rn
  FROM exams
)
UPDATE exams e
SET is_active = (ranked_exams.rn = 1),
    updated_at = NOW()
FROM ranked_exams
WHERE e.id = ranked_exams.id;

INSERT INTO exam_questions (exam_id, order_number, instruction_text, dirty_code_template, created_at, updated_at)
SELECT
  e.id,
  1,
  'Perbaiki kode berikut agar mengikuti clean code dan PEP 8.',
  CASE e.exam_type
    WHEN 'pretest' THEN
      '# Perbaiki kode berikut\n\ndef calc(a,b):\n    x= a+b\n    return x\n'
    WHEN 'posttest' THEN
      '# Perbaiki kode berikut\n\ndef calc_total(numbers):\n\ttotal=0\n\tfor n in numbers:\n\t\ttotal+=n\n\treturn total\n'
    ELSE
      '# Perbaiki kode berikut\n\nprint("Hello")\n'
  END,
  NOW(),
  NOW()
FROM exams e
WHERE NOT EXISTS (
  SELECT 1
  FROM exam_questions q
  WHERE q.exam_id = e.id
);

UPDATE exam_questions q
SET
  instruction_text = CASE
    WHEN q.instruction_text IS NULL OR btrim(q.instruction_text) = '' THEN 'Perbaiki kode berikut agar mengikuti clean code dan PEP 8.'
    ELSE q.instruction_text
  END,
  dirty_code_template = CASE
    WHEN q.dirty_code_template IS NULL OR btrim(q.dirty_code_template) = '' THEN '# Perbaiki kode berikut\n\nprint("Hello")\n'
    ELSE q.dirty_code_template
  END,
  updated_at = NOW()
WHERE q.order_number = 1;

COMMIT;
