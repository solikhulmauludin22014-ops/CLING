import type { CleanCodeAnalysisResult, IndicatorResult } from '@/lib/types/database'

// URL Python API yang di-deploy di Render.com
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'
const PYTHON_API_SECRET = process.env.PYTHON_API_SECRET || ''
const ANALYZE_TIMEOUT = 35000 // 35 detik

// Interface untuk pesan Pylint yang sudah dikategorikan
interface PylintMessage {
  code: string
  line: number
  column: number
  message: string
  category: 'error' | 'warning' | 'refactor' | 'convention' | 'fatal'
  symbol: string
  explanation?: string
  fix_suggestion?: string
}

// Interface untuk hasil analisis yang lebih lengkap
interface DetailedAnalysis {
  errors: PylintMessage[]
  warnings: PylintMessage[]
  refactors: PylintMessage[]
  conventions: PylintMessage[]
  score: number
  grade: string
  grade_category: string
  corrected_code: string
  motivation: string
  formatted_report: string
}

export class CleanCodeAnalyzer {
  private readonly MAX_SCORE = 100

  // Penjelasan kode Pylint dalam Bahasa Indonesia untuk siswa SMK
  private readonly CODE_EXPLANATIONS: Record<string, string> = {
    // Convention (C) - PEP 8
    'C0103': 'Nama variabel/fungsi tidak sesuai standar Python (gunakan snake_case untuk variabel, UPPER_CASE untuk konstanta)',
    'C0111': 'Tidak ada docstring (komentar penjelasan) di fungsi/kelas',
    'C0112': 'Docstring kosong, tidak menjelaskan apa-apa',
    'C0114': 'Module tidak punya docstring di awal file',
    'C0115': 'Class tidak punya docstring penjelasan',
    'C0116': 'Fungsi tidak punya docstring penjelasan',
    'C0301': 'Baris terlalu panjang (maksimal 79 karakter per baris)',
    'C0302': 'File terlalu banyak baris kode (pecah jadi beberapa file)',
    'C0303': 'Ada spasi kosong di akhir baris (hapus trailing whitespace)',
    'C0304': 'File tidak diakhiri dengan baris kosong',
    'C0305': 'Terlalu banyak baris kosong di akhir file',
    'C0321': 'Lebih dari satu statement dalam satu baris (pisahkan)',
    'C0325': 'Tanda kurung tidak perlu di sekitar kondisi if',
    'C0410': 'Import beberapa module dalam satu baris (pisahkan)',
    'C0411': 'Urutan import tidak sesuai standar (stdlib, third-party, local)',
    'C0412': 'Import dari module yang sama tidak digabung',
    'C0413': 'Import harus di bagian atas file',
    'C0414': 'Import dengan alias yang tidak perlu',
    
    // Warning (W)
    'W0101': 'Kode setelah return tidak akan pernah dijalankan (unreachable)',
    'W0102': 'Jangan gunakan list/dict sebagai default parameter (berbahaya!)',
    'W0104': 'Statement tidak ada efeknya (mungkin lupa assignment)',
    'W0105': 'String tanpa assignment (mungkin maksudnya docstring)',
    'W0106': 'Hasil expression tidak digunakan',
    'W0107': 'Statement pass tidak diperlukan',
    'W0108': 'Lambda bisa diganti dengan fungsi langsung',
    'W0109': 'Ada key duplikat di dictionary',
    'W0120': 'else setelah loop tanpa break tidak berguna',
    'W0122': 'Penggunaan exec() berbahaya untuk keamanan',
    'W0123': 'Penggunaan eval() berbahaya untuk keamanan',
    'W0125': 'Kondisi if selalu True/False (tidak perlu if)',
    'W0143': 'Membandingkan callable tanpa memanggilnya',
    'W0150': 'return di finally block akan override exception',
    'W0199': 'assert dengan tuple selalu True',
    'W0201': 'Atribut didefinisikan di luar __init__',
    'W0211': 'Static method bisa jadi function biasa',
    'W0212': 'Mengakses atribut protected dari luar class',
    'W0221': 'Signature method berbeda dengan parent class',
    'W0222': 'Signature method berbeda dengan interface',
    'W0223': 'Abstract method tidak diimplementasikan',
    'W0231': 'Tidak memanggil __init__ parent class',
    'W0232': 'Class tidak punya __init__ method',
    'W0233': 'Memanggil __init__ dari class yang bukan parent',
    'W0311': 'Indentasi tidak konsisten (gunakan 4 spasi)',
    'W0312': 'Campur tab dan spasi untuk indentasi',
    'W0401': 'Wildcard import (from x import *) tidak disarankan',
    'W0404': 'Import ulang module yang sama',
    'W0406': 'Module import dirinya sendiri',
    'W0511': 'Ada TODO/FIXME yang belum selesai',
    'W0601': 'Global variable tanpa assignment',
    'W0602': 'Menggunakan global untuk variable yang tidak ada',
    'W0603': 'Menggunakan keyword global (hindari jika bisa)',
    'W0604': 'Menggunakan keyword global di module level',
    'W0611': 'Import tidak digunakan (hapus import ini)',
    'W0612': 'Variabel dibuat tapi tidak digunakan',
    'W0613': 'Parameter fungsi tidak digunakan',
    'W0614': 'Nama dari wildcard import tidak digunakan',
    'W0621': 'Variabel lokal menutupi variabel global',
    'W0622': 'Nama variabel sama dengan built-in Python',
    'W0631': 'Variabel loop mungkin belum terdefinisi',
    'W0632': 'Unpacking dengan jumlah variabel salah',
    'W0640': 'Variabel di closure mungkin berubah',
    'W0641': 'Variabel mungkin tidak digunakan',
    'W0642': 'Reassign self/cls di method',
    'W0702': 'except tanpa tipe exception (terlalu umum)',
    'W0703': 'except Exception terlalu umum',
    'W0705': 'except dengan tipe duplikat',
    'W0706': 'except langsung raise (tidak perlu except)',
    'W0711': 'except dengan tipe bukan exception',
    'W0715': 'except dengan format string usang',
    'W1401': 'Escape sequence anomali di string',
    'W1501': 'Mode file tidak valid',
    'W1502': 'Mode file biner/teks dicampur',
    'W1503': 'Argumen redundan untuk open()',
    'W1505': 'Menggunakan method deprecated',
    'W1514': 'open() tanpa encoding eksplisit',

    // Error (E)
    'E0001': 'Syntax error di Python (kode tidak valid)',
    'E0011': 'Opsi pylint tidak dikenali',
    'E0012': 'Argumen opsi pylint salah',
    'E0100': 'Fungsi __init__ tidak boleh return value',
    'E0101': 'return/yield di __init__',
    'E0102': 'Nama fungsi/class sudah dipakai',
    'E0103': 'break/continue di luar loop',
    'E0104': 'return di luar fungsi',
    'E0105': 'yield di luar fungsi',
    'E0106': 'return dengan argumen di generator',
    'E0107': 'Operator tidak didukung',
    'E0108': 'Parameter duplikat di fungsi',
    'E0110': 'Abstract class tidak bisa di-instantiate',
    'E0111': 'Reversed() dipanggil pada sequence yang salah',
    'E0112': 'Lebih dari satu starred expression di assignment',
    'E0113': 'Starred expression di context yang salah',
    'E0114': 'Starred assignment harus dalam tuple/list',
    'E0115': 'Nama variabel sudah declared nonlocal',
    'E0116': 'continue tidak diizinkan di finally block',
    'E0117': 'Nonlocal variable tidak ada di enclosing scope',
    'E0118': 'Nama variabel digunakan sebelum dideklarasi nonlocal',
    'E0119': 'Format error di f-string',
    'E0202': 'Method/attribute sama dengan property',
    'E0203': 'Atribut diakses sebelum didefinisikan',
    'E0211': 'Method pertama tidak punya self/cls',
    'E0213': 'Parameter pertama method harus self',
    'E0236': 'Object tidak iterable',
    'E0237': 'Assignment ke slot tidak terdefinisi',
    'E0238': 'Slot tidak valid',
    'E0239': 'Inherit dari class non-class',
    'E0240': 'MRO tidak konsisten',
    'E0241': 'Inherit dari class yang sama lebih dari sekali',
    'E0242': 'Nilai __slots__ tidak valid',
    'E0243': '__slots__ redefinition',
    'E0244': 'Inherit dari bukan class',
    'E0301': '__iter__ harus return iterator',
    'E0302': 'Jumlah argumen __init__/__new__ salah',
    'E0303': '__len__ harus return non-negative integer',
    'E0401': 'Import error (module tidak ditemukan)',
    'E0402': 'Relative import dari package tanpa __init__',
    'E0601': 'Variabel digunakan sebelum assignment',
    'E0602': 'Nama variabel tidak terdefinisi',
    'E0603': 'Export nama yang tidak terdefinisi',
    'E0604': '__all__ berisi bukan string',
    'E0611': 'Nama tidak ada di module',
    'E0632': 'Unpacking dengan jumlah value salah',
    'E0633': 'Mencoba unpack objek non-sequence',
    'E0701': 'except tidak valid di Python 3',
    'E0702': 'Raise bukan exception',
    'E0703': 'Exception cause bukan exception atau None',
    'E0704': 'Bare raise di luar except',
    'E0710': 'Raise bukan BaseException',
    'E0711': 'Raise NotImplemented, seharusnya NotImplementedError',
    'E0712': 'Catching exception yang tidak inherit BaseException',
    'E1003': 'Argumen super() salah',
    'E1101': 'Atribut tidak ada di class/object',
    'E1102': 'Memanggil objek yang tidak callable',
    'E1111': 'Assign ke hasil function call yang tidak return apa-apa',
    'E1120': 'Argumen function kurang',
    'E1121': 'Terlalu banyak argumen function',
    'E1123': 'Keyword argument tidak dikenal',
    'E1124': 'Argumen diberikan ke parameter yang sudah ada',
    'E1125': 'Argumen hilang tapi ada di keyword',
    'E1126': 'Index sequence bukan integer',
    'E1127': 'Index slice bukan integer atau None',
    'E1128': 'Assignment bersyarat selalu None',
    'E1129': 'Context manager tidak mendukung with',
    'E1130': 'Operasi minus pada non-numeric',
    'E1131': 'Operasi unary pada tipe yang tidak support',
    'E1132': 'Duplicate keyword argument',
    'E1133': 'Iterasi pada objek non-iterable',
    'E1134': 'Unpacking pada objek non-iterable',
    'E1135': 'Operasi membership pada objek yang tidak support',
    'E1136': 'Subscript pada objek non-subscriptable',
    'E1137': 'Assignment subscript pada objek yang tidak support',
    'E1138': 'Delete subscript pada objek yang tidak support',
    'E1139': 'Metaclass tidak valid',
    'E1140': 'Dict key bukan hashable',
    'E1141': 'Dict unpacking pada non-dict',
    'E1142': 'await di luar async function',
    'E1143': 'Object tidak memiliki __await__ method',
    'E1144': 'Object tidak async iterable',

    // Refactor (R)
    'R0123': 'Gunakan == bukan is untuk literal',
    'R0124': 'Membandingkan diri sendiri (selalu True/False)',
    'R0133': 'Membandingkan konstanta (selalu True/False)',
    'R0201': 'Method tidak gunakan self, bisa jadi function',
    'R0202': 'Classmethod tidak gunakan cls',
    'R0203': 'Staticmethod tidak perlu self/cls',
    'R0205': 'Class bisa inherit dari object implisit',
    'R0206': 'Property tidak return apa-apa',
    'R0801': 'Kode duplikat ditemukan (copy-paste terdeteksi)',
    'R0901': 'Terlalu banyak parent class (maksimal 7)',
    'R0902': 'Terlalu banyak atribut instance (maksimal 7)',
    'R0903': 'Terlalu sedikit public method',
    'R0904': 'Terlalu banyak public method (maksimal 20)',
    'R0911': 'Terlalu banyak return statement (maksimal 6)',
    'R0912': 'Terlalu banyak branch/if (maksimal 12)',
    'R0913': 'Terlalu banyak parameter function (maksimal 5)',
    'R0914': 'Terlalu banyak local variable (maksimal 15)',
    'R0915': 'Terlalu banyak statement dalam function (maksimal 50)',
    'R0916': 'Kondisi boolean terlalu kompleks',
    'R1260': 'Fungsi terlalu kompleks (cyclomatic complexity tinggi)',
    'R1701': 'isinstance dengan tuple bisa disederhanakan',
    'R1702': 'Terlalu banyak nested block',
    'R1703': 'if-else bisa disederhanakan',
    'R1704': 'Variabel di-reassign dengan operasi yang bisa pakai +=',
    'R1705': 'else setelah return tidak perlu',
    'R1706': 'Gunakan ternary expression',
    'R1707': 'Trailing comma di tuple satu elemen hilang',
    'R1708': 'Jangan raise StopIteration di generator',
    'R1709': 'Simplify boolean expression',
    'R1710': 'Semua path harus return atau tidak sama sekali',
    'R1711': 'return None tidak perlu di akhir function',
    'R1712': 'Gunakan tuple swap a, b = b, a',
    'R1713': 'Gunakan join() untuk concatenate string',
    'R1714': 'Bisa pakai in untuk multiple comparison',
    'R1715': 'Bisa pakai dict.get()',
    'R1716': 'Bisa pakai chained comparison',
    'R1717': 'Bisa pakai dict comprehension',
    'R1718': 'Bisa pakai set comprehension',
    'R1719': 'Ternary bisa disederhanakan jadi boolean',
    'R1720': 'else setelah raise tidak perlu',
    'R1721': 'Comprehension tidak perlu untuk list/set/dict()',
    'R1722': 'Gunakan sys.exit()',
    'R1723': 'else setelah break tidak perlu',
    'R1724': 'else setelah continue tidak perlu',
    'R1725': 'Gunakan super() tanpa argumen di Python 3',
    'R1726': 'Gunakan isinstance() bukan type()',
    'R1727': 'Kondisi sama di if dan else',
    'R1728': 'Gunakan generator expression',
    'R1729': 'Gunakan comprehension',
    'R1730': 'Gunakan min/max built-in',
    'R1731': 'Gunakan min/max dengan default',
    'R1732': 'Gunakan with statement untuk resource',
  }

