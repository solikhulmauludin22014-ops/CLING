# 📘 PENJELASAN LENGKAP SISTEM COMPILER DAN ENGINE ANALISIS CLEAN CODE

## Dokumen Teknis untuk Sidang Proposal Skripsi

---

## DAFTAR ISI

1. [Arsitektur Sistem Secara Keseluruhan](#1-arsitektur-sistem-secara-keseluruhan)
2. [Sistem Compiler Python Online](#2-sistem-compiler-python-online)
3. [Engine Analisis Clean Code](#3-engine-analisis-clean-code)
4. [Rumus Perhitungan Skor (Formula Pylint)](#4-rumus-perhitungan-skor-formula-pylint)
5. [Kategori Pelanggaran Kode](#5-kategori-pelanggaran-kode)
6. [Aturan Analisis yang Diterapkan](#6-aturan-analisis-yang-diterapkan)
7. [Alur Kerja Sistem (Flowchart Naratif)](#7-alur-kerja-sistem-flowchart-naratif)
8. [Sistem Penilaian dan Grading](#8-sistem-penilaian-dan-grading)
9. [Sistem Leaderboard dan Poin](#9-sistem-leaderboard-dan-poin)
10. [Teknologi yang Digunakan](#10-teknologi-yang-digunakan)
11. [Keamanan dan Batasan Sistem](#11-keamanan-dan-batasan-sistem)
12. [FAQ - Pertanyaan yang Mungkin Diajukan Dosen](#12-faq---pertanyaan-yang-mungkin-diajukan-dosen)

---

## 1. ARSITEKTUR SISTEM SECARA KESELURUHAN

### 1.1 Gambaran Umum

Sistem ini adalah **Learning Management System (LMS)** berbasis web yang memiliki dua fitur utama:
1. **Online Python Compiler** — Siswa dapat menulis dan menjalankan kode Python langsung di browser
2. **Clean Code Analyzer** — Sistem otomatis menganalisis kualitas kode berdasarkan standar PEP 8 dan prinsip Clean Code, lalu memberikan skor menggunakan **rumus Pylint**

### 1.2 Arsitektur Tiga Lapis (Three-Tier Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Frontend)                │
│                    Next.js 14 + React 18 + Tailwind CSS         │
│                    ┌─────────────────────────────┐              │
│                    │   Browser (Client-Side)      │              │
│                    │   - Code Editor               │              │
│                    │   - Output Console             │              │
│                    │   - Analysis Report            │              │
│                    └──────────┬──────────────────┘              │
└───────────────────────────────┼──────────────────────────────────┘
                                │ HTTP POST (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Backend API)               │
│                    Vercel Serverless Functions                   │
│    ┌───────────────────────┐  ┌───────────────────────────┐     │
│    │ /api/compiler/execute │  │ /api/compiler/analyze     │     │
│    │ PythonCompilerService │  │ CleanCodeAnalyzer         │     │
│    └───────────┬───────────┘  └────────────┬──────────────┘     │
└────────────────┼───────────────────────────┼────────────────────┘
                 │ HTTP POST                 │ HTTP POST
                 ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICE LAYER                        │
│    ┌───────────────────────┐  ┌───────────────────────┐         │
│    │   Wandbox API         │  │   Supabase             │         │
│    │   (Python Execution)  │  │   (Database + Auth)    │         │
│    │   CPython 3.10.15     │  │   PostgreSQL           │         │
│    └───────────────────────┘  └───────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Komponen Utama

| Komponen | File | Fungsi |
|----------|------|--------|
| Python Compiler Service | `lib/services/PythonCompilerService.ts` | Mengeksekusi kode Python via Wandbox API |
| Clean Code Analyzer | `lib/services/CleanCodeAnalyzer.ts` | Menganalisis kualitas kode Python |
| Execute API Route | `app/api/compiler/execute/route.ts` | Endpoint API untuk menjalankan kode |
| Analyze API Route | `app/api/compiler/analyze/route.ts` | Endpoint API untuk analisis clean code |
| Database Types | `lib/types/database.ts` | Definisi tipe data TypeScript |

---

## 2. SISTEM COMPILER PYTHON ONLINE

### 2.1 Cara Kerja Compiler

Sistem ini **bukan** compiler lokal. Sistem menggunakan **Wandbox API** (`https://wandbox.org/api/compile.json`) sebagai backend eksekusi Python. Wandbox adalah layanan compiler online gratis yang menyediakan environment Python (CPython 3.10.15) di server mereka.

**Mengapa tidak menggunakan compiler lokal?**
Karena sistem di-deploy di **Vercel** (platform serverless). Vercel tidak menyediakan Python runtime di environment serverless-nya, sehingga kode Python harus dieksekusi di layanan external.

### 2.2 Alur Eksekusi Kode Python

```
Siswa menulis kode Python di browser
        │
        ▼
[1] Frontend mengirim HTTP POST ke /api/compiler/execute
    Body: { "code": "print('Hello World')" }
        │
        ▼
[2] Backend menerima request, melakukan autentikasi via Supabase
        │
        ▼
[3] VALIDASI SINTAKS (Tahap 1)
    Backend membuat script Python pengecekan:
    ┌─────────────────────────────────┐
    │ import ast                      │
    │ try:                            │
    │     ast.parse("""<kode siswa>""")│
    │     print("SYNTAX_OK")          │
    │ except SyntaxError as e:        │
    │     print(f"SyntaxError: ...")   │
    └─────────────────────────────────┘
    Script dikirim ke Wandbox API untuk dicek.
    - Jika SYNTAX_OK → lanjut ke tahap 4
    - Jika SyntaxError → langsung return error ke siswa
        │
        ▼
[4] EKSEKUSI KODE (Tahap 2)
    Kode asli siswa dikirim ke Wandbox API:
    ┌────────────────────────────────────────┐
    │ POST https://wandbox.org/api/compile.json │
    │ {                                      │
    │   "code": "<kode siswa>",              │
    │   "compiler": "cpython-3.10.15",       │
    │   "save": false                        │
    │ }                                      │
    └────────────────────────────────────────┘
        │
        ▼
[5] Wandbox mengeksekusi kode di sandbox mereka
    dan mengembalikan response:
    {
      "status": "0",            // 0 = sukses
      "program_output": "...",  // stdout
      "program_error": "...",   // stderr
      "compiler_error": "..."   // compilation error
    }
        │
        ▼
[6] Backend mem-parse response Wandbox:
    - status "0" → sukses, ambil program_output
    - status != "0" → error, ambil program_error
    - compiler_error ada → error kompilasi
        │
        ▼
[7] Response dikirim ke frontend:
    {
      "success": true/false,
      "output": "Hello World",
      "error": null,
      "execution_time": 2500  // dalam milidetik
    }
```

### 2.3 Mekanisme Timeout

Sistem menggunakan `AbortController` dengan timeout **15 detik** (15000ms). Jika Wandbox API tidak merespons dalam 15 detik (misalnya karena infinite loop pada kode siswa), request dibatalkan dan siswa mendapat pesan:

```
"Execution timeout (max 15s)"
```

### 2.4 Penanganan Error

| Kondisi | Penanganan |
|---------|------------|
| Syntax error | Ditangkap di tahap validasi, tidak perlu eksekusi |
| Runtime error (ZeroDivisionError, dll) | Wandbox mengembalikan `status != "0"` + `program_error` |
| Infinite loop | Timeout setelah 15 detik oleh AbortController |
| Wandbox API down | Return error "API Error: [status code]" |
| Network error | Return error "Failed to execute code" |

---

## 3. ENGINE ANALISIS CLEAN CODE

### 3.1 Pendekatan Analisis

Engine menggunakan **dua tahap analisis** yang saling melengkapi:

```
┌──────────────────────────────────────────────────────────────┐
│                    TAHAP 1: ANALISIS AST                      │
│            (Abstract Syntax Tree via Python)                  │
│                                                              │
│  Kode siswa dikirim ke Wandbox sebagai script analisis       │
│  yang menggunakan modul Python `ast` (built-in)              │
│                                                              │
│  Menganalisis:                                               │
│  ✓ Naming convention (snake_case, PascalCase)                │
│  ✓ Docstring (module, class, function)                       │
│  ✓ Import yang tidak digunakan                               │
│  ✓ Wildcard import                                           │
│  ✓ eval()/exec() yang berbahaya                              │
│  ✓ Bare except                                               │
│  ✓ Unreachable code                                          │
│  ✓ Too many parameters/branches/statements                   │
│  ✓ PEP 8 line length                                         │
│  ✓ Duplicate code                                            │
│  ✓ Unnecessary pass                                          │
│  ✓ Global variable usage                                     │
│  ✓ Multiple imports per line                                 │
│  ✓ Trailing whitespace                                       │
│  ✓ Indentation check                                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    TAHAP 2: ANALISIS PEP 8                    │
│            (TypeScript-based, server-side)                    │
│                                                              │
│  Pengecekan tambahan di sisi server (TypeScript):            │
│  ✓ Line length > 79 karakter                                 │
│  ✓ Trailing whitespace                                       │
│  ✓ Indentasi tidak kelipatan 4                               │
│  ✓ Campuran tab dan spasi                                    │
│  ✓ Missing newline di akhir file                             │
│                                                              │
│  Tahap ini berjalan SETELAH hasil AST diterima               │
│  untuk menambah cakupan pengecekan                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    FALLBACK MECHANISM                         │
│                                                              │
│  Jika Wandbox API gagal (timeout/error), sistem              │
│  otomatis menggunakan analisis TypeScript murni              │
│  (runFallbackAnalysis) yang melakukan pengecekan             │
│  dasar PEP 8 tanpa membutuhkan Python                        │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Cara Kerja Script Analisis AST

Ketika siswa menekan tombol "Analyze", sistem:

1. **Encode kode siswa ke Base64** — Menghindari masalah escaping karakter spesial
2. **Membuat script Python analisis** — Script menggunakan modul `ast` (built-in Python) untuk mem-parse kode siswa menjadi Abstract Syntax Tree
3. **Mengirim script ke Wandbox** — Script dieksekusi di Wandbox, menghasilkan JSON berisi daftar pelanggaran
4. **Mem-parse hasil JSON** — Backend mengkategorikan pelanggaran dan menghitung skor
5. **Menambah pengecekan PEP 8** — Server-side TypeScript menambahkan pengecekan format tambahan

#### Mengapa Menggunakan AST?

**AST (Abstract Syntax Tree)** adalah representasi struktur kode program dalam bentuk pohon. Modul `ast` adalah modul **bawaan Python** (tidak perlu install) yang dapat mem-parse kode Python dan menganalisis strukturnya.

```python
# Contoh: kode "x = 5 + 3" akan di-parse menjadi AST:
# Module
# └── Assign
#     ├── targets: [Name(id='x')]
#     └── value: BinOp
#         ├── left: Constant(value=5)
#         ├── op: Add
#         └── right: Constant(value=3)
```

Dengan AST, kita bisa:
- Mendeteksi nama variabel/fungsi/class dan mengecek naming convention
- Mendeteksi ada tidaknya docstring
- Mendeteksi import yang tidak digunakan
- Mendeteksi kompleksitas fungsi (jumlah parameter, branch, statements)
- Mendeteksi penggunaan fungsi berbahaya (eval, exec)
- Dan pengecekan structural lainnya

### 3.3 Mengapa Tidak Langsung Menggunakan Pylint?

| Aspek | Pylint (Lokal) | AST Analysis (Sistem Ini) |
|-------|---------------|---------------------------|
| **Requirement** | Perlu Python + Pylint ter-install di server | Hanya butuh Python built-in module (`ast`) |
| **Kompatibilitas Vercel** | ❌ Tidak kompatibel (serverless = no local Python) | ✅ Kompatibel (dijalankan via Wandbox) |
| **Jumlah aturan** | ~200+ aturan | ~25 aturan utama (difokuskan untuk siswa SMK) |
| **Kode pelanggaran** | Kode Pylint asli (C0103, W0611, dll) | **Menggunakan kode Pylint yang sama** |
| **Rumus skor** | `max(0, 10.0 - ((5*E + W + R + C) / S) * 10)` | **Menggunakan rumus yang identik** |
| **Kecepatan** | Cepat (~1 detik) | Agak lambat (~2-4 detik via network) |
| **Cocok untuk siswa SMK** | Terlalu banyak peringatan yang membingungkan | ✅ Difokuskan pada aturan esensial |

**Kesimpulan**: Sistem ini menggunakan **kode pelanggaran Pylint** dan **rumus skor Pylint yang identik**, namun analisis dilakukan menggunakan modul AST Python bawaan agar kompatibel dengan deployment serverless (Vercel).

---

## 4. RUMUS PERHITUNGAN SKOR (FORMULA PYLINT)

### 4.1 Rumus Utama

Sistem menggunakan **rumus yang identik dengan Pylint** untuk menghitung skor kualitas kode:

```
Score = max(0, 10.0 - ((5 × E + W + R + C) / S) × 10)
```

Dimana:
- **E** = Jumlah pelanggaran kategori **Error** (bug potensial)
- **W** = Jumlah pelanggaran kategori **Warning** (potensi masalah)
- **R** = Jumlah pelanggaran kategori **Refactor** (perlu perbaikan struktur)
- **C** = Jumlah pelanggaran kategori **Convention** (pelanggaran PEP 8)
- **S** = Jumlah **statements** (baris kode aktif, tidak termasuk komentar dan baris kosong)

### 4.2 Implementasi dalam Kode

```typescript
// File: lib/services/CleanCodeAnalyzer.ts, baris 403-407

const statements = Math.max(1, pylint.statements)  // Minimal 1 untuk menghindari division by zero
const score10 = pylint.fatal 
  ? 0  // Jika ada fatal error, skor langsung 0
  : Math.max(0, 10.0 - ((5 * pylint.error + pylint.warning + pylint.refactor + pylint.convention) / statements) * 10)
const scoreRounded = Math.round(score10 * 100) / 100  // Bulatkan 2 desimal
```

### 4.3 Penjelasan Bobot Pelanggaran

| Kategori | Bobot | Alasan |
|----------|-------|--------|
| **Error (E)** | × 5 | Bug serius yang dapat menyebabkan program crash. Diberikan bobot paling tinggi karena berdampak langsung pada fungsionalitas |
| **Warning (W)** | × 1 | Potensi bug atau praktik buruk yang belum tentu menyebabkan error tapi berisiko |
| **Refactor (R)** | × 1 | Kode yang berfungsi tapi memiliki kompleksitas tinggi atau struktur yang perlu diperbaiki |
| **Convention (C)** | × 1 | Pelanggaran standar penulisan kode (PEP 8) yang tidak mempengaruhi fungsionalitas tapi mempengaruhi keterbacaan |
| **Fatal** | Skor = 0 | Error fatal (syntax error) membuat skor langsung 0 |

### 4.4 Contoh Perhitungan

#### Contoh 1: Kode dengan beberapa pelanggaran

```python
def hitungLuas(p, l):
    luas = p * l
    return luas
```

**Pelanggaran yang terdeteksi:**
- C0114: Module tidak punya docstring (Convention = 1)
- C0103: Nama fungsi `hitungLuas` tidak sesuai snake_case (Convention = 1)
- C0116: Fungsi `hitungLuas` tidak punya docstring (Convention = 1)
- C0304: File tidak diakhiri dengan baris kosong (Convention = 1)

**Perhitungan:**
- E = 0, W = 0, R = 0, C = 4
- S = 3 (3 baris kode aktif)

```
Score = max(0, 10.0 - ((5 × 0 + 0 + 0 + 4) / 3) × 10)
Score = max(0, 10.0 - (4/3) × 10)
Score = max(0, 10.0 - 13.33)
Score = max(0, -3.33)
Score = 0.00
```

#### Contoh 2: Kode yang cukup baik

```python
"""Module untuk menghitung geometri."""


def hitung_luas_persegi(panjang, lebar):
    """Menghitung luas persegi panjang."""
    luas = panjang * lebar
    return luas


def hitung_keliling(panjang, lebar):
    """Menghitung keliling persegi panjang."""
    keliling = 2 * (panjang + lebar)
    return keliling
```

**Pelanggaran yang terdeteksi:**
- C0304: File tidak diakhiri dengan baris kosong (Convention = 1)

**Perhitungan:**
- E = 0, W = 0, R = 0, C = 1
- S = 7 (7 baris kode aktif)

```
Score = max(0, 10.0 - ((5 × 0 + 0 + 0 + 1) / 7) × 10)
Score = max(0, 10.0 - (1/7) × 10)
Score = max(0, 10.0 - 1.43)
Score = 8.57
```

### 4.5 Referensi Rumus

Rumus ini bersumber dari dokumentasi resmi Pylint:
- **Sumber**: Pylint Documentation — Score Calculation
- **URL**: https://pylint.readthedocs.io/en/latest/
- **Rumus asli Pylint** (dalam source code Pylint):
  ```python
  evaluation = "max(0, 0 if fatal else 10.0 - ((float(5 * error + warning + refactor + convention) / statement) * 10))"
  ```

---

## 5. KATEGORI PELANGGARAN KODE

### 5.1 Empat Kategori Utama

Setiap pelanggaran dikategorikan sesuai standar Pylint:

#### 🔴 ERROR (Kode dimulai dengan "E")
**Deskripsi**: Bug potensial yang dapat menyebabkan program crash atau berperilaku salah.

| Kode | Penjelasan |
|------|------------|
| E0001 | Syntax error (kode Python tidak valid) |
| E0100 | `__init__` tidak boleh return value |
| E0102 | Nama fungsi/class sudah dipakai (duplikat) |
| E0103 | `break`/`continue` di luar loop |
| E0104 | `return` di luar fungsi |
| E0401 | Module tidak ditemukan (import error) |
| E0601 | Variabel digunakan sebelum assignment |
| E0602 | Nama variabel tidak terdefinisi |
| E1120 | Argumen function kurang |
| E1121 | Terlalu banyak argumen function |

#### 🟡 WARNING (Kode dimulai dengan "W")
**Deskripsi**: Potensi bug atau praktik pemrograman yang buruk.

| Kode | Penjelasan |
|------|------------|
| W0101 | Kode setelah `return` tidak akan dijalankan (unreachable) |
| W0107 | Statement `pass` tidak diperlukan |
| W0122 | Penggunaan `exec()` berbahaya |
| W0123 | Penggunaan `eval()` berbahaya |
| W0311 | Indentasi tidak konsisten (bukan kelipatan 4 spasi) |
| W0312 | Campuran tab dan spasi |
| W0401 | Wildcard import (`from x import *`) |
| W0611 | Import tidak digunakan |
| W0612 | Variabel dibuat tapi tidak digunakan |
| W0613 | Parameter fungsi tidak digunakan |
| W0603 | Penggunaan keyword `global` |
| W0702 | `except` tanpa tipe exception |

#### 🟠 REFACTOR (Kode dimulai dengan "R")
**Deskripsi**: Kode berfungsi tapi memiliki kompleksitas tinggi atau struktur yang perlu diperbaiki.

| Kode | Penjelasan |
|------|------------|
| R0801 | Kode duplikat ditemukan (copy-paste terdeteksi) |
| R0911 | Terlalu banyak return statement (max 6) |
| R0912 | Terlalu banyak branch/if (max 12) |
| R0913 | Terlalu banyak parameter function (max 5) |
| R0915 | Terlalu banyak statement dalam function (max 50) |

#### 🟢 CONVENTION (Kode dimulai dengan "C")
**Deskripsi**: Pelanggaran standar penulisan kode PEP 8, tidak mempengaruhi fungsionalitas tapi mempengaruhi keterbacaan.

| Kode | Penjelasan |
|------|------------|
| C0103 | Penamaan tidak sesuai standar (snake_case untuk variabel, PascalCase untuk class) |
| C0114 | Module tidak punya docstring di awal file |
| C0115 | Class tidak punya docstring |
| C0116 | Fungsi tidak punya docstring |
| C0301 | Baris terlalu panjang (max 79 karakter) |
| C0303 | Trailing whitespace (spasi di akhir baris) |
| C0304 | File tidak diakhiri dengan baris kosong |
| C0410 | Import beberapa module dalam satu baris |

---

## 6. ATURAN ANALISIS YANG DITERAPKAN

### 6.1 Daftar Lengkap Aturan Analisis AST

Script analisis Python yang dikirim ke Wandbox mengimplementasikan **13 kategori pengecekan** yang mencakup **~25 aturan**:

| No | Kategori Pengecekan | Aturan yang Dicek | Kode Pylint |
|----|---------------------|-------------------|-------------|
| 1 | Syntax Check | Apakah kode valid secara sintaksis | E0001 |
| 2 | Function Naming | Nama fungsi harus `snake_case` | C0103 |
| 3 | Function Docstring | Setiap fungsi harus punya docstring | C0116 |
| 4 | Function Complexity | Max 5 parameter | R0913 |
| 5 | Function Complexity | Max 50 statements | R0915 |
| 6 | Function Complexity | Max 12 branches | R0912 |
| 7 | Function Complexity | Max 6 return statements | R0911 |
| 8 | Class Naming | Nama class harus `PascalCase` | C0103 |
| 9 | Class Docstring | Setiap class harus punya docstring | C0115 |
| 10 | Variable Naming | Variabel harus `snake_case` | C0103 |
| 11 | Variable Naming | Nama variabel tidak boleh 1 huruf (kecuali i, j, k, x, y, n) | C0103 |
| 12 | Module Docstring | File harus punya docstring di awal | C0114 |
| 13 | Unused Import | Import yang tidak digunakan dalam kode | W0611 |
| 14 | Wildcard Import | `from x import *` tidak disarankan | W0401 |
| 15 | Bare Except | `except` tanpa tipe exception | W0702 |
| 16 | Dangerous Functions | Penggunaan `eval()` | W0123 |
| 17 | Dangerous Functions | Penggunaan `exec()` | W0122 |
| 18 | Unreachable Code | Kode setelah `return` | W0101 |
| 19 | Line Length | Baris > 79 karakter | C0301 |
| 20 | Trailing Whitespace | Spasi di akhir baris | C0303 |
| 21 | Indentation | Tab dan spasi tercampur | W0312 |
| 22 | Indentation | Indentasi bukan kelipatan 4 | W0311 |
| 23 | Final Newline | File tidak diakhiri baris kosong | C0304 |
| 24 | Duplicate Code | Baris identik muncul ≥3 kali | R0801 |
| 25 | Unnecessary Pass | `pass` yang tidak diperlukan | W0107 |
| 26 | Global Usage | Penggunaan keyword `global` | W0603 |
| 27 | Multiple Imports | Import beberapa module dalam satu baris | C0410 |

### 6.2 Pengecekan Tambahan (TypeScript Server-Side)

Setelah analisis AST, server menjalankan pengecekan tambahan PEP 8:

| No | Pengecekan | Detail |
|----|------------|--------|
| 1 | Line length | Baris > 79 karakter (C0301) |
| 2 | Trailing whitespace | Spasi di akhir baris (C0303) |
| 3 | Indentasi | Bukan kelipatan 4 spasi (W0311) |
| 4 | Mixed indentation | Tab + spasi tercampur (W0312) |
| 5 | Final newline | File tidak berakhir newline (C0304) |

---

## 7. ALUR KERJA SISTEM (FLOWCHART NARATIF)

### 7.1 Alur Eksekusi Kode (Run Code)

```
[Siswa klik "Run Code"]
        │
        ▼
[Frontend mengirim POST /api/compiler/execute]
  Body: { code: "..." }
        │
        ▼
[Backend: Autentikasi user via Supabase cookies]
        │
        ▼
[Backend: Validasi input (code harus string, tidak kosong)]
        │
        ├── Gagal → Return 400 Bad Request
        │
        ▼
[Backend: Validasi sintaks via Wandbox (ast.parse)]
        │
        ├── Syntax Error → Return { success: false, error: "SyntaxError..." }
        │
        ▼
[Backend: Eksekusi kode via Wandbox API]
        │
        ├── Timeout (15s) → Return { success: false, error: "Execution timeout" }
        ├── API Error → Return { success: false, error: "API Error: ..." }
        ├── Runtime Error → Return { success: false, error: "RuntimeError: ..." }
        │
        ▼
[Backend: Return hasil sukses]
  { success: true, output: "Hello World", execution_time: 2500 }
        │
        ▼
[Frontend menampilkan output di console]
```

### 7.2 Alur Analisis Clean Code (Analyze)

```
[Siswa klik "Analyze Code" / "Check Clean Code"]
        │
        ▼
[Frontend mengirim POST /api/compiler/analyze]
  Body: { code: "..." }
        │
        ▼
[Backend: Autentikasi user via Supabase]
        │
        ▼
[Backend: Validasi input]
        │
        ▼
[Backend: CleanCodeAnalyzer.analyze(code)]
        │
        ▼
[Tahap 1: Build analysis script]
  - Encode kode siswa ke Base64
  - Buat script Python yang menggunakan ast module
  - Script melakukan 13 kategori pengecekan
        │
        ▼
[Tahap 2: Kirim script ke Wandbox API]
  POST https://wandbox.org/api/compile.json
  { code: "<analysis_script>", compiler: "cpython-3.10.15" }
        │
        ├── Gagal → Gunakan runFallbackAnalysis (TypeScript)
        │
        ▼
[Tahap 3: Parse output JSON dari Wandbox]
  Output berisi array pelanggaran:
  [{"message-id": "C0103", "type": "convention", "line": 1, ...}]
        │
        ▼
[Tahap 4: Kategorisasi pelanggaran]
  Pisahkan ke: errors[], warnings[], refactors[], conventions[]
        │
        ▼
[Tahap 5: Pengecekan PEP 8 tambahan (TypeScript)]
  Cek line length, trailing whitespace, indentasi
        │
        ▼
[Tahap 6: Hitung skor dengan rumus Pylint]
  Score = max(0, 10.0 - ((5*E + W + R + C) / S) * 10)
        │
        ▼
[Tahap 7: Generate laporan lengkap]
  - Grade category (Excellent/Very Good/Good/Fair/Poor/Very Poor)
  - Formatted report dengan penjelasan per masalah
  - Saran perbaikan dalam Bahasa Indonesia
  - Motivasi untuk siswa
  - Kode yang sudah diperbaiki (auto-fix dasar)
        │
        ▼
[Backend: Simpan submission ke database (jika siswa login)]
  - Insert ke tabel code_submissions
  - Update tabel leaderboard (total_points, average_score, dll)
        │
        ▼
[Backend: Return hasil analisis ke frontend]
  {
    success: true,
    analysis: {
      final_score: 7.5,
      grade: "7.50/10",
      breakdown: { ... },
      suggestions: [ ... ],
      detailed_analysis: { ... }
    }
  }
```

---

## 8. SISTEM PENILAIAN DAN GRADING

### 8.1 Skala Skor dan Grade

| Rentang Skor | Kategori | Emoji | Deskripsi |
|-------------|----------|-------|-----------|
| 9.00 - 10.00 | Excellent | ⭐⭐⭐ | Kode sangat bersih dan profesional |
| 8.00 - 8.99 | Very Good | ⭐⭐ | Kode sudah rapi, sedikit perbaikan |
| 7.00 - 7.99 | Good | ⭐ | Kode cukup baik, perlu perhatian naming & struktur |
| 5.50 - 6.99 | Fair | 👍 | Perlu perbaikan penamaan dan standar PEP 8 |
| 4.00 - 5.49 | Poor | ⚠️ | Perlu pelajari PEP 8 dan naming convention |
| 0.00 - 3.99 | Very Poor | ❌ | Perlu mulai dari dasar indentasi dan penamaan |

### 8.2 Format Output untuk Siswa

Setiap analisis menghasilkan output dalam format:

```
╔══════════════════════════════════════════════════════════════╗
║           📊 LAPORAN ANALISIS CLEAN CODE PYTHON              ║
║                    C3-Py Compiler Online                      ║
╚══════════════════════════════════════════════════════════════╝

📈 SKOR: 7.50/10 (Good ⭐)
📋 Total Temuan: 5 masalah

┌──────────────────────────────────────────────────────────────┐
│ RINGKASAN TEMUAN                                             │
├──────────────────────────────────────────────────────────────┤
│ 🔴 Error (bug potensial)        :   0 masalah              │
│ 🟡 Warning (potensi bug)        :   1 masalah              │
│ 🟠 Refactor (perlu struktur)    :   0 masalah              │
│ 🟢 Convention (PEP 8)           :   4 masalah              │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Breakdown Analisis

Hasil analisis juga dipecah menjadi 3 indikator:

| Indikator | Skor | Penjelasan |
|-----------|------|------------|
| **Meaningful Names** | 0-100 | Kualitas penamaan variabel/fungsi/class. Setiap pelanggaran C0103 mengurangi 20 poin |
| **Code Duplication** | 0-100 | Tingkat duplikasi kode. Setiap duplikasi R0801 mengurangi 25 poin |
| **Code Quality** | Skor Pylint × 10 | Kualitas keseluruhan berdasarkan rumus Pylint |

### 8.4 Motivasi Siswa

Berdasarkan skor, sistem memberikan pesan motivasi yang berbeda:

| Skor | Pesan |
|------|-------|
| ≥ 9 | 🎉 "Luar biasa! Kode kamu sudah sangat bersih dan profesional." |
| ≥ 8 | 👏 "Bagus sekali! Sedikit perbaikan lagi untuk sempurna!" |
| ≥ 7 | 👍 "Kerja bagus! Perhatikan naming convention dan struktur." |
| ≥ 5.5 | 💪 "Terus semangat! Perbaiki penamaan dan ikuti standar PEP 8." |
| ≥ 4 | 📚 "Jangan menyerah! Pelajari PEP 8 dan naming convention." |
| < 4 | 🚀 "Mulai dari dasar! Fokus pada indentasi dan penamaan." |

---

## 9. SISTEM LEADERBOARD DAN POIN

### 9.1 Perhitungan Poin

Setiap kali siswa melakukan analisis clean code, sistem menghitung poin:

```
Poin = Skor Pylint × 10 (dibulatkan)
```

Contoh:
- Skor 8.57/10 → Poin = 86 (85.7 dibulatkan ke 86)
- Skor 5.00/10 → Poin = 50
- Skor 10.00/10 → Poin = 100

### 9.2 Data Leaderboard

| Field | Penjelasan |
|-------|------------|
| `total_points` | Akumulasi semua poin dari setiap submission |
| `total_submissions` | Jumlah total submit kode |
| `average_score` | Rata-rata skor dari semua submission |
| `highest_score` | Skor tertinggi yang pernah dicapai |

### 9.3 Proses Update Leaderboard

```
[Siswa submit kode untuk analisis]
        │
        ▼
[Simpan ke tabel code_submissions]
        │
        ▼
[Ambil semua submission siswa dari database]
        │
        ▼
[Hitung ulang:
  - total_points += poin_baru
  - total_submissions += 1
  - average_score = Σ(semua skor) / jumlah_submission
  - highest_score = max(highest_score_lama, skor_baru)
]
        │
        ▼
[Upsert ke tabel leaderboard]
```

---

## 10. TEKNOLOGI YANG DIGUNAKAN

### 10.1 Stack Teknologi

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Next.js** | 14.2.0 | Framework full-stack React (SSR + API Routes) |
| **React** | 18 | Library UI untuk frontend |
| **TypeScript** | 5 | Bahasa pemrograman typed superset JavaScript |
| **Tailwind CSS** | 3.4.1 | Framework CSS utility-first |
| **Supabase** | - | Backend-as-a-Service (Auth + Database PostgreSQL) |
| **Wandbox API** | - | Online compiler service (CPython 3.10.15) |
| **Vercel** | - | Platform deployment serverless |

### 10.2 Wandbox API

**Wandbox** (https://wandbox.org) adalah layanan compiler online **gratis dan open-source** yang didukung oleh komunitas. Fitur:

- Gratis tanpa biaya
- Tidak memerlukan API key
- Mendukung Python 3.10.15 (CPython)
- Sandbox execution (kode berjalan dalam container terisolasi)
- Tidak ada hard rate limit (soft limit untuk penggunaan wajar)
- Digunakan oleh banyak platform edukasi

**Endpoint yang digunakan:**
```
POST https://wandbox.org/api/compile.json
```

**Request body:**
```json
{
  "code": "<kode yang akan dijalankan>",
  "compiler": "cpython-3.10.15",
  "save": false
}
```

**Response:**
```json
{
  "status": "0",
  "program_output": "<stdout>",
  "program_error": "<stderr>",
  "compiler_error": "<compilation error if any>"
}
```

### 10.3 Supabase

**Supabase** digunakan sebagai:
1. **Authentication** — Registrasi, login, reset password (email-based)
2. **Database** — PostgreSQL untuk menyimpan profil, submission, leaderboard, materi
3. **Row Level Security (RLS)** — Kebijakan keamanan data per-user

**Tabel database:**

| Tabel | Fungsi |
|-------|--------|
| `profiles` | Data pengguna (nama, email, role, avatar) |
| `code_submissions` | Histori submission kode dan hasil analisis |
| `leaderboard` | Peringkat dan statistik siswa |
| `materials` | Materi ajar yang diupload guru |

---

## 11. KEAMANAN DAN BATASAN SISTEM

### 11.1 Keamanan

| Aspek | Implementasi |
|-------|-------------|
| **Sandbox Execution** | Kode siswa dijalankan di sandbox Wandbox, bukan di server sendiri |
| **No File System Access** | Siswa tidak bisa mengakses file system server |
| **Timeout Protection** | Max 15 detik eksekusi, mencegah infinite loop |
| **Input Validation** | Kode divalidasi sebelum dieksekusi |
| **Authentication** | Setiap request memerlukan session Supabase |
| **RLS (Row Level Security)** | Data di database dilindungi per-user |
| **Service Role Key** | Hanya digunakan server-side, tidak exposed ke client |
| **Base64 Encoding** | Kode siswa di-encode Base64 untuk menghindari injection |

### 11.2 Batasan Sistem

| Batasan | Detail |
|---------|--------|
| **Waktu eksekusi** | Max 15 detik per run |
| **Bahasa pemrograman** | Hanya Python 3.10 |
| **Network access** | Kode siswa tidak bisa mengakses network dari Wandbox |
| **File I/O** | Kode siswa tidak bisa baca/tulis file |
| **Library external** | Hanya standar library Python yang tersedia |
| **Analisis aturan** | ~25 aturan (vs Pylint ~200+), difokuskan untuk level SMK |
| **Rate limit** | Soft limit Wandbox (~100-200 request/jam estimasi) |
| **Concurrent users** | Aman untuk ~30 siswa bersamaan |

### 11.3 Fallback Mechanism

Jika Wandbox API tidak tersedia (downtime/timeout), sistem otomatis menggunakan **analisis fallback berbasis TypeScript** yang mencakup:
- Pengecekan PEP 8 dasar (line length, whitespace, indentation)
- Naming convention dasar (fungsi, class)
- Penggunaan eval/exec
- Module docstring

Skor tetap dihitung dengan rumus Pylint yang sama, namun jumlah aturan yang dicek lebih sedikit.

---

## 12. FAQ — PERTANYAAN YANG MUNGKIN DIAJUKAN DOSEN

### Q1: "Apakah ini menggunakan Pylint langsung?"

**Jawaban:**
Tidak secara langsung. Sistem tidak menjalankan tool Pylint, tetapi menggunakan **modul `ast` (Abstract Syntax Tree) bawaan Python** untuk menganalisis struktur kode. Namun:
- **Kode pelanggaran** yang digunakan **identik dengan kode Pylint** (C0103, W0611, R0913, dll)
- **Rumus perhitungan skor** menggunakan **rumus Pylint yang identik**: `max(0, 10.0 - ((5*E + W + R + C) / S) * 10)`
- **Kategori pelanggaran** mengikuti standar Pylint: Error, Warning, Refactor, Convention

Alasan tidak menggunakan Pylint langsung: Platform deployment (Vercel serverless) tidak menyediakan environment Python. Sehingga analisis dilakukan secara remote menggunakan modul Python `ast` yang tersedia di Wandbox.

### Q2: "Apakah rumus skornya valid? Dari mana sumber rumusnya?"

**Jawaban:**
Ya, rumus ini adalah **rumus resmi dari Pylint** yang digunakan oleh komunitas Python di seluruh dunia. Rumus dapat diverifikasi di:
- Source code Pylint: https://github.com/pylint-dev/pylint
- Dokumentasi resmi: https://pylint.readthedocs.io/en/latest/

Rumus: `Score = max(0, 10.0 - ((5*E + W + R + C) / S) * 10)`

### Q3: "Kenapa tidak pakai Pylint langsung saja?"

**Jawaban:**
1. **Kompatibilitas**: Vercel (platform hosting) tidak menyediakan Python runtime di environment serverless
2. **Fokus edukasi**: Pylint memiliki 200+ aturan yang bisa membingungkan siswa SMK. Sistem ini memfokuskan ~25 aturan esensial yang paling relevan untuk pemula
3. **Kustomisasi**: Pesan error ditampilkan dalam Bahasa Indonesia dengan penjelasan yang mudah dipahami siswa SMK
4. **Performa**: Menghindari overhead instalasi dan konfigurasi Pylint

### Q4: "Bagaimana jika Wandbox down?"

**Jawaban:**
Sistem memiliki **mekanisme fallback** (`runFallbackAnalysis`). Jika Wandbox API gagal, analisis otomatis beralih ke analisis TypeScript murni yang berjalan di server Vercel. Analisis ini tetap mencakup pengecekan PEP 8 dasar dan naming convention, meskipun cakupannya lebih terbatas dibanding analisis AST. Skor tetap dihitung menggunakan rumus Pylint yang sama.

### Q5: "Apakah aman untuk kode siswa?"

**Jawaban:**
Ya. Kode siswa dijalankan di **sandbox terisolasi** milik Wandbox, bukan di server utama. Siswa tidak bisa:
- Mengakses file system server
- Mengakses database
- Mengirim network request
- Menjalankan kode berbahaya yang mempengaruhi user lain

Selain itu, setiap eksekusi dibatasi timeout 15 detik untuk mencegah penyalahgunaan.

### Q6: "Apa bedanya skor 0-10 dan skor 0-100?"

**Jawaban:**
- **Skor Clean Code** (0-10): Hasil langsung dari rumus Pylint, ditampilkan di laporan analisis. Ini adalah skor utama kualitas kode.
- **Poin Leaderboard** (0-100): Konversi dari skor × 10, digunakan untuk sistem peringkat/gamifikasi. Contoh: skor 8.5/10 → 85 poin.

### Q7: "Berapa siswa yang bisa menggunakan secara bersamaan?"

**Jawaban:**
Sistem aman untuk **~30 siswa bersamaan**. Perhitungan:
- Rata-rata siswa submit 2× per menit → total ~6 request/menit
- Setiap request = 2 API call ke Wandbox (execute + analyze)
- Total: ~12 API call/menit ke Wandbox
- Wandbox dapat menangani ini tanpa masalah (soft limit ~100-200 request/jam)

### Q8: "Apa standar yang dijadikan acuan untuk analisis clean code?"

**Jawaban:**
Sistem mengacu pada tiga sumber utama:
1. **PEP 8** — Style Guide for Python Code (Python Enhancement Proposal #8), standar resmi penulisan kode Python dari Python Software Foundation
2. **Prinsip Clean Code** — Berdasarkan konsep Clean Code oleh Robert C. Martin (2008), difokuskan pada: Naming Convention (penamaan bermakna), Code Structure (fungsi kecil, parameter minimal), Documentation (docstring), dan Eliminating Duplication
3. **Pylint Scoring** — Rumus dan kategori dari tool Pylint, standard linter Python yang diakui oleh komunitas global

### Q9: "Apakah analisis ini sama akuratnya dengan Pylint asli?"

**Jawaban:**
Tidak 100% sama. Perbedaannya:
- **Pylint asli**: ~200+ aturan, type inference, cross-module analysis
- **Sistem ini**: ~25 aturan esensial, analisis per-file

Namun untuk **konteks edukasi siswa SMK**, 25 aturan ini sudah mencakup hal-hal yang paling penting dan fundamental. Aturan yang dipilih adalah aturan yang paling sering dilanggar oleh pemula dan paling berdampak pada kualitas kode. Rumus skor yang digunakan tetap identik sehingga hasil scoring-nya valid secara akademis.

### Q10: "Apa yang terjadi jika kode siswa memiliki infinite loop?"

**Jawaban:**
Sistem memiliki **mekanisme timeout 15 detik** menggunakan `AbortController`. Jika kode tidak selesai dalam 15 detik (misalnya `while True: pass`), eksekusi dibatalkan dan siswa mendapat pesan: "Execution timeout (max 15s)". Ini mencegah penggunaan resource yang berlebihan di Wandbox maupun di server Vercel.

### Q11: "Apakah data skor siswa tersimpan?"

**Jawaban:**
Ya, untuk siswa yang sudah login dengan role `siswa`. Setiap submission disimpan di tabel `code_submissions` di database PostgreSQL (Supabase) yang berisi:
- Kode yang disubmit
- Skor clean code (0-10)
- Grade (misalnya "7.50/10")
- Hasil analisis lengkap (JSON)
- Timestamp submission

Data ini juga digunakan untuk menghitung leaderboard secara real-time, termasuk: total poin, jumlah submission, rata-rata skor, dan skor tertinggi.

### Q12: "Mengapa memilih Wandbox dibanding layanan lain?"

**Jawaban:**
Beberapa layanan yang dievaluasi:

| Layanan | Status | Alasan Tidak Digunakan |
|---------|--------|----------------------|
| Piston API (emkc.org) | 401 Unauthorized | API sudah tidak publik, memerlukan self-hosting |
| Judge0 | 403 Forbidden | Memerlukan API key berbayar untuk production |
| OneCompiler | 500 Error | API tidak stabil, sering timeout |
| **Wandbox** | **Berhasil** | Gratis, stabil, tanpa API key |

Wandbox dipilih karena:
1. **Gratis** tanpa batas waktu dan tanpa registrasi
2. **Tidak perlu API key** — mengurangi kompleksitas konfigurasi
3. **Stabil** — sudah beroperasi bertahun-tahun dan di-maintain komunitas
4. **Open source** — kode sumber tersedia di GitHub (github.com/melpon/wandbox)
5. **Mendukung CPython 3.10** — versi Python yang cukup modern dan stabil

### Q13: "Bagaimana Base64 encoding bekerja dalam sistem ini?"

**Jawaban:**
Kode siswa di-encode ke format Base64 sebelum disisipkan ke dalam script analisis. Tujuannya:
1. **Menghindari escaping issue** — Kode siswa mungkin mengandung karakter seperti tanda kutip (', ", '''), backslash (\\), atau karakter spesial lain yang bisa merusak string literal dalam script analisis
2. **Keamanan** — Mencegah code injection dimana kode siswa bisa "keluar" dari string dan mengeksekusi perintah di script analisis

Proses:
```
Kode siswa: print("Hello 'World'")
     ↓ Base64 encode
Base64: cHJpbnQoIkhlbGxvICdXb3JsZCciKQ==
     ↓ Di dalam script analisis
CODE = base64.b64decode("cHJpbnQoIkhlbGxvICdXb3JsZCciKQ==").decode("utf-8")
     ↓ Decoded kembali
Kode asli: print("Hello 'World'")
```

### Q14: "Apa itu Abstract Syntax Tree (AST) dan mengapa digunakan?"

**Jawaban:**
AST adalah representasi struktur kode program dalam bentuk pohon (tree). Setiap elemen kode (variabel, fungsi, operator, dll) menjadi **node** dalam pohon.

Modul `ast` adalah **modul bawaan Python** (bagian dari standard library, tidak perlu install) yang bisa mem-parse kode Python menjadi AST. Dokumen resmi: https://docs.python.org/3/library/ast.html

Keuntungan menggunakan AST:
1. **Analisis struktural** — Bisa mendeteksi pola kode secara akurat (bukan hanya text matching)
2. **Reliable** — `ast.parse()` menggunakan parser Python asli, sehingga hasilnya 100% akurat
3. **Tanpa dependensi** — Tidak perlu install library tambahan
4. **Aman** — `ast.parse()` hanya mem-parse, tidak mengeksekusi kode

---

## LAMPIRAN

### A. Referensi Akademis

1. **PEP 8 — Style Guide for Python Code**
   - Van Rossum, G., Warsaw, B., & Coghlan, N. (2001)
   - URL: https://peps.python.org/pep-0008/

2. **Pylint — Python Code Static Checker**
   - URL: https://pylint.readthedocs.io/en/latest/
   - GitHub: https://github.com/pylint-dev/pylint

3. **Clean Code: A Handbook of Agile Software Craftsmanship**
   - Martin, R.C. (2008). Prentice Hall.

4. **Python AST Module Documentation**
   - URL: https://docs.python.org/3/library/ast.html

5. **Wandbox — Online Compiler**
   - GitHub: https://github.com/melpon/wandbox
   - API: https://wandbox.org

### B. Struktur File Sistem

```
lib/
├── services/
│   ├── PythonCompilerService.ts    ← Service eksekusi Python (193 baris)
│   └── CleanCodeAnalyzer.ts        ← Engine analisis clean code (1275 baris)
├── types/
│   └── database.ts                 ← Tipe data TypeScript (118 baris)
└── supabase/
    ├── client.ts                   ← Supabase client (browser)
    ├── server.ts                   ← Supabase client (server)
    └── admin.ts                    ← Supabase admin (service role)

app/api/compiler/
├── execute/route.ts                ← API endpoint: jalankan kode (47 baris)
└── analyze/route.ts                ← API endpoint: analisis + simpan skor (158 baris)
```

### C. Diagram Sequence Lengkap

```
Browser          Backend API        Wandbox API       Supabase
   │                  │                  │                │
   │  POST /execute   │                  │                │
   │─────────────────>│                  │                │
   │                  │  getUser()       │                │
   │                  │─────────────────────────────────>│
   │                  │  user data       │                │
   │                  │<─────────────────────────────────│
   │                  │                  │                │
   │                  │  Validate Syntax │                │
   │                  │  POST /compile   │                │
   │                  │─────────────────>│                │
   │                  │  SYNTAX_OK       │                │
   │                  │<─────────────────│                │
   │                  │                  │                │
   │                  │  Execute Code    │                │
   │                  │  POST /compile   │                │
   │                  │─────────────────>│                │
   │                  │  program_output  │                │
   │                  │<─────────────────│                │
   │                  │                  │                │
   │  { output }      │                  │                │
   │<─────────────────│                  │                │
   │                  │                  │                │
   │  POST /analyze   │                  │                │
   │─────────────────>│                  │                │
   │                  │  AST Analysis    │                │
   │                  │  POST /compile   │                │
   │                  │─────────────────>│                │
   │                  │  JSON messages   │                │
   │                  │<─────────────────│                │
   │                  │                  │                │
   │                  │  Calculate Score │                │
   │                  │  (Pylint formula)│                │
   │                  │                  │                │
   │                  │  Save submission │                │
   │                  │─────────────────────────────────>│
   │                  │  Update leaderboard              │
   │                  │─────────────────────────────────>│
   │                  │                  │                │
   │  { analysis }    │                  │                │
   │<─────────────────│                  │                │
```

### D. Kamus Istilah

| Istilah | Penjelasan |
|---------|------------|
| **AST** | Abstract Syntax Tree — representasi kode dalam bentuk pohon |
| **PEP 8** | Python Enhancement Proposal #8 — standar penulisan kode Python |
| **Pylint** | Tool analisis statis untuk Python yang mengecek kualitas kode |
| **snake_case** | Konvensi penamaan: huruf kecil dengan underscore (contoh: `hitung_total`) |
| **PascalCase** | Konvensi penamaan: huruf kapital di awal setiap kata (contoh: `HitungTotal`) |
| **Docstring** | String dokumentasi di awal fungsi/class/module (contoh: `"""Deskripsi."""`) |
| **Serverless** | Arsitektur cloud dimana server dikelola provider (Vercel), developer tidak perlu manage server |
| **Sandbox** | Lingkungan terisolasi untuk menjalankan kode secara aman |
| **Linter** | Tool yang menganalisis kode untuk menemukan error, bug, dan pelanggaran standar |
| **Fallback** | Mekanisme cadangan jika sistem utama gagal |
| **Upsert** | Operasi database: update jika sudah ada, insert jika belum ada |
| **RLS** | Row Level Security — kebijakan keamanan Supabase yang membatasi akses data per-user |

---

*Dokumen ini dibuat untuk mendukung sidang proposal skripsi.*
*Terakhir diperbarui: 25 Februari 2026*
