# Diagram Sistem CLING (Compiler Learning INteractive Grader)

---

## 1. Activity Diagram

### 1.1 Activity Diagram — Login

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman Login]
        P2[Mengisi Email<br>dan Password]
        P3[Klik Tombol Login]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan<br>Form Login]
        S2[Memverifikasi<br>Email dan Password]
        S3{Kredensial Valid?}
        S4[Tampilkan Pesan<br>Email atau Password Salah]
        S5[Mengambil Role<br>Pengguna]
        S6{Role Pengguna?}
        S7[Mengarahkan ke<br>Halaman Compiler]
        S8[Mengarahkan ke<br>Halaman Dashboard]
        S2 --> S3
        S3 -- Tidak --> S4 --> S1
        S3 -- Ya --> S5 --> S6
        S6 -- Siswa --> S7
        S6 -- Guru --> S8
    end

    Start --> P1
    P1 --> S1
    S1 -.-> P2
    P2 --> P3
    P3 --> S2
    S7 --> End
    S8 --> End
```

---

### 1.2 Activity Diagram — Registrasi Akun

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman Register]
        P2[Mengisi Form Nama Email<br>Password Role NIS Kelas]
        P3[Klik Tombol Daftar]
        P4[Melihat Pesan<br>Registrasi Berhasil]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan<br>Form Registrasi]
        S2[Validasi Password<br>Min 6 Karakter dan Ada Angka]
        S3{Password dan<br>Data Valid?}
        S4[Tampilkan Pesan Error]
        S5[Mengirim Data<br>Registrasi]
        S6[Memvalidasi Data Wajib<br>dan Role]
        S7{Role Guru?}
        S8[Memvalidasi Kode Token<br>Sekolah]
        S9{Token Valid?}
        S10[Tampilkan Error<br>Token Tidak Valid]
        S11[Membuat Akun<br>Pengguna Baru]
        S12{Email Sudah<br>Terdaftar?}
        S13[Tampilkan Error<br>Email Sudah Ada]
        S14[Menyimpan Data<br>Profil Pengguna]
        S15[Tampilkan Pesan<br>Registrasi Berhasil]
        S2 --> S3
        S3 -- Tidak --> S4 --> S1
        S3 -- Ya --> S5 --> S6 --> S7
        S7 -- Ya --> S8 --> S9
        S9 -- Tidak --> S10 --> S1
        S9 -- Ya --> S11
        S7 -- Tidak --> S11
        S11 --> S12
        S12 -- Ya --> S13 --> S1
        S12 -- Tidak --> S14 --> S15
    end

    Start --> P1
    P1 --> S1
    S1 -.-> P2
    P2 --> P3
    P3 --> S2
    S15 -.-> P4
    P4 --> End
```

---

### 1.3 Activity Diagram — Eksekusi Kode Python (Compiler)

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman<br>/siswa/compiler]
        P2[Menulis Kode Python<br>di Code Editor]
        P3[Klik Tombol Run]
        P4[Melihat Output<br>di Panel Terminal]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan Halaman<br>Compiler dengan Editor]
        S2[Mengirim Kode<br>untuk Dieksekusi]
        S3[Memvalidasi<br>Sintaks Kode]
        S4{Sintaks Valid?}
        S5[Kembalikan Pesan<br>Syntax Error]
        S6[Mengirim Kode<br>untuk Dijalankan]
        S7[Menjalankan Kode<br>dengan Batas Waktu 10 Detik]
        S8{Eksekusi Berhasil?}
        S9[Kembalikan Pesan<br>Timeout atau Runtime Error]
        S10[Mengembalikan<br>Hasil Output]
        S11[Tampilkan Hasil<br>di Panel Output]
        S2 --> S3 --> S4
        S4 -- Tidak --> S5 --> S11
        S4 -- Ya --> S6 --> S7 --> S8
        S8 -- Tidak --> S9 --> S11
        S8 -- Ya --> S10 --> S11
    end

    Start --> P1
    P1 --> S1
    S1 -.-> P2
    P2 --> P3
    P3 --> S2
    S11 -.-> P4
    P4 --> End
