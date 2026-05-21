# Migration: Add `analysis_result` column to `exam_answers`

Purpose
- Fix 500 errors when saving answers caused by missing `analysis_result` column.

How to run

Option A — Supabase SQL Editor (recommended)
1. Open your project in the Supabase dashboard.
2. Open the "SQL Editor" (left menu) → New query.
3. Copy the contents of `supabase/ADD_ANALYSIS_RESULT_COLUMN.sql` and paste into the editor.
4. Click "Run". Confirm the migration ran without errors.

Option B — psql (self-hosted / CI)
1. Get your Postgres connection string from Supabase (Settings → Database → Connection string).
2. Run:

```bash
psql "postgres://user:password@host:port/database" -f supabase/ADD_ANALYSIS_RESULT_COLUMN.sql
```

Verification
1. Run the verification queries at the bottom of the SQL file or use Supabase Table Editor to inspect `exam_answers`.
2. Re-deploy or ensure your app backend picks up the updated schema (if you use a caching layer).

Post-migration
- After the column exists, test the student UI flow:
  - Open browser DevTools → Network.
  - Save an answer (click "Menyimpan...").
  - Confirm `/api/exams/submit-answer` returns `{ "success": true, ... }`.

Optional cleanup
- If you prefer, you can remove the fallback code that retries upsert without `analysis_result` in `app/api/exams/submit-answer/route.ts` once the schema is confirmed.
