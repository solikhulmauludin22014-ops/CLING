# 📚 PENJELASAN LENGKAP SISTEM C3-Py CLEAN CODE COMPILER

## Dokumen Panduan untuk Sidang Skripsi

Dokumen ini menjelaskan secara detail mekanisme dan sistem dari **CleanCodeAnalyzer** dan **PythonCompilerService** yang digunakan dalam platform C3-Py (Clean Code Compiler Python) untuk siswa SMK.

---

## 📋 DAFTAR ISI

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Python Compiler Service](#2-python-compiler-service)
3. [Clean Code Analyzer](#3-clean-code-analyzer)
4. [Alur Kerja Lengkap](#4-alur-kerja-lengkap)
5. [Rumus Perhitungan Skor](#5-rumus-perhitungan-skor)
6. [Kategori Pesan Pylint](#6-kategori-pesan-pylint)
7. [Contoh Skenario](#7-contoh-skenario)

---

## 1. GAMBARAN UMUM SISTEM

### 1.1 Arsitektur Sistem

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend      │      │    Backend       │      │  External API   │
│   (Next.js)     │ ──── │    (API Route)   │ ──── │  (Piston API)   │
│   Siswa Input   │      │    TypeScript    │      │  Python Runtime │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                        │
        │                        ├── PythonCompilerService
        │                        │   (Eksekusi kode via Piston)
        │                        │
        │                        └── CleanCodeAnalyzer
        │                            (Analisis kualitas kode via Pylint)
        ▼
┌─────────────────┐
│    Supabase     │
│   (Database)    │
│  - Submissions  │
│  - Leaderboard  │
└─────────────────┘
```

### 1.2 Dua Komponen Utama

| Komponen | Fungsi | Teknologi |
|----------|--------|-----------|
| **PythonCompilerService** | Menjalankan kode Python siswa | Piston API (Cloud) |
| **CleanCodeAnalyzer** | Menganalisis kualitas clean code | Pylint + PEP 8 |

---

## 2. PYTHON COMPILER SERVICE

### 2.1 Lokasi File
```
c:\lms\lib\services\PythonCompilerService.ts
```

### 2.2 Apa itu Piston API?

**Piston** adalah layanan API open-source yang memungkinkan eksekusi kode dari berbagai bahasa pemrograman secara aman di cloud. 

**URL API:** `https://emkc.org/api/v2/piston/execute`

**Keunggulan menggunakan Piston:**
- ✅ Tidak perlu install Python di server
- ✅ Aman (sandbox environment)
- ✅ Mendukung banyak bahasa (Python, JavaScript, Java, dll)
- ✅ Gratis untuk penggunaan non-komersial
- ✅ Cocok untuk deployment serverless (Vercel, Netlify)

### 2.3 Struktur Class PythonCompilerService

```typescript
export class PythonCompilerService {
  private maxExecutionTime: number  // Timeout 10 detik
  
  // Method utama
  async execute(code: string): Promise<ExecutionResult>
  async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }>
  async getAvailableVersions(): Promise<string[]>
}
```

### 2.4 Penjelasan Method `execute(code)`

**Tujuan:** Menjalankan kode Python yang ditulis siswa dan mengembalikan hasilnya.

**Langkah-langkah:**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Persiapan                                                │
├─────────────────────────────────────────────────────────────────┤
│ - Catat waktu mulai (startTime)                                  │
│ - Buat AbortController untuk timeout (10 detik)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Kirim Request ke Piston API                             │
├─────────────────────────────────────────────────────────────────┤
│ fetch(PISTON_API_URL, {                                          │
│   method: 'POST',                                                │
│   body: {                                                        │
│     language: 'python',                                          │
│     version: '3.10.0',                                           │
│     files: [{ name: 'main.py', content: code }]                  │
│   }                                                              │
│ })                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Proses Response                                          │
├─────────────────────────────────────────────────────────────────┤
│ Piston mengembalikan:                                            │
│ {                                                                │
│   run: {                                                         │
│     stdout: "output program",    ← Hasil print()                 │
│     stderr: "error message",     ← Pesan error                   │
│     code: 0                      ← Exit code (0 = sukses)        │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Return Hasil                                             │
├─────────────────────────────────────────────────────────────────┤
│ JIKA sukses:                                                     │
│   return { success: true, output: "...", execution_time: ... }   │
│                                                                  │
│ JIKA error:                                                      │
│   return { success: false, error: "..." }                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Contoh Request dan Response

**Request ke Piston API:**
```json
{
  "language": "python",
  "version": "3.10.0",
  "files": [
    {
      "name": "main.py",
      "content": "print('Hello World')"
    }
  ]
}
```

**Response dari Piston API:**
```json
{
  "language": "python",
  "version": "3.10.0",
  "run": {
    "stdout": "Hello World\n",
    "stderr": "",
    "code": 0,
    "output": "Hello World\n"
  }
}
```

### 2.6 Penanganan Error

| Jenis Error | Penyebab | Penanganan |
|-------------|----------|------------|
| **AbortError** | Eksekusi melebihi 10 detik | Return "Execution timeout" |
| **compile.stderr** | Syntax error di kode | Return pesan error kompilasi |
| **run.stderr** | Runtime error (exception) | Return pesan error runtime |
| **Network Error** | Koneksi internet gagal | Return "Failed to execute code" |

### 2.7 Method `validateSyntax(code)`

**Tujuan:** Mengecek apakah kode Python valid secara sintaks TANPA menjalankannya.

**Cara Kerja:**
```python
# Kode yang dikirim ke Piston untuk validasi
import ast
try:
    ast.parse('''<kode siswa>''')
    print("SYNTAX_OK")
except SyntaxError as e:
    print(f"SyntaxError: {e}")
```

Jika output mengandung "SYNTAX_OK" → valid
Jika tidak → ada syntax error

---

## 3. CLEAN CODE ANALYZER

### 3.1 Lokasi File
```
c:\lms\lib\services\CleanCodeAnalyzer.ts
```

### 3.2 Apa itu Pylint?

**Pylint** adalah tool analisis statis untuk Python yang memeriksa:
- Kesalahan sintaks dan logika
- Kepatuhan terhadap standar PEP 8
- Kualitas dan kompleksitas kode
- Naming convention

### 3.3 Struktur Class CleanCodeAnalyzer

```typescript
export class CleanCodeAnalyzer {
  private pythonPath: string           // Path ke Python executable
  private analysisDir: string          // Folder temp untuk file analisis
  private readonly MAX_SCORE = 100     // Skor maksimal
  
  // Kamus penjelasan kode error dalam Bahasa Indonesia
  private readonly CODE_EXPLANATIONS: Record<string, string>
  
  // Saran perbaikan untuk setiap kode error
  private readonly FIX_SUGGESTIONS: Record<string, string>
  
  // Method utama
  async analyze(code: string): Promise<CleanCodeAnalysisResult>
}
```

### 3.4 Alur Kerja Method `analyze(code)`

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Simpan Kode ke File Temporary                            │
├─────────────────────────────────────────────────────────────────┤
│ Nama file: analysis_<timestamp>_<random>.py                      │
│ Lokasi: temp_python/analysis/                                    │
│                                                                  │
│ Contoh: analysis_1706400000000_abc123.py                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Jalankan Pylint                                          │
├─────────────────────────────────────────────────────────────────┤
│ Command:                                                         │
│ python -m pylint "<filepath>" --output-format=json               │
│                                                                  │
│ Output: JSON array berisi semua temuan                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Parse dan Kategorikan Pesan                              │
├─────────────────────────────────────────────────────────────────┤
│ Kategori:                                                        │
│ 🔴 ERROR/FATAL  → Bug potensial                                  │
│ 🟡 WARNING      → Potensi bug                                    │
│ 🟠 REFACTOR     → Perlu perbaikan struktur                       │
│ 🟢 CONVENTION   → Pelanggaran PEP 8                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Tambahan Pengecekan PEP 8                                │
├─────────────────────────────────────────────────────────────────┤
│ Cek manual yang mungkin tidak tertangkap Pylint:                 │
│ • Baris > 79 karakter                                            │
│ • Trailing whitespace                                            │
│ • Indentasi bukan kelipatan 4                                    │
│ • Tab dan spasi tercampur                                        │
│ • Tidak ada newline di akhir file                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Hitung Skor                                              │
├─────────────────────────────────────────────────────────────────┤
│ Rumus Pylint:                                                    │
│                                                                  │
│ score = max(0, 10.0 - ((5×error + warning + refactor +           │
│                         convention) / statements) × 10)          │
│                                                                  │
│ Jika ada FATAL error → score = 0                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Generate Output                                          │
├─────────────────────────────────────────────────────────────────┤
│ • Skor dan grade (0.00/10 - 10.00/10)                            │
│ • Kategori grade (Very Poor - Excellent)                         │
│ • Daftar temuan dengan penjelasan Bahasa Indonesia               │
│ • Saran perbaikan untuk setiap masalah                           │
│ • Kode yang sudah diperbaiki (trailing whitespace, tabs)         │
│ • Pesan motivasi untuk siswa                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Cleanup                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Hapus file temporary untuk menjaga disk space                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Kamus Penjelasan Kode Error

Sistem memiliki 100+ penjelasan dalam **Bahasa Indonesia** yang mudah dipahami siswa SMK:

```typescript
CODE_EXPLANATIONS = {
  'C0103': 'Nama variabel/fungsi tidak sesuai standar Python 
            (gunakan snake_case untuk variabel, UPPER_CASE untuk konstanta)',
  'C0116': 'Fungsi tidak punya docstring penjelasan',
  'W0611': 'Import tidak digunakan (hapus import ini)',
  'E0602': 'Nama variabel tidak terdefinisi',
  // ... 100+ kode lainnya
}
```

### 3.6 Saran Perbaikan

Setiap kode error memiliki saran perbaikan praktis:

```typescript
FIX_SUGGESTIONS = {
  'C0103': 'Ubah nama: my_variable, calculate_total(), MY_CONSTANT',
  'C0116': "Tambahkan docstring setelah def: '''Deskripsi fungsi.'''",
  'W0611': 'Hapus baris import yang tidak digunakan',
  'W0622': 'Ganti nama variabel, hindari: list, dict, str, id, type',
  // ...
}
```

---

## 4. ALUR KERJA LENGKAP

### 4.1 Dari Input Siswa Hingga Hasil

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SISWA                                         │
│                     Menulis Kode Python                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                                 │
│                                                                       │
│   ┌─────────────────────┐    ┌─────────────────────┐                 │
│   │   🖥️ Code Editor    │    │   📊 Result Panel   │                 │
│   │                     │    │                     │                 │
│   │   def hello():      │    │   Output:           │                 │
│   │       print("Hi")   │    │   Hi                │                 │
│   │                     │    │                     │                 │
│   │   [▶️ Run] [🔍 Analyze]│    │   Score: 8.5/10    │                 │
│   └─────────────────────┘    └─────────────────────┘                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ POST /api/compiler/execute
                             │ POST /api/compiler/analyze
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API ROUTES (Backend)                               │
│                                                                       │
│   /api/compiler/execute.ts ──────────────────────────┐               │
│      │                                               │               │
│      │ import { pythonCompiler }                     │               │
│      │ const result = await pythonCompiler.execute() │               │
│      │                                               │               │
│   /api/compiler/analyze.ts ──────────────────────────┤               │
│      │                                               │               │
│      │ import { cleanCodeAnalyzer }                  │               │
│      │ const analysis = await cleanCodeAnalyzer.analyze() │          │
│      │                                               │               │
│      │ // Simpan ke database                         │               │
│      │ await supabase.from('code_submissions').insert() │            │
│      │                                               │               │
└──────┬───────────────────────────────────────────────┴───────────────┘
       │
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         SERVICES                                      │
│                                                                       │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│   │   PythonCompilerService     │  │   CleanCodeAnalyzer         │   │
│   │                             │  │                             │   │
│   │   ┌───────────────────┐     │  │   ┌───────────────────┐     │   │
│   │   │  Piston API       │     │  │   │  Pylint           │     │   │
│   │   │  (Cloud Python)   │     │  │   │  (Local Python)   │     │   │
│   │   └───────────────────┘     │  │   └───────────────────┘     │   │
│   │                             │  │                             │   │
│   │   Return: output, error     │  │   Return: score, issues     │   │
│   └─────────────────────────────┘  └─────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Sequence Diagram

```
Siswa          Frontend         API Route         Compiler         Analyzer        Piston
  │               │                 │                │                │               │
  │──Ketik Kode──>│                 │                │                │               │
  │               │                 │                │                │               │
  │──Klik Run────>│                 │                │                │               │
  │               │──POST execute──>│                │                │               │
  │               │                 │──execute()────>│                │               │
  │               │                 │                │──fetch()──────────────────────>│
  │               │                 │                │<─────stdout/stderr─────────────│
  │               │                 │<───result──────│                │               │
  │               │<────output──────│                │                │               │
  │<─Lihat Output─│                 │                │                │               │
  │               │                 │                │                │               │
  │──Klik Analyze>│                 │                │                │               │
  │               │──POST analyze──>│                │                │               │
  │               │                 │────────────────────analyze()───>│               │
  │               │                 │                │                │──run pylint   │
  │               │                 │                │                │──parse JSON   │
  │               │                 │                │                │──calculate    │
  │               │                 │<─────────────analysis───────────│               │
  │               │                 │──save to DB    │                │               │
  │               │<───score+report─│                │                │               │
  │<─Lihat Score──│                 │                │                │               │
```

---

## 5. RUMUS PERHITUNGAN SKOR

### 5.1 Rumus Pylint

```
score = max(0, 10.0 - ((5 × error + warning + refactor + convention) / statements) × 10)
```

**Keterangan:**
- `error` = Jumlah error (bug potensial)
- `warning` = Jumlah warning (potensi bug)
- `refactor` = Jumlah refactor (struktur buruk)
- `convention` = Jumlah convention (pelanggaran PEP 8)
- `statements` = Jumlah baris kode yang bermakna (bukan komentar/kosong)

**Jika ada FATAL error → score = 0**

### 5.2 Contoh Perhitungan

```python
# Kode siswa (10 statements)
def hitungLuas(p,l):    # C0103: nama tidak standar
    hasil=p*l           # C0103: nama tidak standar
    return hasil
x = hitungLuas(5,10)
print(x)
```

**Temuan Pylint:**
- C0103 (convention): 2 kali
- C0116 (convention): 1 kali (tidak ada docstring)

**Perhitungan:**
```
statements = 5
error = 0, warning = 0, refactor = 0, convention = 3

score = 10.0 - ((5×0 + 0 + 0 + 3) / 5) × 10
      = 10.0 - (3/5) × 10
      = 10.0 - 6.0
      = 4.0/10
```

### 5.3 Kategori Grade

| Skor | Kategori | Emoji |
|------|----------|-------|
| 9.0 - 10.0 | Excellent | ⭐⭐⭐ |
| 8.0 - 8.99 | Very Good | ⭐⭐ |
| 7.0 - 7.99 | Good | ⭐ |
| 5.5 - 6.99 | Fair | 👍 |
| 4.0 - 5.49 | Poor | ⚠️ |
| 0.0 - 3.99 | Very Poor | ❌ |

---

## 6. KATEGORI PESAN PYLINT

### 6.1 Ringkasan Kategori

```
┌──────────────────────────────────────────────────────────────────────┐
│   KATEGORI PESAN PYLINT                                               │
├──────────────┬────────────┬──────────────────────────────────────────┤
│   Kategori   │   Kode     │   Penjelasan                             │
├──────────────┼────────────┼──────────────────────────────────────────┤
│ 🔴 FATAL (F) │   F****    │   Error fatal, analisis terhenti         │
│ 🔴 ERROR (E) │   E****    │   Bug potensial yang perlu diperbaiki    │
│ 🟡 WARNING(W)│   W****    │   Potensi bug atau kode berbahaya        │
│ 🟠 REFACTOR(R)│   R****   │   Kode perlu di-refactor (struktur buruk)│
│ 🟢 CONVENTION│   C****    │   Pelanggaran standar PEP 8              │
└──────────────┴────────────┴──────────────────────────────────────────┘
```

### 6.2 Contoh Kode Error Paling Umum

**🟢 CONVENTION (C) - Pelanggaran PEP 8:**

| Kode | Penjelasan | Contoh Buruk → Baik |
|------|------------|---------------------|
| C0103 | Nama tidak standar | `myVariable` → `my_variable` |
| C0116 | Tidak ada docstring | Tambahkan `"""Deskripsi."""` |
| C0301 | Baris > 79 karakter | Pecah jadi beberapa baris |
| C0303 | Trailing whitespace | Hapus spasi di akhir baris |

**🟡 WARNING (W) - Potensi Bug:**

| Kode | Penjelasan | Masalah |
|------|------------|---------|
| W0611 | Import tidak digunakan | `import os` tapi tidak dipakai |
| W0612 | Variabel tidak digunakan | `x = 5` tapi x tidak dipakai |
| W0613 | Parameter tidak digunakan | `def foo(x):` tapi x tidak dipakai |
| W0622 | Nama sama dengan built-in | `list = [1,2,3]` |

**🔴 ERROR (E) - Bug Potensial:**

| Kode | Penjelasan | Masalah |
|------|------------|---------|
| E0001 | Syntax error | Kurung tidak lengkap, indentasi salah |
| E0401 | Import tidak ditemukan | Module tidak ter-install |
| E0602 | Variabel undefined | Menggunakan variabel yang belum dibuat |

---

## 7. CONTOH SKENARIO

### 7.1 Skenario: Siswa Submit Kode dengan Beberapa Masalah

**Input Kode Siswa:**
```python
def hitungLuas(p,l):
    hasil=p*l
    return hasil
```

**Proses Analisis:**

1. **Simpan ke file temp:** `analysis_1706400000_xyz.py`

2. **Jalankan Pylint:**
```bash
python -m pylint "analysis_1706400000_xyz.py" --output-format=json
```

3. **Output JSON Pylint:**
```json
[
  {
    "type": "convention",
    "module": "analysis_1706400000_xyz",
    "obj": "hitungLuas",
    "line": 1,
    "column": 0,
    "message-id": "C0116",
    "message": "Missing function or method docstring"
  },
  {
    "type": "convention",
    "module": "analysis_1706400000_xyz",
    "obj": "hitungLuas",
    "line": 1,
    "column": 4,
    "message-id": "C0103",
    "message": "Function name \"hitungLuas\" doesn't conform to snake_case naming style"
  }
]
```

4. **Parse dan Kategorisasi:**
   - C0116: convention → 🟢
   - C0103: convention → 🟢

5. **Hitung Skor:**
```
statements = 3
convention = 2

score = 10.0 - ((0 + 0 + 0 + 2) / 3) × 10
      = 10.0 - 6.67
      = 3.33/10 (Very Poor ❌)
```

6. **Generate Output:**

```
╔══════════════════════════════════════════════════════════════╗
║           📊 LAPORAN ANALISIS CLEAN CODE PYTHON              ║
╚══════════════════════════════════════════════════════════════╝

📈 SKOR: 3.33/10 (Very Poor ❌)
📋 Total Temuan: 2 masalah

┌──────────────────────────────────────────────────────────────┐
│ RINGKASAN TEMUAN                                             │
├──────────────────────────────────────────────────────────────┤
│ 🔴 Error (bug potensial)        :   0 masalah               │
│ 🟡 Warning (potensi bug)        :   0 masalah               │
│ 🟠 Refactor (perlu struktur)    :   0 masalah               │
│ 🟢 Convention (PEP 8)           :   2 masalah               │
└──────────────────────────────────────────────────────────────┘

🟢 CONVENTION - Pelanggaran PEP 8:
   Baris 1: Fungsi tidak punya docstring penjelasan
   └─ 💡 Tambahkan docstring setelah def: '''Deskripsi fungsi.'''
   
   Baris 1: Nama variabel/fungsi tidak sesuai standar Python
   └─ 💡 Ubah nama: my_variable, calculate_total(), MY_CONSTANT

💬 PESAN UNTUK KAMU:
🚀 Mulai dari dasar! Fokus pada indentasi 4 spasi dan 
   penamaan yang jelas. Kamu pasti bisa!
```

### 7.2 Kode yang Diperbaiki

```python
def hitung_luas(panjang, lebar):
    """Menghitung luas persegi panjang.
    
    Args:
        panjang: Panjang persegi panjang
        lebar: Lebar persegi panjang
    
    Returns:
        Hasil perkalian panjang dan lebar
    """
    hasil = panjang * lebar
    return hasil
```

**Skor Baru: 10.00/10 (Excellent ⭐⭐⭐)**

---

## 8. PERTANYAAN SIDANG YANG MUNGKIN MUNCUL

### Q1: Mengapa menggunakan Piston API dan bukan Python lokal?

**Jawaban:**
Piston API dipilih karena:
1. **Keamanan** - Kode siswa dijalankan di sandbox environment yang terisolasi
2. **Serverless Compatible** - Tidak perlu install Python di server Vercel/Netlify
3. **Scalability** - Bisa handle banyak request secara bersamaan
4. **Maintenance** - Tidak perlu update Python secara manual

### Q2: Bagaimana cara menghitung skor clean code?

**Jawaban:**
Menggunakan rumus standar Pylint:
```
score = max(0, 10.0 - ((5×error + warning + refactor + convention) / statements) × 10)
```

Error memiliki bobot 5× lebih berat karena merupakan bug potensial yang serius.

### Q3: Apa saja yang dicek oleh Clean Code Analyzer?

**Jawaban:**
1. **Naming Convention** - Apakah nama variabel mengikuti snake_case
2. **Dokumentasi** - Apakah ada docstring di fungsi dan class
3. **Format Kode** - Indentasi, panjang baris, whitespace
4. **Code Quality** - Import tidak terpakai, variabel tidak terpakai
5. **Kompleksitas** - Fungsi terlalu panjang, terlalu banyak parameter

### Q4: Mengapa penjelasan error dalam Bahasa Indonesia?

**Jawaban:**
Karena target user adalah siswa SMK di Indonesia. Penjelasan dalam Bahasa Indonesia membuat lebih mudah dipahami dan meningkatkan pengalaman belajar siswa.

### Q5: Bagaimana jika Pylint tidak terinstall?

**Jawaban:**
Sistem akan mengembalikan error dengan pesan yang jelas:
```
"Pylint tidak dapat dijalankan. Pastikan PYTHON_PATH mengarah ke 
interpreter yang punya pylint (pip install pylint)."
```

---

## 9. DIAGRAM TEKNIS TAMBAHAN

### 9.1 Data Flow Diagram

```
                    ┌─────────────────────┐
                    │     Siswa Input     │
                    │    (Kode Python)    │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │         POST Request           │
              │   /api/compiler/analyze        │
              └────────────────┬───────────────┘
                               │
           ┌───────────────────┴───────────────────┐
           │                                       │
           ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│  PythonCompiler      │              │  CleanCodeAnalyzer   │
│  Service             │              │                      │
├──────────────────────┤              ├──────────────────────┤
│ • Execute code       │              │ • Save temp file     │
│ • Validate syntax    │              │ • Run Pylint         │
│ • Get output         │              │ • Parse JSON         │
└──────────┬───────────┘              │ • Calculate score    │
           │                          │ • Generate report    │
           ▼                          └──────────┬───────────┘
┌──────────────────────┐                         │
│     Piston API       │                         ▼
│  (Cloud Execution)   │              ┌──────────────────────┐
└──────────┬───────────┘              │   Pylint (Local)     │
           │                          └──────────┬───────────┘
           │                                     │
           └───────────────┬─────────────────────┘
                           │
                           ▼
              ┌────────────────────────────────┐
              │       Supabase Database        │
              │      (code_submissions)        │
              └────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────────┐
              │       Response to Client       │
              │  • execution_output            │
              │  • clean_code_score            │
              │  • analysis_report             │
              └────────────────────────────────┘
```

---

## 10. KESIMPULAN

Sistem C3-Py Clean Code Compiler terdiri dari dua komponen utama:

1. **PythonCompilerService** - Bertanggung jawab menjalankan kode Python siswa menggunakan Piston API (cloud-based), memberikan output yang aman dan terisolasi.

2. **CleanCodeAnalyzer** - Bertanggung jawab menganalisis kualitas kode menggunakan Pylint, memberikan skor 0-10 berdasarkan standar PEP 8 dan best practices Python, dengan penjelasan dalam Bahasa Indonesia yang mudah dipahami siswa SMK.

Kedua komponen bekerja sama untuk memberikan pengalaman belajar yang komprehensif bagi siswa dalam mempelajari clean code Python.

---

*Dokumen ini dibuat untuk membantu persiapan sidang skripsi.*
*Terakhir diperbarui: Januari 2026*