```

---

### 1.4 Activity Diagram — Analisis Clean Code

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman<br>/siswa/compiler]
        P2[Menulis Kode Python<br>di Code Editor]
        P3[Klik Tombol Analyze]
        P4[Melihat Skor Grade<br>dan Detail Laporan]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan Halaman<br>Compiler dengan Editor]
        S2[Mengirim Kode<br>untuk Dianalisis]
        S3[Memproses<br>Analisis Kode]
        S4[Menyimpan Kode<br>Sementara]
        S5[Menjalankan<br>Pengecekan Kode]
        S6[Mengkategorikan<br>Pesan Kesalahan<br>dan Peringatan]
        S7[Menghitung Skor<br>Clean Code]
        S8[Menentukan Grade<br>A B C D atau F]
        S9{User Login<br>dan Role Siswa?}
        S10[Menyimpan Data<br>Submission]
        S11[Memperbarui Data<br>Leaderboard]
        S12[Tampilkan Skor Grade<br>Breakdown dan Saran]
        S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
        S9 -- Ya --> S10 --> S11 --> S12
        S9 -- Tidak --> S12
    end

    Start --> P1
    P1 --> S1
    S1 -.-> P2
    P2 --> P3
    P3 --> S2
    S2 --> S3
    S12 -.-> P4
    P4 --> End
```

---

### 1.5 Activity Diagram — Melihat Leaderboard

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Klik Menu Leaderboard<br>di Sidebar]
        P2[Melihat Top 3<br>dan Tabel Ranking]
        P3[Filter Berdasarkan Kelas]
        P4[Melihat Hasil Filter]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Mengambil Data<br>Leaderboard]
        S2[Mengambil Data Peringkat<br>Berdasarkan Total Poin]
        S3[Mengambil Data Profil<br>Nama Avatar dan Kelas]
        S4[Menggabungkan Data<br>Leaderboard dan Profil]
        S5[Menghitung Ranking<br>dan Mengambil Top 3]
        S6[Mencari Data Pengguna<br>Saat Ini di Leaderboard]
        S7[Tampilkan Podium Top 3<br>dan Tabel Ranking]
        S8[Filter Data Berdasarkan<br>Kelas yang Dipilih]
        S9[Tampilkan Hasil Filter]
        S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7
        S8 --> S9
    end

    Start --> P1
    P1 --> S1
    S7 -.-> P2
    P2 --> P3
    P3 --> S8
    S9 -.-> P4
    P4 --> End
```

---

### 1.6 Activity Diagram — Guru Memantau Siswa

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Login sebagai Guru]
        P2[Membuka Halaman<br>/guru/dashboard]
        P3[Melihat Statistik Kelas<br>dan Tabel Siswa]
        P4[Filter atau Cari Siswa]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Cek Autentikasi User]
        S2[Mengambil Role<br>Pengguna]
        S3{Role = Guru?}
        S4[Menampilkan Pesan<br>Akses Ditolak]
        S5[Mengambil Data<br>Siswa]
        S6[Mengambil Semua<br>Data Siswa]
        S7[Mengambil Data<br>Peringkat per Siswa]
        S8[Mengambil Data<br>Statistik Harian]
        S9[Menghitung Statistik Kelas<br>Total Siswa Rata-rata Skor]
        S10[Tampilkan Dashboard<br>Statistik dan Tabel Siswa]
        S11[Filter Data Lokal<br>Berdasarkan Input]
        S1 --> S2 --> S3
        S3 -- Tidak --> S4
        S3 -- Ya --> S5
        S5 --> S6 --> S7 --> S8 --> S9 --> S10
        S11 --> S10
    end

    Start --> P1
    P1 --> S1
    S4 --> End
    S10 -.-> P3
    P3 --> P4
    P4 --> S11
    P2 --> S5
```

