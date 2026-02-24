# Clean Code Analyzer

Platform pembelajaran Clean Code Python dengan analisis PEP 8 dan Pylint.

## Fitur

### Untuk Siswa
- **Python Compiler**: Tulis dan jalankan kode Python langsung di browser
- **Clean Code Analysis**: Analisis kualitas kode berdasarkan:
  - Meaningful Names (penamaan variabel/fungsi)
  - Code Duplication (duplikasi kode)
  - Code Quality (Pylint score sesuai PEP 8)
- **Poin & Progress**: Dapatkan poin dari setiap analisis kode
- **Saran Perbaikan**: Rekomendasi untuk meningkatkan kualitas kode

### Untuk Guru
- **Dashboard**: Monitor progress semua siswa
- **Statistik Kelas**: 
  - Total siswa
  - Total submissions
  - Rata-rata skor
  - Skor tertinggi
- **Detail Siswa**: Lihat persentase clean code setiap siswa

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Python Analysis**: Pylint, PEP 8

## Setup

### 1. Clone & Install

```bash
git clone <repository>
cd lms
npm install
```

### 2. Environment Variables

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PYTHON_PATH=python
```

### 3. Setup Database

Jalankan SQL di Supabase SQL Editor dari file `supabase/schema.sql`

### 4. Install Python Dependencies

```bash
pip install pylint
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Struktur Folder

```
app/
├── page.tsx              # Landing page
├── login/                # Halaman login
├── guru/
│   └── dashboard/        # Dashboard guru
├── siswa/
│   └── compiler/         # Compiler untuk siswa
└── api/
    ├── compiler/         # API execute & analyze
    ├── guru/             # API untuk guru
    └── leaderboard/      # API leaderboard
lib/
├── services/
│   ├── CleanCodeAnalyzer.ts    # Analisis clean code
│   └── PythonCompilerService.ts # Eksekusi Python
├── supabase/             # Supabase client
└── types/                # TypeScript types
supabase/
└── schema.sql            # Database schema
```

## Database Schema

### Tables

1. **profiles**: User profiles (guru/siswa)
2. **code_submissions**: Hasil analisis kode siswa
3. **leaderboard**: Ranking dan statistik siswa

## Roles

| Role | Akses |
|------|-------|
| Guru | Dashboard monitor siswa |
| Siswa | Compiler & analisis clean code |

## Clean Code Scoring

Skor dihitung menggunakan formula Pylint:
- Scale: 0-10
- Berdasarkan: errors, warnings, refactors, conventions
- Sesuai standar PEP 8

## License

MIT