  // Fix suggestions untuk kode Pylint
  private readonly FIX_SUGGESTIONS: Record<string, string> = {
    'C0103': 'Ubah nama: my_variable, calculate_total(), MY_CONSTANT',
    'C0114': "Tambahkan docstring di awal file: '''Deskripsi module.'''",
    'C0115': "Tambahkan docstring setelah class: '''Deskripsi class.'''",
    'C0116': "Tambahkan docstring setelah def: '''Deskripsi fungsi.'''",
    'C0301': 'Pecah baris panjang dengan backslash (\\) atau kurung',
    'C0303': 'Hapus spasi di akhir baris (trim trailing whitespace)',
    'C0304': 'Tambahkan baris kosong di akhir file',
    'C0411': 'Urutkan: import stdlib, import third-party, import local',
    'W0311': 'Gunakan 4 spasi untuk setiap level indentasi',
    'W0312': 'Ganti semua tab dengan 4 spasi',
    'W0401': "Ubah 'from x import *' menjadi 'from x import nama1, nama2'",
    'W0611': 'Hapus baris import yang tidak digunakan',
    'W0612': 'Gunakan variabel ini atau hapus jika tidak perlu',
    'W0613': 'Gunakan parameter ini atau ubah nama jadi _unused',
    'W0622': 'Ganti nama variabel, hindari: list, dict, str, id, type',
    'E0001': 'Periksa syntax: kurung, titik dua, indentasi',
    'E0102': 'Ganti nama fungsi/class yang duplikat',
    'E0401': 'Install module: pip install nama_module',
    'E0601': 'Definisikan variabel sebelum menggunakannya',
    'E0602': 'Cek typo atau definisikan variabel terlebih dahulu',
    'R0913': 'Kurangi parameter, bisa pakai dict atau class',
    'R0912': 'Pecah fungsi besar jadi beberapa fungsi kecil',
    'R0915': 'Pecah fungsi ini jadi beberapa fungsi yang lebih fokus',
  }