---

### 1.7 Activity Diagram — Kelola Materi (Guru)

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman<br>Kelola Materi]
        P2[Melihat Daftar Materi]
        P3[Mengisi Form Upload<br>Judul Deskripsi Kategori File]
        P4[Klik Upload Materi]
        P5[Klik Hapus Materi]
        P6[Melihat Daftar<br>Materi Terbaru]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Cek Role Guru]
        S2{Role = Guru?}
        S3[Menampilkan Pesan<br>Akses Ditolak]
        S4[Mengambil<br>Daftar Materi]
        S5[Menampilkan Daftar Materi<br>dengan Info Guru]
        S6[Mengirim Data<br>Materi Baru]
        S7[Memvalidasi Tipe File<br>PDF PPT PPTX saja]
        S8[Memvalidasi Ukuran File<br>Maksimal 50MB]
        S9{File Valid?}
        S10[Tampilkan Pesan Error]
        S11[Mengunggah File<br>ke Penyimpanan]
        S12[Menyimpan Informasi<br>Materi]
        S13[Memverifikasi Kepemilikan<br>dan Menghapus Materi]
        S14[Menghapus File<br>dan Data Materi]
        S15[Memperbarui<br>Daftar Materi]
        S1 --> S2
        S2 -- Tidak --> S3
        S2 -- Ya --> S4 --> S5
        S6 --> S7 --> S8 --> S9
        S9 -- Tidak --> S10
        S9 -- Ya --> S11 --> S12 --> S15
        S13 --> S14 --> S15
    end

    Start --> P1
    P1 --> S1
    S3 --> End
    S5 -.-> P2
    P2 --> P3
    P3 --> P4
    P4 --> S6
    P2 --> P5
    P5 --> S13
    S15 -.-> P6
    P6 --> End
```

---

### 1.8 Activity Diagram — Lihat Materi (Siswa)

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Klik Menu Materi<br>di Sidebar]
        P2[Melihat Daftar Materi]
        P3[Filter Berdasarkan<br>Kategori atau Pencarian]
        P4[Klik Download atau<br>Buka File Materi]
        P5[Membaca File Materi<br>PDF PPT PPTX]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Cek Autentikasi User]
        S2{User Sudah Login?}
        S3[Menampilkan Pesan<br>Belum Login]
        S4[Mengambil<br>Daftar Materi]
        S5[Mengambil Data Materi<br>dan Nama Guru]
        S6[Mengurutkan<br>Berdasarkan Terbaru]
        S7[Menampilkan Daftar Materi<br>dengan Info Guru dan Ukuran]
        S8[Memfilter Data<br>Berdasarkan Kategori<br>atau Kata Kunci]
        S9[Membuka File<br>dari Penyimpanan]
        S1 --> S2
        S2 -- Tidak --> S3
        S2 -- Ya --> S4 --> S5 --> S6 --> S7
        S8 --> S7
    end

    Start --> P1
    P1 --> S1
    S3 --> End
    S7 -.-> P2
    P2 --> P3
    P3 --> S8
    P2 --> P4
    P4 --> S9
    S9 -.-> P5
    P5 --> End
```

---

### 1.9 Activity Diagram — Edit Profil

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Klik Menu Profil<br>di Sidebar]
        P2[Melihat Data Profil<br>Nama Email NIS Kelas]
        P3[Mengubah Nama atau<br>Upload Foto Profil]
        P4[Klik Simpan]
        P5[Melihat Profil<br>yang Sudah Diperbarui]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Cek Session User]
        S2[Mengambil Data<br>Profil Pengguna]
        S3[Menampilkan<br>Halaman Profil]
        S4{Upload Avatar?}
        S5[Memvalidasi Tipe File Gambar<br>dan Ukuran Maks 2MB]
        S6{File Valid?}
        S7[Tampilkan Error]
        S8[Mengunggah Foto<br>ke Penyimpanan]
        S9[Menyimpan URL<br>Foto Profil]
        S10[Menyimpan Perubahan<br>Data Profil]
        S11[Tampilkan Profil Terbaru]
        S1 --> S2 --> S3
        S4 -- Ya --> S5 --> S6
        S6 -- Tidak --> S7
        S6 -- Ya --> S8 --> S9 --> S11
        S4 -- Tidak --> S10 --> S11
    end

    Start --> P1
    P1 --> S1
    S3 -.-> P2
    P2 --> P3
    P3 --> S4
    P3 --> P4
    P4 --> S10
    S11 -.-> P5
    P5 --> End
