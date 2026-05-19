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

type LanguageCode = 'id' | 'en'
const DEFAULT_LANGUAGE: LanguageCode = 'id'

export class CleanCodeAnalyzer {
  private readonly MAX_SCORE = 100

  // Penjelasan kode Pylint dalam Bahasa Indonesia untuk siswa SMK
  private readonly CODE_EXPLANATIONS_ID: Record<string, string> = {
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

  private readonly CODE_EXPLANATIONS_EN: Record<string, string> = {
    'C0103': 'Variable/function name does not follow Python naming standards (use snake_case, UPPER_CASE for constants).',
    'C0114': 'Module is missing a docstring at the top of the file.',
    'C0115': 'Class is missing a docstring.',
    'C0116': 'Function is missing a docstring.',
    'C0301': 'Line is too long (max 79 characters).',
    'C0303': 'Trailing whitespace at the end of the line.',
    'C0304': 'File does not end with a newline.',
    'C0411': 'Import order is not standard (stdlib, third-party, local).',
    'W0311': 'Indentation is not a multiple of 4 spaces.',
    'W0312': 'Mixed tabs and spaces in indentation.',
    'W0401': 'Wildcard import is not recommended.',
    'W0611': 'Unused import.',
    'W0612': 'Unused variable.',
    'W0613': 'Unused function argument.',
    'W0622': 'Variable name shadows a built-in.',
    'W0122': 'Using exec() is unsafe.',
    'W0123': 'Using eval() is unsafe.',
    'E0001': 'Python syntax error.',
    'E0102': 'Duplicate function/class name.',
    'E0401': 'Import error (module not found).',
    'E0601': 'Variable used before assignment.',
    'E0602': 'Undefined variable (typo or missing definition).',
    'R0801': 'Duplicate code detected.',
    'R0912': 'Too many branches/if statements in a function.',
    'R0913': 'Too many parameters in a function.',
    'R0915': 'Too many statements in a function.',
  }

  // Fix suggestions untuk kode Pylint
  private readonly FIX_SUGGESTIONS_ID: Record<string, string> = {
    'C0103': 'Gunakan snake_case untuk variabel/fungsi dan UPPER_CASE untuk konstanta. Contoh: total_nilai, hitung_rata_rata(), NAMA_KONSTANTA.',
    'C0114': "Tambahkan docstring singkat di awal file. Contoh: '''Modul ini untuk ...'''.",
    'C0115': "Tambahkan docstring singkat setelah class. Contoh: '''Kelas untuk ...'''.",
    'C0116': "Tambahkan docstring singkat setelah def. Contoh: '''Fungsi untuk ...'''.",
    'C0301': 'Pecah baris yang terlalu panjang. Pindahkan sebagian ke baris baru atau bungkus dengan tanda kurung.',
    'C0303': 'Hapus spasi di akhir baris (rapikan trailing whitespace).',
    'C0304': 'Tambahkan satu baris kosong di akhir file.',
    'C0411': 'Urutkan import: pustaka standar, pihak ketiga, lalu modul lokal.',
    'W0311': 'Gunakan 4 spasi untuk setiap level indentasi.',
    'W0312': 'Ganti tab dengan 4 spasi agar rapi.',
    'W0401': "Jangan pakai import *. Tulis nama yang dipakai. Contoh: from x import a, b.",
    'W0611': 'Hapus import yang tidak dipakai.',
    'W0612': 'Hapus variabel yang tidak dipakai atau gunakan jika memang perlu.',
    'W0613': 'Jika parameter tidak dipakai, beri awalan _. Contoh: _unused_param.',
    'W0622': 'Hindari nama variabel yang menimpa built-in, misalnya: list, dict, str, id, type.',
    'E0001': 'Periksa kurung, tanda titik dua (:), dan indentasi.',
    'E0102': 'Ganti nama yang duplikat agar unik.',
    'E0401': 'Pastikan modul terpasang. Contoh: pip install nama_modul.',
    'E0601': 'Buat variabel sebelum dipakai.',
    'E0602': 'Periksa salah ketik atau definisikan variabel terlebih dahulu.',
    'R0913': 'Kurangi jumlah parameter. Gabungkan jadi objek/dict jika perlu.',
    'R0912': 'Pecah fungsi besar menjadi beberapa fungsi kecil.',
    'R0915': 'Pecah fungsi ini agar lebih fokus dan mudah dibaca.',
  }

  private readonly FIX_SUGGESTIONS_EN: Record<string, string> = {
    'C0103': 'Use snake_case for variables/functions and UPPER_CASE for constants. Example: total_score, calculate_total(), MAX_LIMIT.',
    'C0114': "Add a short module docstring at the top. Example: '''Module for ...'''.",
    'C0115': "Add a short class docstring. Example: '''Class for ...'''.",
    'C0116': "Add a short function docstring. Example: '''Function to ...'''.",
    'C0301': 'Break long lines by wrapping in parentheses or moving parts to a new line.',
    'C0303': 'Remove trailing whitespace at the end of the line.',
    'C0304': 'Add a final newline at the end of the file.',
    'C0411': 'Order imports: standard library, third-party, then local modules.',
    'W0311': 'Use 4 spaces per indentation level.',
    'W0312': 'Replace tabs with 4 spaces.',
    'W0401': 'Avoid wildcard import. Import only what you use, e.g. from x import a, b.',
    'W0611': 'Remove unused import.',
    'W0612': 'Remove the unused variable or use it.',
    'W0613': 'Prefix unused parameters with _, e.g. _unused_param.',
    'W0622': 'Avoid shadowing built-ins like list, dict, str, id, type.',
    'E0001': 'Check parentheses, colons, and indentation.',
    'E0102': 'Rename the duplicate function/class.',
    'E0401': 'Install the missing module, e.g. pip install module_name.',
    'E0601': 'Define the variable before using it.',
    'E0602': 'Fix typos or define the variable first.',
    'R0913': 'Reduce parameters; group them into an object/dict if needed.',
    'R0912': 'Split the large function into smaller ones.',
    'R0915': 'Split this function into smaller focused functions.',
  }

  private getExplanation(code: string, fallback: string, language: LanguageCode): string {
    if (language === 'en') {
      return this.CODE_EXPLANATIONS_EN[code] || fallback
    }
    return this.CODE_EXPLANATIONS_ID[code] || fallback
  }

  private getFixSuggestion(code: string, language: LanguageCode): string {
    if (language === 'en') {
      return this.FIX_SUGGESTIONS_EN[code] || ''
    }
    return this.FIX_SUGGESTIONS_ID[code] || ''
  }

  constructor() {
    // Menggunakan Python API yang di-deploy di Render.com
  }

  /**
   * Analyze Python code dengan format khusus untuk siswa SMK
   * Menggunakan Pylint + standar PEP 8
   */
  async analyze(code: string, language: LanguageCode = DEFAULT_LANGUAGE): Promise<CleanCodeAnalysisResult> {
    try {
      // Run analisis via Pylint lokal
      const pylint = await this.runAnalysis(code, language)
      
      // Kategorikan pesan berdasarkan jenis
      const detailedAnalysis = this.createDetailedAnalysis(pylint, code, language)

      // Build breakdown untuk compatibility dengan interface yang ada
      const meaningfulNames: IndicatorResult = {
        score: Math.max(0, this.MAX_SCORE - pylint.invalidNameCount * 20),
        details: language === 'en'
          ? `Non-standard naming: ${pylint.invalidNameCount} issue(s)`
          : `Penamaan tidak standar: ${pylint.invalidNameCount} masalah`,
        issues: pylint.messages
          .filter(m => m.code === 'C0103')
          .map(m => this.formatMessageForStudent(m, language)),
      }

      const codeDuplication: IndicatorResult = {
        score: Math.max(0, this.MAX_SCORE - pylint.duplicateCodeCount * 25),
        details: language === 'en'
          ? `Duplicate code: ${pylint.duplicateCodeCount} found`
          : `Kode duplikat: ${pylint.duplicateCodeCount} ditemukan`,
        issues: pylint.messages
          .filter(m => m.code === 'R0801')
          .map(m => this.formatMessageForStudent(m, language)),
      }

      const codeQuality: IndicatorResult = {
        score: detailedAnalysis.score * 10,
        details: detailedAnalysis.formatted_report,
        issues: this.generateFormattedIssues(detailedAnalysis, language),
        pylint_rating: detailedAnalysis.score,
        pylint_messages: pylint.messages.map(m => this.formatMessageForStudent(m, language)),
      }

      const breakdown = {
        meaningful_names: meaningfulNames,
        code_duplication: codeDuplication,
        code_quality: codeQuality,
      }

      // Generate suggestions dengan format baru
      const suggestions = this.generateEnhancedSuggestions(detailedAnalysis, code, language)

      return {
        final_score: detailedAnalysis.score,
        grade: detailedAnalysis.grade,
        breakdown,
        suggestions,
      // Properti tambahan untuk frontend
        detailed_analysis: detailedAnalysis,
      } as CleanCodeAnalysisResult

    } catch (error: any) {
      const fallbackMessage = language === 'en'
        ? `❌ Analysis error: ${error.message}`
        : `❌ Error saat analisis: ${error.message}`
      return {
        final_score: 0,
        grade: '0.00/10',
        breakdown: {
          meaningful_names: { score: 0, details: '', issues: [] },
          code_duplication: { score: 0, details: '', issues: [] },
          code_quality: { score: 0, details: '', issues: [] },
        },
        suggestions: [fallbackMessage],
      }
    }
  }

  /**
   * Buat analisis detail dengan kategori ERROR, WARNING, REFACTOR, CONVENTION
   */
  private createDetailedAnalysis(
    pylint: Awaited<ReturnType<typeof this.runAnalysis>>,
    code: string,
    language: LanguageCode
  ): DetailedAnalysis {
    const errors: PylintMessage[] = []
    const warnings: PylintMessage[] = []
    const refactors: PylintMessage[] = []
    const conventions: PylintMessage[] = []

    // Kategorikan pesan
    for (const msg of pylint.messages) {
      const explanation = this.getExplanation(msg.code, msg.message, language)
      const fixSuggestion = this.getFixSuggestion(msg.code, language)
      const enhancedMsg: PylintMessage = {
        code: msg.code,
        line: msg.line,
        column: 0,
        message: msg.message,
        category: msg.category as PylintMessage['category'],
        symbol: msg.code,
        explanation,
        fix_suggestion: fixSuggestion || undefined,
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
    this.addPEP8Checks(code, conventions, warnings, language)

    // Hitung skor menggunakan rumus yang diminta:
    // max(0, 0 if fatal else 10.0 - ((float(5 * error + warning + refactor + convention) / statement) * 10))
    const statements = Math.max(1, pylint.statements)
    const score10 = pylint.fatal 
      ? 0 
      : Math.max(0, 10.0 - ((5 * pylint.error + pylint.warning + pylint.refactor + pylint.convention) / statements) * 10)
    const scoreRounded = Math.round(score10 * 100) / 100

    // Tentukan grade category
    const gradeCategory = this.getGradeCategory(scoreRounded, language)

    // Generate kode perbaikan
    const correctedCode = this.generateCorrectedCode(code, [...errors, ...warnings, ...refactors, ...conventions])

    // Generate motivasi
    const motivation = this.generateMotivation(scoreRounded, language)

    // Format report lengkap
    const formattedReport = this.formatFullReport(
      errors, warnings, refactors, conventions,
      scoreRounded, gradeCategory, correctedCode, motivation, language
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
  private addPEP8Checks(
    code: string,
    conventions: PylintMessage[],
    warnings: PylintMessage[],
    language: LanguageCode
  ): void {
    const lines = code.split('\n')
    const isEnglish = language === 'en'

    lines.forEach((line, idx) => {
      const lineNum = idx + 1

      // Cek line length > 79
      if (line.length > 79) {
        const message = isEnglish
          ? `Line too long (${line.length}/79 characters)`
          : `Baris terlalu panjang (${line.length}/79 karakter)`
        conventions.push({
          code: 'C0301',
          line: lineNum,
          column: 80,
          message,
          category: 'convention',
          symbol: 'line-too-long',
          explanation: this.getExplanation('C0301', message, language),
          fix_suggestion: this.getFixSuggestion('C0301', language) || undefined,
        })
      }

      // Cek trailing whitespace
      if (/\s+$/.test(line)) {
        const message = isEnglish ? 'Trailing whitespace detected' : 'Trailing whitespace terdeteksi'
        conventions.push({
          code: 'C0303',
          line: lineNum,
          column: line.length,
          message,
          category: 'convention',
          symbol: 'trailing-whitespace',
          explanation: this.getExplanation('C0303', message, language),
          fix_suggestion: this.getFixSuggestion('C0303', language) || undefined,
        })
      }

      // Cek indentasi tidak kelipatan 4
      const indentMatch = line.match(/^(\s+)/)
      if (indentMatch && indentMatch[1].includes(' ')) {
        const spaces = indentMatch[1].replace(/\t/g, '    ').length
        if (spaces % 4 !== 0) {
          const message = isEnglish
            ? `Indentation is ${spaces} spaces (should be a multiple of 4)`
            : `Indentasi ${spaces} spasi (seharusnya kelipatan 4)`
          conventions.push({
            code: 'W0311',
            line: lineNum,
            column: 0,
            message,
            category: 'warning',
            symbol: 'bad-indentation',
            explanation: this.getExplanation('W0311', message, language),
            fix_suggestion: this.getFixSuggestion('W0311', language) || undefined,
          })
        }
      }

      // Cek tab dan spasi tercampur
      if (/^\t+ +/.test(line) || /^ +\t+/.test(line)) {
        const message = isEnglish
          ? 'Mixed tabs and spaces for indentation'
          : 'Campuran tab dan spasi untuk indentasi'
        warnings.push({
          code: 'W0312',
          line: lineNum,
          column: 0,
          message,
          category: 'warning',
          symbol: 'mixed-indentation',
          explanation: this.getExplanation('W0312', message, language),
          fix_suggestion: this.getFixSuggestion('W0312', language) || undefined,
        })
      }
    })

    // Cek tidak ada newline di akhir file
    if (!code.endsWith('\n')) {
      const message = isEnglish
        ? 'File does not end with a newline'
        : 'File tidak diakhiri dengan baris kosong'
      conventions.push({
        code: 'C0304',
        line: lines.length,
        column: 0,
        message,
        category: 'convention',
        symbol: 'missing-final-newline',
        explanation: this.getExplanation('C0304', message, language),
        fix_suggestion: this.getFixSuggestion('C0304', language) || undefined,
      })
    }
  }

  /**
   * Tentukan kategori grade
   */
  private getGradeCategory(score: number, language: LanguageCode): string {
    if (language === 'en') {
      if (score >= 8.1) return 'Excellent ⭐'
      if (score >= 6.1) return 'Skilled 👍'
      if (score >= 4.1) return 'Fair 💪'
      if (score >= 2.1) return 'Needs Practice ⚠️'
      return 'Beginner ❌'
    }
    if (score >= 8.1) return 'Sangat Terampil ⭐'
    if (score >= 6.1) return 'Terampil 👍'
    if (score >= 4.1) return 'Cukup Terampil 💪'
    if (score >= 2.1) return 'Kurang Terampil ⚠️'
    return 'Tidak Terampil ❌'
  }

  /**
   * Generate motivasi untuk siswa
   */
  private generateMotivation(score: number, language: LanguageCode): string {
    if (language === 'en') {
      if (score >= 8.1) {
        return '🎉 Excellent! Your code is clean and professional. Keep this standard!'
      }
      if (score >= 6.1) {
        return '👍 Great job! Your code is good with only minor improvements needed. Keep going!'
      }
      if (score >= 4.1) {
        return '💪 Fair effort! Improve variable naming and follow PEP 8 for better results.'
      }
      if (score >= 2.1) {
        return '📚 Keep practicing! Learn PEP 8 and apply proper naming conventions.'
      }
      return '🚀 Start with the basics! Focus on 4-space indentation and clear names. You can do it!'
    }
    if (score >= 8.1) {
      return '🎉 Luar biasa! Kode kamu sudah sangat bersih dan profesional — Sangat Terampil! Pertahankan standar ini!'
    }
    if (score >= 6.1) {
      return '👍 Kerja bagus! Kode kamu sudah baik dengan sedikit perbaikan minor. Terus tingkatkan!'
    }
    if (score >= 4.1) {
      return '💪 Cukup Terampil! Perbaiki penamaan variabel dan ikuti standar PEP 8 untuk hasil lebih baik.'
    }
    if (score >= 2.1) {
      return '📚 Kurang Terampil — jangan menyerah! Pelajari PEP 8 dan praktikkan naming convention yang benar.'
    }
    return '🚀 Mulai dari dasar! Fokus pada indentasi 4 spasi dan penamaan yang jelas. Kamu pasti bisa!'
  }

  /**
   * Format pesan untuk siswa SMK
   */
  private formatMessageForStudent(
    msg: { code: string; line: number; message: string; category: string },
    language: LanguageCode
  ): string {
    const emoji = this.getCategoryEmoji(msg.category)
    const explanation = this.getExplanation(msg.code, msg.message, language)
    const fix = this.getFixSuggestion(msg.code, language)
    const lineLabel = language === 'en' ? 'Line' : 'Baris'
    
    let result = `${emoji} ${lineLabel} ${msg.line} | ${msg.code}: ${explanation}`
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
  private generateFormattedIssues(analysis: DetailedAnalysis, language: LanguageCode): string[] {
    const issues: string[] = []
    const isEnglish = language === 'en'
    const lineLabel = isEnglish ? 'Line' : 'Baris'
    const fixLabel = isEnglish ? 'Fix' : 'Perbaikan'

    if (analysis.errors.length > 0) {
      issues.push(isEnglish ? '═══ 🔴 ERROR (Potential Bugs) ═══' : '═══ 🔴 KESALAHAN (Bug Potensial) ═══')
      analysis.errors.forEach(e => {
        issues.push(`  ${lineLabel} ${e.line}: ${e.explanation}`)
        if (e.fix_suggestion) issues.push(`    💡 ${fixLabel}: ${e.fix_suggestion}`)
      })
    }

    if (analysis.warnings.length > 0) {
      issues.push(isEnglish ? '═══ 🟡 WARNING (Potential Issues) ═══' : '═══ 🟡 PERINGATAN (Potensi Bug) ═══')
      analysis.warnings.forEach(w => {
        issues.push(`  ${lineLabel} ${w.line}: ${w.explanation}`)
        if (w.fix_suggestion) issues.push(`    💡 ${fixLabel}: ${w.fix_suggestion}`)
      })
    }

    if (analysis.refactors.length > 0) {
      issues.push(isEnglish ? '═══ 🟠 STRUCTURE (Needs Refactor) ═══' : '═══ 🟠 PERBAIKAN STRUKTUR (Perlu Perapian) ═══')
      analysis.refactors.forEach(r => {
        issues.push(`  ${lineLabel} ${r.line}: ${r.explanation}`)
        if (r.fix_suggestion) issues.push(`    💡 ${fixLabel}: ${r.fix_suggestion}`)
      })
    }

    if (analysis.conventions.length > 0) {
      issues.push(isEnglish ? '═══ 🟢 PEP 8 (Formatting) ═══' : '═══ 🟢 ATURAN PEP 8 (Format Penulisan) ═══')
      analysis.conventions.forEach(c => {
        issues.push(`  ${lineLabel} ${c.line}: ${c.explanation}`)
        if (c.fix_suggestion) issues.push(`    💡 ${fixLabel}: ${c.fix_suggestion}`)
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
    motivation: string,
    language: LanguageCode
  ): string {
    const totalIssues = errors.length + warnings.length + refactors.length + conventions.length
    const isEnglish = language === 'en'
    const lineLabel = isEnglish ? 'Line' : 'Baris'
    const scoreLabel = isEnglish ? 'SCORE' : 'SKOR'
    const totalLabel = isEnglish ? 'Total Findings' : 'Total Temuan'
    const summaryTitle = isEnglish ? 'SUMMARY' : 'RINGKASAN TEMUAN'
    const nextSubmitTitle = isEnglish ? 'TIPS FOR NEXT SUBMISSION' : 'SARAN UNTUK SUBMIT BERIKUTNYA'

    let report = `
╔══════════════════════════════════════════════════════════════╗
║           📊 ${isEnglish ? 'CLEAN CODE ANALYSIS REPORT' : 'LAPORAN ANALISIS CLEAN CODE PYTHON'}              ║
║                    ${isEnglish ? 'C3-Py Online Compiler' : 'C3-Py Compiler Online'}                      ║
╚══════════════════════════════════════════════════════════════╝

📈 ${scoreLabel}: ${score.toFixed(2)}/10 (${gradeCategory})
📋 ${totalLabel}: ${totalIssues} ${isEnglish ? 'issues' : 'masalah'}

┌──────────────────────────────────────────────────────────────┐
│ ${summaryTitle.padEnd(60)} │
├──────────────────────────────────────────────────────────────┤
│ 🔴 ${isEnglish ? 'Errors (potential bugs)' : 'Kesalahan (bug potensial)'}    : ${errors.length.toString().padStart(3)} ${isEnglish ? 'issues' : 'masalah'}              │
│ 🟡 ${isEnglish ? 'Warnings (potential issues)' : 'Peringatan (potensi bug)'}     : ${warnings.length.toString().padStart(3)} ${isEnglish ? 'issues' : 'masalah'}              │
│ 🟠 ${isEnglish ? 'Refactor (structure)' : 'Perbaikan struktur'}           : ${refactors.length.toString().padStart(3)} ${isEnglish ? 'issues' : 'masalah'}              │
│ 🟢 ${isEnglish ? 'PEP 8 (formatting)' : 'Aturan PEP 8'}                 : ${conventions.length.toString().padStart(3)} ${isEnglish ? 'issues' : 'masalah'}              │
└──────────────────────────────────────────────────────────────┘
`

    if (errors.length > 0) {
      report += isEnglish
        ? '\n🔴 ERROR - Potential bugs:\n'
        : '\n🔴 KESALAHAN - Bug yang berpotensi gagal:\n'
      errors.slice(0, 5).forEach(e => {
        report += `   ${lineLabel} ${e.line}: ${e.explanation}\n`
        if (e.fix_suggestion) report += `   └─ 💡 ${e.fix_suggestion}\n`
      })
    }

    if (warnings.length > 0) {
      report += isEnglish
        ? '\n🟡 WARNING - Potential issues & unused variables:\n'
        : '\n🟡 PERINGATAN - Potensi bug & variabel tidak terpakai:\n'
      warnings.slice(0, 5).forEach(w => {
        report += `   ${lineLabel} ${w.line}: ${w.explanation}\n`
        if (w.fix_suggestion) report += `   └─ 💡 ${w.fix_suggestion}\n`
      })
    }

    if (refactors.length > 0) {
      report += isEnglish
        ? '\n🟠 REFACTOR - High complexity:\n'
        : '\n🟠 PERBAIKAN STRUKTUR - Kompleksitas tinggi:\n'
      refactors.slice(0, 5).forEach(r => {
        report += `   ${lineLabel} ${r.line}: ${r.explanation}\n`
        if (r.fix_suggestion) report += `   └─ 💡 ${r.fix_suggestion}\n`
      })
    }

    if (conventions.length > 0) {
      report += isEnglish
        ? '\n🟢 PEP 8 - Formatting issues:\n'
        : '\n🟢 ATURAN PEP 8 - Pelanggaran format:\n'
      conventions.slice(0, 5).forEach(c => {
        report += `   ${lineLabel} ${c.line}: ${c.explanation}\n`
        if (c.fix_suggestion) report += `   └─ 💡 ${c.fix_suggestion}\n`
      })
    }

    report += `
┌──────────────────────────────────────────────────────────────┐
│ 💡 ${nextSubmitTitle.padEnd(60)} │
├──────────────────────────────────────────────────────────────┤
│ ${motivation.padEnd(60)} │
└──────────────────────────────────────────────────────────────┘
`

    return report
  }

  /**
   * Generate saran yang lebih baik dengan penjelasan Bahasa Indonesia yang jelas
   */
  private generateEnhancedSuggestions(
    analysis: DetailedAnalysis,
    code: string,
    language: LanguageCode
  ): string[] {
    const suggestions: string[] = []
    const isEnglish = language === 'en'

    // Header dengan skor dan kategori
    const gradeEmoji = analysis.score >= 8.1 ? '⭐' : analysis.score >= 6.1 ? '👍' : analysis.score >= 4.1 ? '💪' : analysis.score >= 2.1 ? '📚' : '❌'
    suggestions.push(isEnglish
      ? `📊 Code Quality Score: ${analysis.score.toFixed(2)}/10 (${analysis.grade_category}) ${gradeEmoji}`
      : `📊 Skor Kualitas Kode: ${analysis.score.toFixed(2)}/10 (${analysis.grade_category}) ${gradeEmoji}`
    )
    suggestions.push('')

    // Statistik temuan dengan format jelas
    suggestions.push(isEnglish
      ? `📋 Summary: 🔴 ${analysis.errors.length} Errors | 🟡 ${analysis.warnings.length} Warnings | 🟠 ${analysis.refactors.length} Refactors | 🟢 ${analysis.conventions.length} PEP 8`
      : `📋 Ringkasan temuan: 🔴 ${analysis.errors.length} Kesalahan | 🟡 ${analysis.warnings.length} Peringatan | 🟠 ${analysis.refactors.length} Perbaikan Struktur | 🟢 ${analysis.conventions.length} Aturan PEP 8`
    )
    suggestions.push('')

    // Gabungkan semua issues dan sort by priority
    const allIssues = [
      ...analysis.errors.map(e => ({ ...e, priority: 4, categoryLabel: isEnglish ? 'Error' : 'Kesalahan' })),
      ...analysis.warnings.map(w => ({ ...w, priority: 3, categoryLabel: isEnglish ? 'Warning' : 'Peringatan' })),
      ...analysis.refactors.map(r => ({ ...r, priority: 2, categoryLabel: isEnglish ? 'Refactor' : 'Perbaikan Struktur' })),
      ...analysis.conventions.map(c => ({ ...c, priority: 1, categoryLabel: isEnglish ? 'PEP 8' : 'Aturan PEP 8' })),
    ].sort((a, b) => b.priority - a.priority)

    if (allIssues.length > 0) {
      suggestions.push(isEnglish ? '📝 Fix list:' : '📝 Daftar perbaikan:')
      suggestions.push('')
      
      // Tampilkan semua issues dengan format yang sederhana
      allIssues.forEach((issue) => {
        const emoji = this.getCategoryEmoji(issue.category)
        const lineInfo = issue.line > 0
          ? `${isEnglish ? 'Line' : 'Baris'} ${issue.line}`
          : (isEnglish ? 'General location' : 'Lokasi umum')
        
        suggestions.push(`${emoji} ${issue.categoryLabel} (${lineInfo})`)
        suggestions.push(isEnglish
          ? `   Issue: ${issue.explanation}`
          : `   Masalah: ${issue.explanation}`
        )
        
        if (issue.fix_suggestion) {
          suggestions.push(isEnglish
            ? `   Fix: ${issue.fix_suggestion}`
            : `   Perbaiki: ${issue.fix_suggestion}`
          )
        }
        suggestions.push('')
      })
    } else {
      suggestions.push(isEnglish
        ? '✅ No issues found! Your code looks clean.'
        : '✅ Tidak ada masalah ditemukan! Kode sudah sangat rapi.'
      )
      suggestions.push('')
    }

    // Separator
    suggestions.push('━'.repeat(40))
    suggestions.push('')
    
    // Motivasi dengan format yang lebih menarik
    suggestions.push(isEnglish ? '💬 Message for you:' : '💬 Pesan untuk kamu:')
    suggestions.push(analysis.motivation)
    suggestions.push('')

    // Tips tambahan berdasarkan skor
    if (analysis.score < 7) {
      suggestions.push(isEnglish ? '📚 Tips to improve your score:' : '📚 Tips agar nilai naik:')
      suggestions.push('')
      suggestions.push(isEnglish ? '1️⃣ Naming:' : '1️⃣ Penamaan:')
      suggestions.push(isEnglish
        ? '   • Use snake_case: total_score, student_count'
        : '   • Gunakan snake_case: total_nilai, jumlah_siswa'
      )
      suggestions.push(isEnglish
        ? '   • Avoid very short names: x → total, i → index'
        : '   • Hindari nama terlalu singkat: x → jumlah, i → indeks'
      )
      suggestions.push('')
      suggestions.push(isEnglish ? '2️⃣ Formatting:' : '2️⃣ Kerapian kode:')
      suggestions.push(isEnglish
        ? '   • Use 4 spaces for indentation'
        : '   • Gunakan 4 spasi untuk indentasi'
      )
      suggestions.push(isEnglish
        ? '   • Keep lines under 79 characters'
        : '   • Maksimal 79 karakter per baris'
      )
      suggestions.push(isEnglish
        ? '   • Remove trailing whitespace'
        : '   • Hapus spasi kosong di akhir baris'
      )
      suggestions.push('')
      suggestions.push(isEnglish ? '3️⃣ Documentation:' : '3️⃣ Dokumentasi:')
      suggestions.push(isEnglish
        ? '   • Add docstrings to important functions'
        : '   • Tambahkan docstring (komentar penjelasan) pada fungsi penting'
      )
      suggestions.push(isEnglish
        ? '   • Example: """Calculate total cost."""'
        : '   • Contoh: """Menghitung total belanja."""'
      )
      suggestions.push('')
      suggestions.push(isEnglish
        ? '🔗 Read the PEP 8 guide: https://pep8.org/'
        : '🔗 Baca panduan PEP 8: https://pep8.org/'
      )
    } else if (analysis.score < 9) {
      suggestions.push(isEnglish ? '💡 Tips to make it even cleaner:' : '💡 Tips agar lebih rapi:')
      suggestions.push(isEnglish
        ? '   • Add docstrings to important functions'
        : '   • Tambahkan docstring (komentar penjelasan) pada fungsi penting'
      )
      suggestions.push(isEnglish
        ? '   • Use clear and consistent variable names'
        : '   • Gunakan nama variabel yang jelas dan konsisten'
      )
      suggestions.push(isEnglish
        ? '   • Recheck formatting and indentation'
        : '   • Cek ulang format dan indentasi'
      )
    } else {
      suggestions.push(isEnglish ? '🎉 Excellent!' : '🎉 Luar biasa!')
      suggestions.push(isEnglish
        ? '   Your code already meets clean code standards.'
        : '   Kode kamu sudah memenuhi standar clean code.'
      )
      suggestions.push(isEnglish
        ? '   Keep it up!'
        : '   Pertahankan kualitas ini!'
      )
    }

    return suggestions
  }


  /**
   * Run analisis kode Python via Render API (Pylint di server)
   * Hasil rinci dari Pylint tanpa ketergantungan Python lokal di Vercel
   */
  private async runAnalysis(code: string, language: LanguageCode): Promise<{
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
        return this.runFallbackAnalysis(code, language)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.messages)) {
        console.warn('Analyze API returned empty, using fallback')
        return this.runFallbackAnalysis(code, language)
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
      return this.runFallbackAnalysis(code, language)
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
  private runFallbackAnalysis(code: string, language: LanguageCode): {
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
    const isEnglish = language === 'en'

    const lines = code.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1

      // Line too long
      if (line.length > 79) {
        const message = isEnglish
          ? `Line too long (${line.length}/79)`
          : `Baris terlalu panjang (${line.length}/79)`
        messages.push({ code: 'C0301', line: lineNum, message, category: 'convention' })
        convention++
      }

      // Trailing whitespace
      if (/\s+$/.test(line) && line.trim().length > 0) {
        const message = isEnglish ? 'Trailing whitespace' : 'Spasi di akhir baris'
        messages.push({ code: 'C0303', line: lineNum, message, category: 'convention' })
        convention++
      }

      // Bad indentation
      const indentMatch = line.match(/^(\s+)/)
      if (indentMatch && indentMatch[1].includes(' ')) {
        const spaces = indentMatch[1].replace(/\t/g, '    ').length
        if (spaces % 4 !== 0) {
          const message = isEnglish
            ? `Indentation is ${spaces} spaces (should be a multiple of 4)`
            : `Indentasi ${spaces} spasi (seharusnya kelipatan 4)`
          messages.push({ code: 'W0311', line: lineNum, message, category: 'warning' })
          warning++
        }
      }

      // Mixed indentation
      if (/^\t+ +/.test(line) || /^ +\t+/.test(line)) {
        const message = isEnglish ? 'Mixed tabs and spaces' : 'Campuran tab dan spasi'
        messages.push({ code: 'W0312', line: lineNum, message, category: 'warning' })
        warning++
      }

      // Check function naming (basic regex)
      const funcMatch = line.match(/^\s*def\s+([a-zA-Z_]\w*)\s*\(/)
      if (funcMatch) {
        const name = funcMatch[1]
        if (!/^[a-z_][a-z0-9_]*$/.test(name) && !name.startsWith('__')) {
          const message = isEnglish
            ? `Function name '${name}' should use snake_case`
            : `Nama fungsi '${name}' tidak sesuai snake_case`
          messages.push({ code: 'C0103', line: lineNum, message, category: 'convention' })
          convention++
        }
      }

      // Check class naming
      const classMatch = line.match(/^\s*class\s+([a-zA-Z_]\w*)\s*[:(]/)
      if (classMatch) {
        const name = classMatch[1]
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          const message = isEnglish
            ? `Class name '${name}' should use PascalCase`
            : `Nama class '${name}' harus PascalCase`
          messages.push({ code: 'C0103', line: lineNum, message, category: 'convention' })
          convention++
        }
      }

      // Check eval/exec
      if (/\beval\s*\(/.test(line)) {
        const message = isEnglish ? 'Using eval() is unsafe' : 'Penggunaan eval() berbahaya'
        messages.push({ code: 'W0123', line: lineNum, message, category: 'warning' })
        warning++
      }
      if (/\bexec\s*\(/.test(line)) {
        const message = isEnglish ? 'Using exec() is unsafe' : 'Penggunaan exec() berbahaya'
        messages.push({ code: 'W0122', line: lineNum, message, category: 'warning' })
        warning++
      }
    })

    // Missing final newline
    if (!code.endsWith('\n')) {
      const message = isEnglish ? 'File does not end with a newline' : 'File tidak diakhiri dengan baris kosong'
      messages.push({ code: 'C0304', line: lines.length, message, category: 'convention' })
      convention++
    }

    // Check for missing module docstring (basic)
    const firstNonEmpty = lines.findIndex(l => l.trim().length > 0 && !l.trim().startsWith('#'))
    if (firstNonEmpty >= 0 && !lines[firstNonEmpty].trim().startsWith('"""') && !lines[firstNonEmpty].trim().startsWith("'''")) {
      const message = isEnglish ? 'Module is missing a docstring' : 'Module tidak punya docstring'
      messages.push({ code: 'C0114', line: 1, message, category: 'convention' })
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