  constructor() {
    // Menggunakan Python API yang di-deploy di Render.com
  }

  /**
   * Analyze Python code dengan format khusus untuk siswa SMK
   * Menggunakan Pylint + standar PEP 8
   */
  async analyze(code: string): Promise<CleanCodeAnalysisResult> {
    try {
      // Run analisis via Pylint lokal
      const pylint = await this.runAnalysis(code)
      
      // Kategorikan pesan berdasarkan jenis
      const detailedAnalysis = this.createDetailedAnalysis(pylint, code)

      // Build breakdown untuk compatibility dengan interface yang ada
      const meaningfulNames: IndicatorResult = {
        score: Math.max(0, this.MAX_SCORE - pylint.invalidNameCount * 20),
        details: `Penamaan tidak standar: ${pylint.invalidNameCount} masalah`,
        issues: pylint.messages
          .filter(m => m.code === 'C0103')
          .map(m => this.formatMessageForStudent(m)),
      }

      const codeDuplication: IndicatorResult = {
        score: Math.max(0, this.MAX_SCORE - pylint.duplicateCodeCount * 25),
        details: `Kode duplikat: ${pylint.duplicateCodeCount} ditemukan`,
        issues: pylint.messages
          .filter(m => m.code === 'R0801')
          .map(m => this.formatMessageForStudent(m)),
      }

      const codeQuality: IndicatorResult = {
        score: detailedAnalysis.score * 10,
        details: detailedAnalysis.formatted_report,
        issues: this.generateFormattedIssues(detailedAnalysis),
        pylint_rating: detailedAnalysis.score,
        pylint_messages: pylint.messages.map(m => this.formatMessageForStudent(m)),
      }

      const breakdown = {
        meaningful_names: meaningfulNames,
        code_duplication: codeDuplication,
        code_quality: codeQuality,
      }

      // Generate suggestions dengan format baru
      const suggestions = this.generateEnhancedSuggestions(detailedAnalysis, code)

      return {
        final_score: detailedAnalysis.score,
        grade: detailedAnalysis.grade,
        breakdown,
        suggestions,
      // Properti tambahan untuk frontend
        detailed_analysis: detailedAnalysis,
      } as CleanCodeAnalysisResult

    } catch (error: any) {
      return {
        final_score: 0,
        grade: '0.00/10',
        breakdown: {
          meaningful_names: { score: 0, details: '', issues: [] },
          code_duplication: { score: 0, details: '', issues: [] },
          code_quality: { score: 0, details: '', issues: [] },
        },
        suggestions: [`❌ Error saat analisis: ${error.message}`],
      }
    }
  }