```

---

### 1.10 Activity Diagram — Progress Clean Code (Riwayat Submission)

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Membuka Halaman<br>/siswa/compiler]
        P2[Melihat Skor Terakhir<br>di Header Compiler]
        P3[Klik Tombol Riwayat]
        P4[Melihat Daftar<br>Riwayat Submission]
        P5[Klik Salah Satu<br>Submission]
        P6[Melihat Detail Kode<br>Skor Grade dan Analisis]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Cek Session User]
        S2[Mengambil Skor<br>Terakhir]
        S3[Tampilkan Skor dan Grade<br>di Header Compiler]
        S4[Mengambil 50 Riwayat<br>Submission Terakhir]
        S5[Tampilkan Modal<br>Daftar Riwayat Submission]
        S6[Tampilkan Detail<br>Kode Skor Grade<br>dan Hasil Analisis]
        S1 --> S2 --> S3
        S4 --> S5
    end

    Start --> P1
    P1 --> S1
    S3 -.-> P2
    P2 --> P3
    P3 --> S4
    S5 -.-> P4
    P4 --> P5
    P5 --> S6
    S6 -.-> P6
    P6 --> End
```

---

### 1.11 Activity Diagram — Hapus Akun

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna"]
        direction TB
        P1[Klik Menu Profil]
        P2[Klik Tombol Hapus Akun]
        P3[Ketik HAPUS AKUN<br>untuk Konfirmasi]
        P4[Klik Konfirmasi Hapus]
        P5[Melihat Halaman Login<br>Akun Telah Dihapus]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan<br>Halaman Profil]
        S2[Menampilkan Dialog<br>Konfirmasi Hapus Akun]
        S3[Mengirim Permintaan<br>Hapus Akun]
        S4{confirmText =<br>HAPUS AKUN?}
        S5[Tampilkan Error<br>Konfirmasi Tidak Valid]
        S6[Mengecek Role<br>Pengguna]
        S7{Role = Siswa?}
        S8[Menghapus Data<br>Leaderboard Siswa]
        S9[Menghapus Data<br>Submission Siswa]
        S10[Menghapus Data<br>Profil Pengguna]
        S11[Menghapus Foto Profil<br>dari Penyimpanan]
        S12[Menghapus Akun<br>Pengguna]
        S13[Keluar dan Mengarahkan<br>ke Halaman Login]
        S3 --> S4
        S4 -- Tidak --> S5 --> S2
        S4 -- Ya --> S6 --> S7
        S7 -- Ya --> S8 --> S9 --> S10
        S7 -- Tidak --> S10
        S10 --> S11 --> S12 --> S13
    end

    Start --> P1
    P1 --> S1
    S1 -.-> P2
    P2 --> S2
    S2 -.-> P3
    P3 --> P4
    P4 --> S3
    S13 -.-> P5
    P5 --> End
