'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

interface LeaderboardEntry {
  rank: number
  student_id: string
  name: string
  avatar_url: string | null
  total_points: number
  total_submissions: number
  average_score: number
  highest_score: number
  kelas: string | null
  updated_at: string
}

export default function SiswaLeaderboardPage() {
  const { theme } = useTheme()
  const [userName, setUserName] = useState('Siswa')
  const [userId, setUserId] = useState('')
  const [userKelas, setUserKelas] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    loadUserAndLeaderboard()
  }, [])

  const loadUserAndLeaderboard = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUserId(session.user.id)
        
        // Get user profile with kelas
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, full_name, kelas')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUserName(profile.full_name || profile.name || 'Siswa')
          setUserKelas(profile.kelas || '')
          
          // Load leaderboard filtered by kelas
          if (profile.kelas) {
            await loadLeaderboard(profile.kelas, session.user.id)
          } else {
            // If no kelas, load all
            await loadLeaderboard('', session.user.id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async (kelas: string, currentUserId: string) => {
    try {
      const url = kelas 
        ? `/api/leaderboard?kelas=${encodeURIComponent(kelas)}`
        : '/api/leaderboard'
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.leaderboard || [])
        
        // Find current user in leaderboard
        const userEntry = data.leaderboard?.find(
          (entry: LeaderboardEntry) => entry.student_id === currentUserId
        )
        setCurrentUserRank(userEntry || null)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'from-yellow-400 to-amber-500', text: 'text-yellow-100' }
    if (rank === 2) return { emoji: '🥈', color: 'from-slate-300 to-slate-400', text: 'text-slate-100' }
    if (rank === 3) return { emoji: '🥉', color: 'from-orange-400 to-amber-600', text: 'text-orange-100' }
    return { emoji: `#${rank}`, color: 'from-purple-500 to-purple-600', text: 'text-purple-100' }
  }

  const getGrade = (score: number) => {
    if (score >= 9) return { grade: 'A+', color: 'text-green-400' }
    if (score >= 8) return { grade: 'A', color: 'text-green-400' }
    if (score >= 7) return { grade: 'B+', color: 'text-purple-400' }
    if (score >= 6) return { grade: 'B', color: 'text-purple-400' }
    if (score >= 5) return { grade: 'C', color: 'text-yellow-400' }
    return { grade: 'D', color: 'text-red-400' }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <div className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Memuat leaderboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Logout?</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Apakah Anda yakin ingin keluar?</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowLogoutModal(false)} className={`px-6 py-3 rounded-xl font-semibold transition-all ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-slate-800'}`}>
                  ❌ Tidak
                </button>
                <button onClick={handleLogout} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30">
                  ✅ Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background - Dark mode only */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-3 rounded-xl shadow-lg">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Leaderboard</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  {userKelas ? `Peringkat Kelas ${userKelas}` : 'Peringkat Semua Siswa'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/siswa/materi" className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}>
                📚 Materi
              </Link>
              <Link href="/siswa/compiler" className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}>
                💻 Compiler
              </Link>
              <Link href="/siswa/profile" className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}>
                👤 Profil
              </Link>
              <button onClick={() => setShowLogoutModal(true)} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl transition-all" title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {/* User Stats Card */}
        {currentUserRank && (
          <div className={`mb-8 rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-purple-900/30 border-purple-700/30' : 'bg-purple-50 border-purple-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getRankBadge(currentUserRank.rank).color} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                  {currentUserRank.rank <= 3 ? getRankBadge(currentUserRank.rank).emoji : currentUserRank.rank}
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Peringkat Kamu</p>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>#{currentUserRank.rank} dari {leaderboard.length} siswa</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-amber-500">{currentUserRank.total_points}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Total Poin</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-500">{currentUserRank.total_submissions}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Submissions</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${getGrade(currentUserRank.highest_score).color}`}>
                    {currentUserRank.highest_score.toFixed(1)}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Skor Tertinggi</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="mb-8">
            <h3 className={`text-xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>🌟 Top 3 Terbaik</h3>
            <div className="flex justify-center items-end gap-4">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 flex items-center justify-center text-4xl shadow-lg border-4 border-slate-200">
                    {leaderboard[1].avatar_url ? (
                      <img src={leaderboard[1].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{leaderboard[1].name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute -top-2 -right-2 text-2xl">🥈</div>
                </div>
                <div className="mt-2 bg-gradient-to-b from-slate-400 to-slate-500 rounded-t-lg px-6 py-4 text-center h-24">
                  <p className="text-white font-semibold truncate max-w-24">{leaderboard[1].name}</p>
                  <p className="text-slate-200 text-sm">{leaderboard[1].total_points} pts</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-5xl shadow-lg border-4 border-yellow-300 animate-pulse">
                    {leaderboard[0].avatar_url ? (
                      <img src={leaderboard[0].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{leaderboard[0].name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute -top-3 -right-3 text-3xl">🥇</div>
                </div>
                <div className="mt-2 bg-gradient-to-b from-yellow-500 to-amber-600 rounded-t-lg px-8 py-4 text-center h-32">
                  <p className="text-white font-bold truncate max-w-28">{leaderboard[0].name}</p>
                  <p className="text-yellow-100 text-lg font-semibold">{leaderboard[0].total_points} pts</p>
                  <p className="text-yellow-200 text-xs">👑 Juara 1</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-amber-600 flex items-center justify-center text-4xl shadow-lg border-4 border-orange-300">
                    {leaderboard[2].avatar_url ? (
                      <img src={leaderboard[2].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{leaderboard[2].name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute -top-2 -right-2 text-2xl">🥉</div>
                </div>
                <div className="mt-2 bg-gradient-to-b from-orange-500 to-amber-700 rounded-t-lg px-6 py-4 text-center h-20">
                  <p className="text-white font-semibold truncate max-w-24">{leaderboard[2].name}</p>
                  <p className="text-orange-100 text-sm">{leaderboard[2].total_points} pts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
          <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
            <h3 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              📊 Peringkat Lengkap
              {userKelas && (
                <span className={`text-sm font-normal px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                  Kelas {userKelas}
                </span>
              )}
            </h3>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Belum ada data leaderboard</p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Mulai submit kode untuk muncul di leaderboard!</p>
              <Link href="/siswa/compiler" className="inline-block mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all">
                💻 Buka Compiler
              </Link>
            </div>
          ) : (
            <div className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-purple-100'}`}>
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.student_id}
                  className={`p-4 flex items-center gap-4 transition-all ${
                    entry.student_id === userId 
                      ? (theme === 'dark' ? 'bg-purple-900/30 border-l-4 border-purple-400' : 'bg-purple-50 border-l-4 border-purple-500')
                      : (theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-purple-50/50')
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRankBadge(entry.rank).color} flex items-center justify-center text-lg font-bold text-white shadow-lg flex-shrink-0`}>
                    {entry.rank <= 3 ? getRankBadge(entry.rank).emoji : entry.rank}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        entry.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {entry.name}
                        {entry.student_id === userId && (
                          <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Kamu</span>
                        )}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{entry.total_submissions} submissions</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-amber-500 font-bold text-lg">{entry.total_points}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Poin</p>
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${getGrade(entry.average_score).color}`}>
                        {entry.average_score.toFixed(1)}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rata-rata</p>
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${getGrade(entry.highest_score).color}`}>
                        {entry.highest_score.toFixed(1)}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Tertinggi</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className={`mt-8 rounded-2xl p-6 border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-700/30' : 'bg-purple-50 border-purple-200'}`}>
          <h4 className={`font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            💡 Cara Meningkatkan Peringkat
          </h4>
          <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>
            <li>✅ Submit kode Python secara rutin untuk menambah poin</li>
            <li>✅ Ikuti prinsip Clean Code untuk mendapat skor tinggi</li>
            <li>✅ Gunakan nama variabel dan fungsi yang deskriptif</li>
            <li>✅ Tambahkan docstring pada setiap fungsi</li>
            <li>✅ Hindari duplikasi kode dengan membuat fungsi reusable</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