  /**
   * Buat analisis detail dengan kategori ERROR, WARNING, REFACTOR, CONVENTION
   */
  private createDetailedAnalysis(
    pylint: Awaited<ReturnType<typeof this.runAnalysis>>,
    code: string
  ): DetailedAnalysis {
    const errors: PylintMessage[] = []
    const warnings: PylintMessage[] = []
    const refactors: PylintMessage[] = []
    const conventions: PylintMessage[] = []

    // Kategorikan pesan
    for (const msg of pylint.messages) {
      const enhancedMsg: PylintMessage = {
        code: msg.code,
        line: msg.line,
        column: 0,
        message: msg.message,
        category: msg.category as PylintMessage['category'],
        symbol: msg.code,
        explanation: this.CODE_EXPLANATIONS[msg.code] || msg.message,
        fix_suggestion: this.FIX_SUGGESTIONS[msg.code] || 'Perbaiki sesuai pesan error',
      }

      switch (msg.category) {
        case 'error':
        case 'fatal':
          errors.push(enhancedMsg)
          break
        case 'warning':
          warnings.push(enhancedMsg)
          break
        case 'refactor':
          refactors.push(enhancedMsg)
          break
        case 'convention':
          conventions.push(enhancedMsg)
          break
      }
    }

    // Tambahkan pengecekan PEP 8 tambahan
    this.addPEP8Checks(code, conventions, warnings)

    // Hitung skor menggunakan rumus yang diminta:
    // max(0, 0 if fatal else 10.0 - ((float(5 * error + warning + refactor + convention) / statement) * 10))
    const statements = Math.max(1, pylint.statements)
    const score10 = pylint.fatal 
      ? 0 
      : Math.max(0, 10.0 - ((5 * pylint.error + pylint.warning + pylint.refactor + pylint.convention) / statements) * 10)
    const scoreRounded = Math.round(score10 * 100) / 100

    // Tentukan grade category
    const gradeCategory = this.getGradeCategory(scoreRounded)

    // Generate kode perbaikan
    const correctedCode = this.generateCorrectedCode(code, [...errors, ...warnings, ...refactors, ...conventions])

    // Generate motivasi
    const motivation = this.generateMotivation(scoreRounded, gradeCategory)

    // Format report lengkap
    const formattedReport = this.formatFullReport(
      errors, warnings, refactors, conventions,
      scoreRounded, gradeCategory, correctedCode, motivation
    )

    return {
      errors,
      warnings,
      refactors,
      conventions,
      score: scoreRounded,
      grade: `${scoreRounded.toFixed(2)}/10`,
      grade_category: gradeCategory,
      corrected_code: correctedCode,
      motivation,
      formatted_report: formattedReport,
    }
  }