```

---

### 1.12 Activity Diagram — Guru Menghapus Akun Siswa

```mermaid
flowchart LR
    Start((●))
    style Start fill:#000,stroke:#000,color:#fff
    End((●))
    style End fill:#000,stroke:#000,color:#fff

    subgraph Pengguna["Pengguna (Guru)"]
        direction TB
        P1[Membuka Halaman<br>Dashboard Guru]
        P2[Melihat Daftar Siswa<br>di Tabel]
        P3[Klik Tombol Hapus<br>pada Salah Satu Siswa]
        P4[Melihat Dialog<br>Konfirmasi Hapus]
        P5[Klik Konfirmasi Hapus]
        P6[Melihat Daftar Siswa<br>yang Sudah Diperbarui]
    end

    subgraph Sistem["Sistem"]
        direction TB
        S1[Menampilkan Halaman<br>Dashboard Guru]
        S2[Mengambil Daftar Siswa<br>dan Menampilkan Tabel]
        S3[Menampilkan Dialog<br>Konfirmasi Hapus Akun Siswa]
        S4[Mengirim Permintaan<br>Hapus Akun Siswa]
        S5[Memverifikasi Role<br>Pengguna sebagai Guru]
        S6{Role = Guru?}
        S7[Menampilkan Pesan<br>Akses Ditolak]
        S8[Memverifikasi Data<br>Siswa yang Akan Dihapus]
        S9{Siswa Ditemukan?}
        S10[Menampilkan Pesan<br>Siswa Tidak Ditemukan]
        S11[Menghapus Data<br>Leaderboard Siswa]
        S12[Menghapus Data<br>Submission Siswa]
        S13[Menghapus Data<br>Profil Siswa]
        S14[Menghapus Foto Profil<br>dari Penyimpanan]
        S15[Menghapus Akun<br>Siswa]
        S16[Memperbarui<br>Daftar Siswa]
        S4 --> S5 --> S6
        S6 -- Tidak --> S7
        S6 -- Ya --> S8 --> S9
        S9 -- Tidak --> S10
        S9 -- Ya --> S11 --> S12 --> S13 --> S14 --> S15 --> S16
    end

    Start --> P1
    P1 --> S1
    S2 -.-> P2
    P2 --> P3
    P3 --> S3
    S3 -.-> P4
    P4 --> P5
    P5 --> S4
    S7 --> End
    S10 --> End
    S16 -.-> P6
    P6 --> End
```

---

---

## 2. Sequence Diagram

### 2.1 Sequence Diagram — Login

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant FE as Next.js Frontend
    participant Auth as Supabase Auth
    participant DB as Supabase DB

    User->>FE: Buka halaman /login
    FE-->>User: Tampilkan form login
    User->>FE: Input email & password
    User->>FE: Klik tombol Login
    FE->>Auth: signInWithPassword(email, password)
    alt Kredensial Valid
        Auth-->>FE: Session & User data
        FE->>DB: Query role dari tabel profiles WHERE id = user.id
        DB-->>FE: Role (siswa / guru)
        alt Role = siswa
            FE-->>User: Redirect ke /siswa/compiler
        else Role = guru
            FE-->>User: Redirect ke /guru/dashboard
        end
    else Kredensial Tidak Valid
        Auth-->>FE: Error: Invalid login credentials
        FE-->>User: Tampilkan pesan Email atau password salah
    end
```

---

### 2.2 Sequence Diagram — Registrasi Akun

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant FE as Next.js Frontend
    participant API as API Route /api/auth/register
    participant Auth as Supabase Auth
    participant DB as Supabase DB

    User->>FE: Buka halaman /register
    FE-->>User: Tampilkan form registrasi
    User->>FE: Isi nama, email, password, confirmPassword, role
    Note over FE: Jika siswa: isi NIS dan Kelas<br>Jika guru: isi Kode Token Sekolah
    User->>FE: Klik Daftar
    FE->>FE: Validasi password (min 6 char + angka)
    alt Validasi Gagal
        FE-->>User: Tampilkan pesan error
    else Validasi OK
        FE->>API: POST /api/auth/register {email, password, name, role, nis, kelas, kodeToken}
        API->>API: Validasi field wajib dan role
        alt Role = guru
            API->>API: Validasi kode token sekolah
            alt Token Tidak Valid
                API-->>FE: Error 400: Kode Token tidak valid
                FE-->>User: Tampilkan error
            end
        end
        API->>Auth: admin.createUser(email, password, email_confirm: true)
        alt Email Sudah Ada
            Auth-->>API: Error: User already exists
            API-->>FE: Error 400: Email sudah terdaftar
            FE-->>User: Tampilkan pesan email sudah ada
        else Email Baru
            Auth-->>API: User created (uid)
            API->>DB: UPSERT INTO profiles (id, email, name, role, nis, kelas)
            DB-->>API: OK
            API-->>FE: Success 200
            FE-->>User: Tampilkan pesan Registrasi Berhasil
        end
    end
