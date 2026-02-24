-- ============================================
-- HAPUS KOLOM YANG TIDAK DIPERLUKAN DI PROFILES
-- Jalankan di Supabase SQL Editor
-- ============================================

-- Hapus kolom-kolom lama yang tidak diperlukan
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mapel_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS kelas_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_wali_kelas;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS wali_kelas_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nis;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nip;

-- Verify struktur tabel profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