  /**
   * Tambahan pengecekan PEP 8 yang mungkin tidak tertangkap Pylint
   */
  private addPEP8Checks(code: string, conventions: PylintMessage[], warnings: PylintMessage[]): void {
    const lines = code.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1

      // Cek line length > 79
      if (line.length > 79) {
        conventions.push({
          code: 'C0301',
          line: lineNum,
          column: 80,
          message: `Baris terlalu panjang (${line.length}/79 karakter)`,
          category: 'convention',
          symbol: 'line-too-long',
          explanation: this.CODE_EXPLANATIONS['C0301'],
          fix_suggestion: this.FIX_SUGGESTIONS['C0301'],
        })
      }

      // Cek trailing whitespace
      if (/\s+$/.test(line)) {
        conventions.push({
          code: 'C0303',
          line: lineNum,
          column: line.length,
          message: 'Trailing whitespace terdeteksi',
          category: 'convention',
          symbol: 'trailing-whitespace',
          explanation: this.CODE_EXPLANATIONS['C0303'],
          fix_suggestion: this.FIX_SUGGESTIONS['C0303'],
        })
      }

      // Cek indentasi tidak kelipatan 4
      const indentMatch = line.match(/^(\s+)/)
      if (indentMatch && indentMatch[1].includes(' ')) {
        const spaces = indentMatch[1].replace(/\t/g, '    ').length
        if (spaces % 4 !== 0) {
          conventions.push({
            code: 'W0311',
            line: lineNum,
            column: 0,
            message: `Indentasi ${spaces} spasi (seharusnya kelipatan 4)`,
            category: 'warning',
            symbol: 'bad-indentation',
            explanation: this.CODE_EXPLANATIONS['W0311'],
            fix_suggestion: this.FIX_SUGGESTIONS['W0311'],
          })
        }
      }

      // Cek tab dan spasi tercampur
      if (/^\t+ +/.test(line) || /^ +\t+/.test(line)) {
        warnings.push({
          code: 'W0312',
          line: lineNum,
          column: 0,
          message: 'Campuran tab dan spasi untuk indentasi',
          category: 'warning',
          symbol: 'mixed-indentation',
          explanation: this.CODE_EXPLANATIONS['W0312'],
          fix_suggestion: this.FIX_SUGGESTIONS['W0312'],
        })
      }
    })

    // Cek tidak ada newline di akhir file
    if (!code.endsWith('\n')) {
      conventions.push({
        code: 'C0304',
        line: lines.length,
        column: 0,
        message: 'File tidak diakhiri dengan baris kosong',
        category: 'convention',
        symbol: 'missing-final-newline',
        explanation: this.CODE_EXPLANATIONS['C0304'],
        fix_suggestion: this.FIX_SUGGESTIONS['C0304'],
      })
    }
  }

  /**
   * Tentukan kategori grade
   */
  private getGradeCategory(score: number): string {
    if (score >= 9) return 'Excellent ⭐⭐⭐'
    if (score >= 8) return 'Very Good ⭐⭐'
    if (score >= 7) return 'Good ⭐'
    if (score >= 5.5) return 'Fair 👍'
    if (score >= 4) return 'Poor ⚠️'
    return 'Very Poor ❌'
  }

  /**
   * Generate motivasi untuk siswa
   */
  private generateMotivation(score: number, category: string): string {
    if (score >= 9) {
      return '🎉 Luar biasa! Kode kamu sudah sangat bersih dan profesional. Pertahankan standar ini!'
    }
    if (score >= 8) {
      return '👏 Bagus sekali! Kode kamu sudah rapi. Sedikit perbaikan lagi untuk sempurna!'
    }
    if (score >= 7) {
      return '👍 Kerja bagus! Kode kamu cukup baik. Perhatikan naming convention dan struktur kode.'
    }
    if (score >= 5.5) {
      return '💪 Terus semangat! Perbaiki penamaan variabel dan ikuti standar PEP 8 untuk hasil lebih baik.'
    }
    if (score >= 4) {
      return '📚 Jangan menyerah! Pelajari PEP 8 dan praktikkan naming convention yang benar.'
    }
    return '🚀 Mulai dari dasar! Fokus pada indentasi 4 spasi dan penamaan yang jelas. Kamu pasti bisa!'
  }

  /**
   * Format pesan untuk siswa SMK
   */
  private formatMessageForStudent(msg: { code: string; line: number; message: string; category: string }): string {
    const emoji = this.getCategoryEmoji(msg.category)
    const explanation = this.CODE_EXPLANATIONS[msg.code] || msg.message
    const fix = this.FIX_SUGGESTIONS[msg.code] || ''
    
    let result = `${emoji} Baris ${msg.line} | ${msg.code}: ${explanation}`
    if (fix) {
      result += ` → ${fix}`
    }
    return result
  }

  /**
   * Dapatkan emoji berdasarkan kategori
   */
  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'error':
      case 'fatal':
        return '🔴'
      case 'warning':
        return '🟡'
      case 'refactor':
        return '🟠'
      case 'convention':
        return '🟢'
      default:
        return '⚪'
    }
  }

  /**
   * Generate formatted issues untuk output
   */
  private generateFormattedIssues(analysis: DetailedAnalysis): string[] {
    const issues: string[] = []

    if (analysis.errors.length > 0) {
      issues.push('═══ 🔴 ERROR (Bug Potensial) ═══')
      analysis.errors.forEach(e => {
        issues.push(`  Baris ${e.line}: ${e.explanation}`)
        if (e.fix_suggestion) issues.push(`    💡 Perbaikan: ${e.fix_suggestion}`)
      })
    }

    if (analysis.warnings.length > 0) {
      issues.push('═══ 🟡 WARNING (Potensi Bug) ═══')
      analysis.warnings.forEach(w => {
        issues.push(`  Baris ${w.line}: ${w.explanation}`)
        if (w.fix_suggestion) issues.push(`    💡 Perbaikan: ${w.fix_suggestion}`)
      })
    }

    if (analysis.refactors.length > 0) {
      issues.push('═══ 🟠 REFACTOR (Perlu Perbaikan Struktur) ═══')
      analysis.refactors.forEach(r => {
        issues.push(`  Baris ${r.line}: ${r.explanation}`)
        if (r.fix_suggestion) issues.push(`    💡 Perbaikan: ${r.fix_suggestion}`)
      })
    }

    if (analysis.conventions.length > 0) {
      issues.push('═══ 🟢 CONVENTION (Pelanggaran PEP 8) ═══')
      analysis.conventions.forEach(c => {
        issues.push(`  Baris ${c.line}: ${c.explanation}`)
        if (c.fix_suggestion) issues.push(`    💡 Perbaikan: ${c.fix_suggestion}`)
      })
    }

    return issues
  }

  /**
   * Generate kode yang sudah diperbaiki
   */
  private generateCorrectedCode(originalCode: string, issues: PylintMessage[]): string {
    let correctedLines = originalCode.split('\n')

    // Perbaikan otomatis yang aman
    correctedLines = correctedLines.map((line, idx) => {
      let corrected = line

      // Hapus trailing whitespace
      corrected = corrected.replace(/\s+$/, '')

      // Perbaiki indentasi (ganti tab dengan 4 spasi)
      corrected = corrected.replace(/^\t+/, match => '    '.repeat(match.length))

      return corrected
    })

    // Tambahkan newline di akhir jika belum ada
    const result = correctedLines.join('\n')
    if (!result.endsWith('\n')) {
      return result + '\n'
    }

    return result
  }

  /**
   * Format laporan lengkap
   */
  private formatFullReport(
    errors: PylintMessage[],
    warnings: PylintMessage[],
    refactors: PylintMessage[],
    conventions: PylintMessage[],
    score: number,
    gradeCategory: string,
    correctedCode: string,
    motivation: string
  ): string {
    const totalIssues = errors.length + warnings.length + refactors.length + conventions.length

    let report = `
╔══════════════════════════════════════════════════════════════╗
║           📊 LAPORAN ANALISIS CLEAN CODE PYTHON              ║
║                    C3-Py Compiler Online                      ║
╚══════════════════════════════════════════════════════════════╝

📈 SKOR: ${score.toFixed(2)}/10 (${gradeCategory})
📋 Total Temuan: ${totalIssues} masalah

┌──────────────────────────────────────────────────────────────┐
│ RINGKASAN TEMUAN                                             │
├──────────────────────────────────────────────────────────────┤
│ 🔴 Error (bug potensial)        : ${errors.length.toString().padStart(3)} masalah              │
│ 🟡 Warning (potensi bug)        : ${warnings.length.toString().padStart(3)} masalah              │
│ 🟠 Refactor (perlu struktur)    : ${refactors.length.toString().padStart(3)} masalah              │
│ 🟢 Convention (PEP 8)           : ${conventions.length.toString().padStart(3)} masalah              │
└──────────────────────────────────────────────────────────────┘
`

    if (errors.length > 0) {
      report += '\n🔴 ERROR - Bug yang berpotensi gagal:\n'
      errors.slice(0, 5).forEach(e => {
        report += `   Baris ${e.line}: ${e.explanation}\n`
        if (e.fix_suggestion) report += `   └─ 💡 ${e.fix_suggestion}\n`
      })
    }

    if (warnings.length > 0) {
      report += '\n🟡 WARNING - Potensi bug & unused variable:\n'
      warnings.slice(0, 5).forEach(w => {
        report += `   Baris ${w.line}: ${w.explanation}\n`
        if (w.fix_suggestion) report += `   └─ 💡 ${w.fix_suggestion}\n`
      })
    }

    if (refactors.length > 0) {
      report += '\n🟠 REFACTOR - Kompleksitas tinggi:\n'
      refactors.slice(0, 5).forEach(r => {
        report += `   Baris ${r.line}: ${r.explanation}\n`
        if (r.fix_suggestion) report += `   └─ 💡 ${r.fix_suggestion}\n`
      })
    }

    if (conventions.length > 0) {
      report += '\n🟢 CONVENTION - Pelanggaran PEP 8:\n'
      conventions.slice(0, 5).forEach(c => {
        report += `   Baris ${c.line}: ${c.explanation}\n`
        if (c.fix_suggestion) report += `   └─ 💡 ${c.fix_suggestion}\n`
      })
    }

    report += `
┌──────────────────────────────────────────────────────────────┐
│ 💡 SARAN UNTUK SUBMIT BERIKUTNYA                             │
├──────────────────────────────────────────────────────────────┤
│ ${motivation.padEnd(60)} │
└──────────────────────────────────────────────────────────────┘
`

    return report
  }

  /**
   * Generate saran yang lebih baik dengan penjelasan Bahasa Indonesia yang jelas
   */
  private generateEnhancedSuggestions(analysis: DetailedAnalysis, code: string): string[] {
    const suggestions: string[] = []

    // Header dengan skor dan kategori
    const gradeEmoji = analysis.score >= 9 ? '⭐' : analysis.score >= 7 ? '👍' : analysis.score >= 5 ? '💪' : '📚'
    suggestions.push(`📊 Skor Clean Code: ${analysis.score.toFixed(2)}/10 (${analysis.grade_category}) ${gradeEmoji}`)
    suggestions.push('')

    // Statistik temuan dengan format jelas
    suggestions.push(`📋 Temuan: 🔴 ${analysis.errors.length} Error | 🟡 ${analysis.warnings.length} Warning | 🟠 ${analysis.refactors.length} Refactor | 🟢 ${analysis.conventions.length} Convention`)
    suggestions.push('')

    // Gabungkan semua issues dan sort by priority
    const allIssues = [
      ...analysis.errors.map(e => ({ ...e, priority: 4, categoryLabel: 'ERROR' })),
      ...analysis.warnings.map(w => ({ ...w, priority: 3, categoryLabel: 'WARNING' })),
      ...analysis.refactors.map(r => ({ ...r, priority: 2, categoryLabel: 'REFACTOR' })),
      ...analysis.conventions.map(c => ({ ...c, priority: 1, categoryLabel: 'CONVENTION' })),
    ].sort((a, b) => b.priority - a.priority)

    if (allIssues.length > 0) {
      suggestions.push('📝 TEMUAN UTAMA:')
      suggestions.push('')
      
      // Tampilkan semua issues dengan penjelasan lengkap
      allIssues.forEach((issue, idx) => {
        const emoji = this.getCategoryEmoji(issue.category)
        const lineInfo = issue.line > 0 ? `Baris ${issue.line}` : 'Umum'
        
        // Format: emoji [KATEGORI] Baris X: Penjelasan
        suggestions.push(`${emoji} [${issue.categoryLabel}] ${lineInfo}:`)
        suggestions.push(`   📖 ${issue.explanation}`)
        
        if (issue.fix_suggestion && issue.fix_suggestion !== 'Perbaiki sesuai pesan error') {
          suggestions.push(`   💡 Cara perbaiki: ${issue.fix_suggestion}`)
        }
        suggestions.push('')
      })
    } else {
      suggestions.push('✅ Tidak ada masalah ditemukan! Kode sudah sangat bersih.')
      suggestions.push('')
    }

    // Separator
    suggestions.push('━'.repeat(40))
    suggestions.push('')
    
    // Motivasi dengan format yang lebih menarik
    suggestions.push('💬 PESAN UNTUK KAMU:')
    suggestions.push(analysis.motivation)
    suggestions.push('')

    // Tips tambahan berdasarkan skor
    if (analysis.score < 7) {
      suggestions.push('📚 TIPS UNTUK NILAI LEBIH TINGGI:')
      suggestions.push('')
      suggestions.push('1️⃣ Penamaan Variabel:')
      suggestions.push('   • Gunakan snake_case: contoh_variabel, hitung_total')
      suggestions.push('   • Hindari nama 1 huruf: x → jumlah, i → index')
      suggestions.push('')
      suggestions.push('2️⃣ Format Kode:')
      suggestions.push('   • Gunakan 4 spasi untuk indentasi')
      suggestions.push('   • Maksimal 79 karakter per baris')
      suggestions.push('   • Hapus spasi kosong di akhir baris')
      suggestions.push('')
      suggestions.push('3️⃣ Dokumentasi:')
      suggestions.push('   • Tambahkan docstring di setiap fungsi')
      suggestions.push('   • Contoh: """Fungsi untuk menghitung total."""')
      suggestions.push('')
      suggestions.push('🔗 Pelajari lebih lanjut: https://pep8.org/')
    } else if (analysis.score < 9) {
      suggestions.push('💡 TIPS UNTUK SEMPURNA:')
      suggestions.push('   • Tambahkan docstring di setiap fungsi')
      suggestions.push('   • Pastikan semua variabel memiliki nama deskriptif')
      suggestions.push('   • Periksa kembali format dan indentasi')
    } else {
      suggestions.push('🎉 LUAR BIASA!')
      suggestions.push('   Kode kamu sudah memenuhi standar clean code.')
      suggestions.push('   Pertahankan kualitas ini!')
    }

    return suggestions
  }


  /**
   * Run analisis kode Python via Render API (Pylint di server)
   * Hasil rinci dari Pylint tanpa ketergantungan Python lokal di Vercel
   */
  private async runAnalysis(code: string): Promise<{
    fatal: boolean
    error: number
    warning: number
    refactor: number
    convention: number
    statements: number
    messages: { code: string; line: number; message: string; category: string }[]
    invalidNameCount: number
    duplicateCodeCount: number
  }> {
    let fatal = false
    let error = 0
    let warning = 0
    let refactor = 0
    let convention = 0
    const messages: { code: string; line: number; message: string; category: string }[] = []

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT)

      const response = await fetch(`${PYTHON_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, api_key: PYTHON_API_SECRET }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('Analyze API error:', response.status)
        return this.runFallbackAnalysis(code)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.messages)) {
        console.warn('Analyze API returned empty, using fallback')
        return this.runFallbackAnalysis(code)
      }

      for (const item of data.messages) {
        if (!item || !item.message) continue

        const msg = {
          code: item['message-id'] || item.symbol || 'unknown',
          line: item.line || 0,
          message: item.message || '',
          category: (item.type || 'info') as string,
        }
        messages.push(msg)

        switch (item.type) {
          case 'fatal':
            fatal = true
            error += 1
            break
          case 'error':
            error += 1
            break
          case 'warning':
            warning += 1
            break
          case 'refactor':
            refactor += 1
            break
          case 'convention':
            convention += 1
            break
          default:
            break
        }
      }
    } catch (err: any) {
      console.error('Render API error, using fallback:', err.message)
      return this.runFallbackAnalysis(code)
    }

    const invalidNameCount = messages.filter(m => m.code === 'C0103').length
    const duplicateCodeCount = messages.filter(m => m.code === 'R0801').length
    const statements = this.countStatements(code)

    return {
      fatal,
      error,
      warning,
      refactor,
      convention,
      statements,
      messages,
      invalidNameCount,
      duplicateCodeCount,
    }
  }

  /**
   * Fallback analisis berbasis TypeScript jika Pylint lokal gagal
   * Melakukan pengecekan PEP 8 dasar tanpa Python
   */
  private runFallbackAnalysis(code: string): {
    fatal: boolean
    error: number
    warning: number
    refactor: number
    convention: number
    statements: number
    messages: { code: string; line: number; message: string; category: string }[]
    invalidNameCount: number
    duplicateCodeCount: number
  } {
    const messages: { code: string; line: number; message: string; category: string }[] = []
    let convention = 0
    let warning = 0
    let refactor = 0

    const lines = code.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1

      // Line too long
      if (line.length > 79) {
        messages.push({ code: 'C0301', line: lineNum, message: `Baris terlalu panjang (${line.length}/79)`, category: 'convention' })
        convention++
      }

      // Trailing whitespace
      if (/\s+$/.test(line) && line.trim().length > 0) {
        messages.push({ code: 'C0303', line: lineNum, message: 'Trailing whitespace', category: 'convention' })
        convention++
      }

      // Bad indentation
      const indentMatch = line.match(/^(\s+)/)
      if (indentMatch && indentMatch[1].includes(' ')) {
        const spaces = indentMatch[1].replace(/\t/g, '    ').length
        if (spaces % 4 !== 0) {
          messages.push({ code: 'W0311', line: lineNum, message: `Indentasi ${spaces} spasi (seharusnya kelipatan 4)`, category: 'warning' })
          warning++
        }
      }

      // Mixed indentation
      if (/^\t+ +/.test(line) || /^ +\t+/.test(line)) {
        messages.push({ code: 'W0312', line: lineNum, message: 'Campuran tab dan spasi', category: 'warning' })
        warning++
      }

      // Check function naming (basic regex)
      const funcMatch = line.match(/^\s*def\s+([a-zA-Z_]\w*)\s*\(/)
      if (funcMatch) {
        const name = funcMatch[1]
        if (!/^[a-z_][a-z0-9_]*$/.test(name) && !name.startsWith('__')) {
          messages.push({ code: 'C0103', line: lineNum, message: `Nama fungsi '${name}' tidak sesuai snake_case`, category: 'convention' })
          convention++
        }
      }

      // Check class naming
      const classMatch = line.match(/^\s*class\s+([a-zA-Z_]\w*)\s*[:(]/)
      if (classMatch) {
        const name = classMatch[1]
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          messages.push({ code: 'C0103', line: lineNum, message: `Nama class '${name}' harus PascalCase`, category: 'convention' })
          convention++
        }
      }

      // Check eval/exec
      if (/\beval\s*\(/.test(line)) {
        messages.push({ code: 'W0123', line: lineNum, message: 'Penggunaan eval() berbahaya', category: 'warning' })
        warning++
      }
      if (/\bexec\s*\(/.test(line)) {
        messages.push({ code: 'W0122', line: lineNum, message: 'Penggunaan exec() berbahaya', category: 'warning' })
        warning++
      }
    })

    // Missing final newline
    if (!code.endsWith('\n')) {
      messages.push({ code: 'C0304', line: lines.length, message: 'File tidak diakhiri dengan baris kosong', category: 'convention' })
      convention++
    }

    // Check for missing module docstring (basic)
    const firstNonEmpty = lines.findIndex(l => l.trim().length > 0 && !l.trim().startsWith('#'))
    if (firstNonEmpty >= 0 && !lines[firstNonEmpty].trim().startsWith('"""') && !lines[firstNonEmpty].trim().startsWith("'''")) {
      messages.push({ code: 'C0114', line: 1, message: 'Module tidak punya docstring', category: 'convention' })
      convention++
    }

    const invalidNameCount = messages.filter(m => m.code === 'C0103').length
    const duplicateCodeCount = messages.filter(m => m.code === 'R0801').length
    const statements = this.countStatements(code)

    return {
      fatal: false,
      error: 0,
      warning,
      refactor,
      convention,
      statements,
      messages,
      invalidNameCount,
      duplicateCodeCount,
    }
  }

  // ===== Method Helper =====

  private countStatements(code: string): number {
    const count = code
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('#')
      }).length
    return count > 0 ? count : 1
  }
}

// Instance singleton
export const cleanCodeAnalyzer = new CleanCodeAnalyzer()