```

---

### 2.3 Sequence Diagram — Eksekusi Kode Python

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant FE as Next.js Frontend
    participant API as API Route /api/compiler/execute
    participant PY as Python API (Railway)

    User->>FE: Tulis kode Python di code editor
    User->>FE: Klik tombol Run
    FE->>API: POST /api/compiler/execute {code}
    API->>PY: POST /validate {code, api_key}
    PY->>PY: Validasi sintaks dengan py_compile
    alt Sintaks Error
        PY-->>API: {valid: false, error: "SyntaxError..."}
        API-->>FE: {success: false, error, type: syntax_error}
        FE-->>User: Tampilkan syntax error di panel output
    else Sintaks Valid
        PY-->>API: {valid: true}
        API->>PY: POST /execute {code, api_key}
        PY->>PY: Eksekusi subprocess (timeout 10s)
        alt Eksekusi Berhasil
            PY-->>API: {success: true, output: "stdout..."}
            API-->>FE: {success: true, output}
            FE-->>User: Tampilkan output di panel terminal
        else Timeout / Runtime Error
            PY-->>API: {success: false, error: "TimeoutError..."}
            API-->>FE: {success: false, error}
            FE-->>User: Tampilkan error di panel terminal
        end
    end
```

---

### 2.4 Sequence Diagram — Analisis Clean Code

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant FE as Next.js Frontend
    participant API as API Route /api/compiler/analyze
    participant PY as Python API (Railway)
    participant DB as Supabase DB

    User->>FE: Tulis kode Python di code editor
    User->>FE: Klik tombol Analyze
    FE->>API: POST /api/compiler/analyze {code}
    API->>API: Cek autentikasi user dan query role
    API->>PY: POST /analyze {code, api_key}
    PY->>PY: Simpan kode ke file .py sementara
    PY->>PY: Jalankan pylint --output-format=json
    PY->>PY: Parse dan kategorikan pesan pylint
    PY-->>API: {messages[], counts{error, warning, refactor, convention}}
    API->>API: Hitung skor = max(0, 10 - ((5E+W+R+C)/S)*10)
    API->>API: Konversi ke persentase (skor * 10)
    API->>API: Tentukan grade (A/B/C/D/F)
    alt User login dan role = siswa
        API->>DB: INSERT INTO code_submissions (student_id, code, score, grade, analysis_result)
        DB-->>API: OK
        API->>DB: UPSERT leaderboard (total_points, total_submissions, average_score, highest_score)
        DB-->>API: OK
    end
    API-->>FE: {success, analysis{final_score, grade, breakdown, suggestions}}
    FE-->>User: Tampilkan skor, grade, breakdown, dan saran perbaikan
