/**
 * Tipe data untuk Clean Code Analyzer.
 * Fokus: Compiler Python & Analisis Clean Code.
 * Role: guru, siswa.
 */

export interface Profile {
  id: string
  email: string
  name: string
  full_name?: string
  role: 'guru' | 'siswa'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface CodeSubmission {
  id: string
  student_id: string
  code: string
  output?: string
  clean_code_score?: number
  grade?: string
  analysis_result?: CleanCodeAnalysisResult
  submitted_at: string
}

export interface LeaderboardEntry {
  id: string
  student_id: string
  total_points: number
  total_submissions: number
  average_score: number
  highest_score: number
  updated_at: string
  name?: string
  avatar_url?: string
  rank?: number
}

export interface StudentStats {
  student_id: string
  name: string
  email: string
  total_submissions: number
  average_score: number
  highest_score: number
  latest_submission?: string
  progress_percentage: number
}

export interface CleanCodeAnalysisResult {
  final_score: number
  grade: string
  breakdown: {
    meaningful_names: IndicatorResult
    code_duplication: IndicatorResult
    code_quality: IndicatorResult
  }
  suggestions: string[]
  detailed_analysis?: DetailedAnalysis
}

export interface DetailedAnalysis {
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

export interface PylintMessage {
  code: string
  line: number
  column: number
  message: string
  category: 'error' | 'warning' | 'refactor' | 'convention' | 'fatal'
  symbol: string
  explanation?: string
  fix_suggestion?: string
}

export interface IndicatorResult {
  score: number
  details: string
  issues: string[]
  pylint_rating?: number
  pylint_messages?: string[]
}

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  execution_time?: number
}

export interface Material {
  id: string
  teacher_id: string
  teacher_name?: string
  title: string
  description?: string
  file_name: string
  file_url: string
  file_type: 'pdf' | 'ppt' | 'pptx'
  file_size: number
  category?: string
  created_at: string
  updated_at: string
}
