'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

interface AnalysisResult {
  final_score: number
  grade: string
  breakdown: {
    meaningful_names: { score: number; details: string; issues: string[] }
    code_duplication: { score: number; details: string; issues: string[] }
    code_quality: { score: number; details: string; issues: string[] }
  }
  suggestions: string[]
}

// Interface untuk riwayat submission
interface HistoryEntry {
  id: string
  code: string
  clean_code_score: number
  grade: string
  submitted_at: string
  analysis_result?: AnalysisResult
}

export default function SiswaCompilerPage() {
  const [userName, setUserName] = useState('Siswa')
  const [code, setCode] = useState(`# 🎯 Selamat datang di Clean Code Analyzer!
# Tulis kode Python yang bersih dan efisien

def calculate_sum(numbers):
    """Calculate the sum of a list of numbers."""
    total = 0
    for number in numbers:
        total += number
    return total


def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    if not numbers:
        return 0
    total = calculate_sum(numbers)
    return total / len(numbers)


# Test the functions
test_numbers = [1, 2, 3, 4, 5]
result_sum = calculate_sum(test_numbers)
result_avg = calculate_average(test_numbers)
print(f"Numbers: {test_numbers}")
print(f"Sum: {result_sum}")
print(f"Average: {result_avg}")
`)
  const [output, setOutput] = useState('')
  const [executionTime, setExecutionTime] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [alert, setAlert] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)
  const [cleanCodeScore, setCleanCodeScore] = useState<number>(0)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterRef = useRef<HTMLDivElement | null>(null)
  const [lineNumbers, setLineNumbers] = useState<string[]>(['1'])
  const [activeTab, setActiveTab] = useState<'output' | 'analysis'>('output')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  // Theme hook
  const { theme } = useTheme()
  
  // History states
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null)

  // Load user data on mount - middleware handles auth
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Try to get name from profile first
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, full_name')
            .eq('id', session.user.id)
            .single()

          if (profile?.full_name || profile?.name) {
            setUserName(profile.full_name || profile.name)
          } else {
            // Fallback to user_metadata (from registration)
            const userName = session.user.user_metadata?.name || 
                           session.user.user_metadata?.full_name ||
                           session.user.email?.split('@')[0] || 
                           'Siswa'
            setUserName(userName)
          }
        }
        
        // Load latest clean code score
        loadLatestScore()
        
        // Load history
        loadHistory()
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
    
    loadUserData()
  }, [])

  // Load submission history
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: submissions, error } = await supabase
          .from('code_submissions')
          .select('id, code, clean_code_score, grade, submitted_at, analysis_result')
          .eq('student_id', session.user.id)
          .order('submitted_at', { ascending: false })
          .limit(50)
        
        if (error) {
          console.error('Error loading history:', error)
        } else {
          setHistory(submissions || [])
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  useEffect(() => {
    const count = code.split('\n').length
    const nums = Array.from({ length: count }, (_, i) => String(i + 1))
    setLineNumbers(nums)
  }, [code])

  const loadLatestScore = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Get latest submission score
        const { data: latestSubmission } = await supabase
          .from('code_submissions')
          .select('clean_code_score')
          .eq('student_id', session.user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single()
        
        if (latestSubmission) {
          setCleanCodeScore(latestSubmission.clean_code_score || 0)
        }
      }
    } catch (error) {
      console.error('Failed to load score:', error)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const confirmLogout = () => {
    setShowLogoutModal(true)
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  const showAlertMessage = (
    message: string,
    type: 'success' | 'error' | 'warning'
  ) => {
    setAlert({ message, type })
  }

  const syncGutterScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleExecute = async () => {
    if (!code.trim()) {
      showAlertMessage('⚠️ Tulis kode terlebih dahulu!', 'warning')
      return
    }

    setLoading(true)
    setOutput('⏳ Menjalankan kode...')
    setExecutionTime('')
    setActiveTab('output')

    try {
      const response = await fetch('/api/compiler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (data.success) {
        setOutput(data.output || 'No output')
        if (data.execution_time) {
          setExecutionTime(`⚡ ${data.execution_time}ms`)
        }
        showAlertMessage('✅ Kode berhasil dijalankan!', 'success')
      } else {
        setOutput(`❌ Error:\n${data.error}`)
        showAlertMessage('❌ Ada error dalam kode', 'error')
      }
    } catch (error) {
      setOutput('🌐 Network error. Silakan coba lagi.')
      showAlertMessage('🌐 Koneksi bermasalah', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!code.trim()) {
      showAlertMessage('⚠️ Tulis kode terlebih dahulu!', 'warning')
      return
    }

    setAnalysisLoading(true)
    setShowAnalysis(false)
    setActiveTab('analysis')

    try {
      const response = await fetch('/api/compiler/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (data.success) {
        setAnalysis(data.analysis)
        setShowAnalysis(true)
        const pointsEarned = Math.max(
          0,
          Math.round((data.analysis?.final_score || 0) * 10)
        )

        if (data.pointsSaved) {
          if (pointsEarned >= 70) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
          }
          const now = new Date()
          setLastAnalysisTime(now.toISOString())
          showAlertMessage(
            `🎉 Analisis selesai! Score: ${(data.analysis?.final_score || 0).toFixed(2)}/10`,
            'success'
          )
          setCleanCodeScore(data.analysis?.final_score || 0)
          // Reload history setelah analisis baru
          loadHistory()
        } else {
          showAlertMessage('✅ Analisis selesai!', 'success')
          setCleanCodeScore(data.analysis?.final_score || 0)
          setLastAnalysisTime(new Date().toISOString())
        }
      } else {
        showAlertMessage('❌ Analisis gagal: ' + (data.error || 'Unknown error'), 'error')
      }
    } catch (error) {
      showAlertMessage('🌐 Network error. Silakan coba lagi.', 'error')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleClear = () => {
    if (confirm('🗑️ Yakin ingin menghapus semua kode?')) {
      setCode('')
      setOutput('')
      setExecutionTime('')
      setAnalysis(null)
      setShowAnalysis(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'from-green-400 to-green-500'
    if (score >= 7) return 'from-purple-400 to-purple-500'
    if (score >= 5) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-red-500'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 9) return '🏆'
    if (score >= 7) return '⭐'
    if (score >= 5) return '👍'
    return '💪'
  }

  const getScoreMessage = (score: number) => {
    if (score >= 9) return 'Luar Biasa!'
    if (score >= 7) return 'Bagus Sekali!'
    if (score >= 5) return 'Cukup Baik'
    return 'Terus Belajar!'
  }

  // Format tanggal untuk riwayat
  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays < 7) return `${diffDays} hari lalu`
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Hitung statistik dari riwayat
  const getHistoryStats = () => {
    if (history.length === 0) return { avg: 0, highest: 0, lowest: 0, total: 0, trend: 'stable' }
    
    const scores = history.map(h => h.clean_code_score || 0)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    
    // Hitung trend (bandingkan 5 terakhir dengan 5 sebelumnya)
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (history.length >= 2) {
      const recent = scores.slice(0, Math.min(5, scores.length))
      const older = scores.slice(Math.min(5, scores.length), Math.min(10, scores.length))
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
        if (recentAvg > olderAvg + 0.5) trend = 'up'
        else if (recentAvg < olderAvg - 0.5) trend = 'down'
      }
    }
    
    return { avg, highest, lowest, total: history.length, trend }
  }

  // Load kode dari riwayat ke editor
  const loadFromHistory = (entry: HistoryEntry) => {
    if (confirm('📝 Muat kode dari riwayat ini ke editor? Kode saat ini akan diganti.')) {
      setCode(entry.code)
      if (entry.analysis_result) {
        setAnalysis(entry.analysis_result)
        setShowAnalysis(true)
        setActiveTab('analysis')
      }
      setShowHistoryModal(false)
      showAlertMessage('✅ Kode berhasil dimuat dari riwayat!', 'success')
    }
  }

  // Middleware handles auth - just render the page
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-white'
    }`}>
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelLogout}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-200'
          }`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Logout?</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Apakah kamu yakin ingin keluar dari aplikasi?</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={cancelLogout}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  ❌ Tidak
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  ✅ Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHistoryModal(false)}
          ></div>
          <div className={`relative rounded-2xl border shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            {/* Header */}
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700 bg-purple-600/20' : 'border-purple-100 bg-purple-50'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">📜</span>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Riwayat Clean Code</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Pantau perkembangan nilai clean code kamu</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className={`text-2xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ✕
                </button>
              </div>
              
              {/* Stats Summary */}
              {history.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Submit</p>
                    <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{getHistoryStats().total}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rata-rata</p>
                    <p className="text-xl font-bold text-purple-500">{getHistoryStats().avg.toFixed(2)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Tertinggi</p>
                    <p className="text-xl font-bold text-green-500">{getHistoryStats().highest.toFixed(2)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Terendah</p>
                    <p className="text-xl font-bold text-red-500">{getHistoryStats().lowest.toFixed(2)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Trend</p>
                    <p className="text-xl font-bold">
                      {getHistoryStats().trend === 'up' && <span className="text-green-500">📈 Naik</span>}
                      {getHistoryStats().trend === 'down' && <span className="text-red-500">📉 Turun</span>}
                      {getHistoryStats().trend === 'stable' && <span className="text-yellow-500">➡️ Stabil</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-5xl animate-bounce">📊</div>
                  <p className={`mt-4 ${theme === 'dark' ? 'text-white' : 'text-slate-600'}`}>Memuat riwayat...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Belum ada riwayat</p>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Klik "Analyze" untuk mulai menganalisis kode</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                        selectedHistory?.id === entry.id 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : theme === 'dark' ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' : 'bg-purple-50 border-purple-100 hover:border-purple-300'
                      }`}
                      onClick={() => setSelectedHistory(selectedHistory?.id === entry.id ? null : entry)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Rank Badge */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                            index === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' :
                            index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            #{index + 1}
                          </div>
                          
                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                Score: {(entry.clean_code_score || 0).toFixed(2)}/10
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                (entry.clean_code_score || 0) >= 8 ? 'bg-green-500/30 text-green-300' :
                                (entry.clean_code_score || 0) >= 6 ? 'bg-purple-500/30 text-purple-300' :
                                (entry.clean_code_score || 0) >= 4 ? 'bg-yellow-500/30 text-yellow-300' :
                                'bg-red-500/30 text-red-300'
                              }`}>
                                {entry.grade || `${(entry.clean_code_score || 0).toFixed(2)}/10`}
                              </span>
                            </div>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatHistoryDate(entry.submitted_at)}
                            </p>
                          </div>
                        </div>

                        {/* Score Visual */}
                        <div className="flex items-center gap-3">
                          <div className={`w-24 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                (entry.clean_code_score || 0) >= 8 ? 'bg-green-500' :
                                (entry.clean_code_score || 0) >= 6 ? 'bg-purple-500' :
                                (entry.clean_code_score || 0) >= 4 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${((entry.clean_code_score || 0) / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-2xl">
                            {(entry.clean_code_score || 0) >= 8 ? '🏆' :
                             (entry.clean_code_score || 0) >= 6 ? '⭐' :
                             (entry.clean_code_score || 0) >= 4 ? '👍' : '💪'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {selectedHistory?.id === entry.id && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          {/* Code Preview */}
                          <div className="mb-3">
                            <p className="text-xs text-slate-400 mb-1">Preview Kode:</p>
                            <pre className="bg-slate-900/50 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-32 overflow-y-auto">
                              {entry.code.slice(0, 500)}{entry.code.length > 500 ? '...' : ''}
                            </pre>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                loadFromHistory(entry)
                              }}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-500 hover:from-purple-600 hover:to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                            >
                              📝 Muat ke Editor
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(entry.code)
                                showAlertMessage('📋 Kode disalin ke clipboard!', 'success')
                              }}
                              className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg text-sm transition-all"
                            >
                              📋 Salin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-purple-100 bg-purple-50'}`}>
              <div className="flex justify-between items-center">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  💡 Klik item untuk melihat detail dan memuat kode ke editor
                </p>
                <button
                  onClick={() => {
                    loadHistory()
                    showAlertMessage('🔄 Riwayat diperbarui!', 'success')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '⭐', '🎊', '✨', '🏆'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Animated Background - only in dark mode */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative border-b transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100 shadow-sm'}`}>
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-600 text-white p-3 rounded-xl shadow-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-purple-700'}`}>
                  Python Compiler
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}`}>
                  Clean Code Analyzer • PEP 8 • Pylint
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Link to Materials Page */}
              <a
                href="/siswa/materi"
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
              >
                📚 Materi
              </a>

              {/* Link to Leaderboard Page */}
              <a
                href="/siswa/leaderboard"
                className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${theme === 'dark' ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}
              >
                🏆 Leaderboard
              </a>

              {/* History Button */}
              <button
                onClick={() => setShowHistoryModal(true)}
                className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
              >
                📜 Riwayat
                {history.length > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>

              {/* Clean Code Score Badge with Timestamp */}
              <div className="bg-gradient-to-r from-green-500 to-purple-500 px-4 py-2 rounded-xl shadow-lg shadow-purple-500/30">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="text-xs text-green-100">Clean Code Score</p>
                    <p className="text-lg font-bold text-white">{cleanCodeScore.toFixed(2)}/10</p>
                  </div>
                  {lastAnalysisTime && (
                    <div className="border-l border-white/30 pl-3 ml-1">
                      <p className="text-xs text-green-100">Terakhir</p>
                      <p className="text-xs font-medium text-white">
                        {new Date(lastAnalysisTime).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        {new Date(lastAnalysisTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <a
                href="/siswa/profile"
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
              >
                <div className="text-right">
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Siswa</p>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </a>

              <button
                onClick={confirmLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all duration-300"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Alert Messages */}
        {alert && (
          <div
            className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-500 ${
              alert.type === 'success'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : alert.type === 'error'
                ? 'bg-gradient-to-r from-red-500 to-purple-600 text-white'
                : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <p className="font-medium">{alert.message}</p>
              <button onClick={() => setAlert(null)} className="hover:opacity-70">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Code Editor (Left - 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Editor Card */}
            <div className={`rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <div className={`flex justify-between items-center px-6 py-4 border-b ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-purple-50 border-purple-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    📝 Code Editor
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExecute}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-semibold"
                  >
                    {loading ? '⏳ Running...' : '▶️ Run'}
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analysisLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-semibold"
                  >
                    {analysisLoading ? '⏳ Analyzing...' : '📊 Analyze'}
                  </button>
                  <button
                    onClick={handleClear}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-slate-700'}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className={`relative ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-800'}`}>
                <div
                  ref={gutterRef}
                  className="absolute left-0 top-0 bottom-0 w-12 bg-slate-700/50 text-slate-500 text-sm leading-6 border-r border-slate-600 overflow-hidden select-none text-right px-2 py-4"
                >
                  <pre
                    className="m-0"
                    style={{
                      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                    }}
                  >
                    {lineNumbers.join('\n')}
                  </pre>
                </div>
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={syncGutterScroll}
                  placeholder="# ✨ Tulis kode Python di sini..."
                  className="w-full h-[400px] pl-16 pr-4 py-4 font-mono text-sm focus:outline-none bg-transparent text-green-400 leading-6 resize-none"
                  spellCheck={false}
                  style={{
                    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                    caretColor: '#22c55e',
                  }}
                />
              </div>
            </div>

            {/* Output/Analysis Tabs */}
            <div className={`rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all duration-300 ${
                    activeTab === 'output'
                      ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  💻 Output Console
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all duration-300 ${
                    activeTab === 'analysis'
                      ? 'bg-purple-500/20 text-purple-500 border-b-2 border-purple-500'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📊 Analysis Result
                </button>
              </div>

              <div className="p-4 min-h-[200px]">
                {activeTab === 'output' ? (
                  <div className="bg-black rounded-xl p-4 font-mono text-sm min-h-[180px] max-h-[300px] overflow-auto border border-slate-700">
                    {loading ? (
                      <div className="flex items-center gap-3 text-yellow-400">
                        <div className="animate-spin">⚙️</div>
                        <span>Menjalankan kode...</span>
                      </div>
                    ) : output ? (
                      <pre className="whitespace-pre-wrap text-green-400">{output}</pre>
                    ) : (
                      <div className="text-slate-400 flex items-center gap-2">
                        <span>🚀</span> Klik "Run" untuk menjalankan kode
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {analysisLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-6xl animate-bounce">🔍</div>
                        <p className={`mt-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Menganalisis kode...</p>
                      </div>
                    ) : showAnalysis && analysis ? (
                      <div className="space-y-4">
                        {/* Score Display */}
                        <div className={`bg-gradient-to-r ${getScoreColor(analysis.final_score)} p-6 rounded-xl text-white`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-80">Clean Code Score</p>
                              <p className="text-4xl font-bold">{analysis.final_score.toFixed(2)}/10</p>
                              <p className="text-lg mt-1">{getScoreMessage(analysis.final_score)}</p>
                            </div>
                            <div className="text-6xl">{getScoreEmoji(analysis.final_score)}</div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-purple-500/20 border-purple-500/30' : 'bg-purple-100 border-purple-200'}`}>
                            <p className={`text-sm ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>Meaningful Names</p>
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{Math.round(analysis.breakdown.meaningful_names.score)}%</p>
                          </div>
                          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-green-500/20 border-green-500/30' : 'bg-green-100 border-green-200'}`}>
                            <p className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>No Duplication</p>
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{Math.round(analysis.breakdown.code_duplication.score)}%</p>
                          </div>
                          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-purple-500/20 border-purple-500/30' : 'bg-purple-100 border-purple-200'}`}>
                            <p className={`text-sm ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>Code Quality</p>
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{Math.round(analysis.breakdown.code_quality.score)}%</p>
                          </div>
                        </div>

                        {/* Suggestions - Area lebih besar dan scrollable */}
                        {analysis.suggestions.length > 0 && (
                          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                              💡 Saran Perbaikan:
                              <span className={`text-xs font-normal ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>(scroll untuk melihat semua)</span>
                            </h4>
                            <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                              <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {analysis.suggestions.map((s, i) => {
                                  // Deteksi jenis baris untuk styling berbeda
                                  const isHeader = s.includes('TEMUAN') || s.includes('TIPS') || s.includes('PESAN') || s.includes('LUAR BIASA')
                                  const isSeparator = s.startsWith('━') || s.startsWith('─') || s === ''
                                  const isSubItem = s.startsWith('   ')
                                  const isEmoji = s.match(/^[🔴1️⃣2️⃣3️⃣🔗📝📦💬📚💡✅🎉📊📋🔴🟡🟠🟢]/)
                                  
                                  if (isSeparator && s === '') {
                                    return <li key={i} className="h-2"></li>
                                  }
                                  if (isSeparator) {
                                    return <li key={i} className={`border-t my-2 ${theme === 'dark' ? 'border-slate-600' : 'border-yellow-300'}`}></li>
                                  }
                                  
                                  return (
                                    <li key={i} className={`
                                      ${isHeader ? (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700') + ' font-semibold mt-3 text-base' : ''}
                                      ${isSubItem ? 'pl-4 ' + (theme === 'dark' ? 'text-slate-400' : 'text-slate-500') : ''}
                                      ${isEmoji && !isHeader ? (theme === 'dark' ? 'text-white' : 'text-slate-800') : ''}
                                      flex items-start gap-2
                                    `}>
                                      {!isHeader && !isSubItem && !isSeparator && (
                                        <span className="text-yellow-500 flex-shrink-0">→</span>
                                      )}
                                      <span className="whitespace-pre-wrap break-words">{isSubItem ? s.trim() : s}</span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <span className="text-6xl mb-4">📊</span>
                        <p>Klik "Analyze" untuk mendapatkan skor clean code</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {executionTime && activeTab === 'output' && (
                <div className="px-4 pb-4">
                  <span className="text-sm text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
                    {executionTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Progress Chart Mini */}
            {history.length > 0 && (
              <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    📈 Progress Terbaru
                  </h3>
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="text-xs text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Lihat Semua →
                  </button>
                </div>
                
                {/* Mini Chart */}
                <div className="flex items-end gap-1 h-20 mb-3">
                  {history.slice(0, 10).reverse().map((entry, idx) => {
                    const score = entry.clean_code_score || 0
                    const height = Math.max(10, (score / 10) * 100)
                    return (
                      <div
                        key={entry.id}
                        className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
                        style={{ 
                          height: `${height}%`,
                          background: score >= 8 
                            ? 'linear-gradient(to top, #22c55e, #10b981)' 
                            : score >= 6 
                            ? 'linear-gradient(to top, #3b82f6, #06b6d4)'
                            : score >= 4
                            ? 'linear-gradient(to top, #eab308, #f97316)'
                            : 'linear-gradient(to top, #ef4444, #ec4899)'
                        }}
                        title={`${score.toFixed(2)}/10 - ${formatHistoryDate(entry.submitted_at)}`}
                      />
                    )
                  })}
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className={`rounded-lg p-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-purple-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rata-rata</p>
                    <p className="text-lg font-bold text-purple-600">{getHistoryStats().avg.toFixed(1)}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-green-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Tertinggi</p>
                    <p className="text-lg font-bold text-green-600">{getHistoryStats().highest.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                🎯 Target Hari Ini
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}>Skor Minimum</span>
                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>7/10</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-purple-100'}`}>
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  💪 Raih skor 7+ untuk mendapatkan kategori score Good!
                </p>
              </div>
            </div>

            {/* Tips Card */}
            <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                📚 Tips Clean Code
              </h3>
              <ul className="space-y-3 text-sm">
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Gunakan nama variabel yang deskriptif</span>
                </li>
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Fungsi harus kecil dan fokus</span>
                </li>
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Ikuti PEP 8 style guide</span>
                </li>
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Tambahkan docstring pada fungsi</span>
                </li>
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Hindari duplikasi kode</span>
                </li>
                <li className={`flex items-start gap-3 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  <span className="text-green-500 text-lg">✓</span>
                  <span>Max 79 karakter per baris</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