```

---

### 2.5 Sequence Diagram — Guru Melihat Data Siswa

```mermaid
sequenceDiagram
    actor Guru as Guru
    participant FE as Next.js Frontend
    participant API as API Route /api/guru/students
    participant DB as Supabase DB

    Guru->>FE: Buka halaman /guru/dashboard
    FE->>FE: Cek session dan role dari profiles
    alt Role bukan Guru
        FE-->>Guru: Redirect ke /login
    else Role = Guru
        FE->>API: GET /api/guru/students
        API->>API: Verifikasi role = guru
        API->>DB: SELECT * FROM profiles WHERE role = siswa ORDER BY kelas, name
        DB-->>API: Daftar siswa (id, name, email, nis, kelas)
        API->>DB: SELECT * FROM leaderboard
        DB-->>API: Data leaderboard per siswa
        API->>DB: SELECT * FROM code_submissions (statistik harian)
        DB-->>API: Submission hari ini per siswa
        API->>API: Gabungkan data siswa + leaderboard + statistik harian
        API->>API: Hitung statistik kelas (total siswa, rata-rata, tertinggi)
        API-->>FE: {students[], stats{total_students, total_submissions, class_average, highest_score}}
        FE-->>Guru: Tampilkan dashboard statistik dan tabel siswa
        Guru->>FE: Filter atau cari siswa
        FE->>FE: Filter data lokal
        FE-->>Guru: Tampilkan hasil filter
    end
```

---

### 2.6 Sequence Diagram — Guru Menghapus Akun Siswa

```mermaid
sequenceDiagram
    actor Guru as Guru
    participant FE as Next.js Frontend
    participant API as API Route /api/guru/delete-student
    participant DB as Supabase DB
    participant Auth as Supabase Auth
    participant Storage as Supabase Storage

    Guru->>FE: Klik tombol Hapus pada siswa di tabel
    FE-->>Guru: Tampilkan dialog konfirmasi hapus akun siswa
    Guru->>FE: Klik Konfirmasi Hapus
    FE->>API: DELETE /api/guru/delete-student {studentId}
    API->>API: Verifikasi autentikasi user
    API->>DB: Query role dari profiles WHERE id = user.id
    DB-->>API: Role pengguna
    alt Role bukan Guru
        API-->>FE: Error 403: Forbidden
        FE-->>Guru: Tampilkan pesan akses ditolak
    else Role = Guru
        API->>DB: Query profiles WHERE id = studentId
        DB-->>API: Data profil siswa
        alt Siswa Tidak Ditemukan
            API-->>FE: Error 404: Siswa tidak ditemukan
            FE-->>Guru: Tampilkan pesan error
        else Siswa Ditemukan
            API->>DB: DELETE FROM leaderboard WHERE student_id
            DB-->>API: OK
            API->>DB: DELETE FROM code_submissions WHERE student_id
            DB-->>API: OK
            API->>DB: DELETE FROM profiles WHERE id = studentId
            DB-->>API: OK
            API->>Storage: Hapus avatar siswa
            Storage-->>API: OK
            API->>Auth: admin.deleteUser(studentId)
            Auth-->>API: OK
            API-->>FE: {success: true, message: "Akun siswa berhasil dihapus"}
            FE->>FE: Refresh data siswa
            FE-->>Guru: Tampilkan daftar siswa terbaru
        end
    end
```

---

---

## 3. Diagram Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Client["Client (Browser)"]
        A[Next.js Frontend<br>Vercel]
    end

    subgraph Vercel["Vercel Serverless"]
        B[API Routes<br>/api/compiler/*<br>/api/auth/*<br>/api/guru/*<br>/api/materials<br>/api/leaderboard]
    end

    subgraph Railway["Railway"]
        C[Python API<br>FastAPI + Uvicorn<br>+ Pylint]
    end

    subgraph Supabase["Supabase"]
        D[Auth Service]
        E[PostgreSQL<br>profiles, code_submissions<br>leaderboard, materials]
        F[Storage<br>avatars, materials]
    end

    A -->|HTTP Request| B
    B -->|POST /execute<br>POST /validate<br>POST /analyze| C
    B -->|Auth API| D
    B -->|Query/Insert| E
    B -->|Upload/Download| F
    C -->|subprocess| G[Python Interpreter<br>+ Pylint Engine]

    style Client fill:#e3f2fd,stroke:#1565c0
    style Vercel fill:#f3e5f5,stroke:#7b1fa2
    style Railway fill:#e8f5e9,stroke:#2e7d32
    style Supabase fill:#fff3e0,stroke:#e65100
```
