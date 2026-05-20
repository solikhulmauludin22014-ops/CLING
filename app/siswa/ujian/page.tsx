'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import ThemeToggle from '@/components/ThemeToggle'

type ExamStatus = {
  activeExamId: string | null
  pretest: {
    id: string | null
    is_active: boolean
    done: boolean
  }
  posttest: {
    id: string | null
    is_active: boolean
    done: boolean
    unlocked: boolean
    materials: {
      done: number
      total: number
    }
  }
}

const translations = {
  id: {
    title: 'Ujian Clean Code',
    subtitle: 'Pretest dan Posttest untuk mengukur kemajuan',
    navMenu: 'Menu Navigasi',
    navCompiler: 'Compiler',
    navMaterials: 'Materi',
    navLeaderboard: 'Leaderboard',
    navExam: 'Ujian',
    navProfile: 'Profil',
    logout: 'Keluar',
    logoutTitle: 'Keluar?',
    logoutCancel: 'Batal',
    roleStudent: 'Siswa',
    activeExam: 'Ada ujian yang sedang berjalan',
    continueExam: 'Lanjutkan Ujian',
    pretestTitle: 'Pretest',
    posttestTitle: 'Posttest',
    available: 'Tersedia',
    notAvailable: 'Belum tersedia',
    completed: 'Sudah selesai',
    locked: 'Terkunci',
    startExam: 'Mulai Ujian',
    startPretest: 'Mulai Pretest',
    startPosttest: 'Mulai Posttest',
    requirements: 'Syarat Posttest',
    requirementPretest: 'Selesaikan pretest terlebih dahulu.',
    requirementMaterials: 'Selesaikan semua materi pembelajaran.',
    materialsProgress: 'Progress materi',
    loading: 'Memuat status ujian...',
    refresh: 'Refresh',
    failed: 'Gagal memuat status ujian.',
  },
  en: {
    title: 'Clean Code Exams',
    subtitle: 'Pretest and posttest to measure progress',
    navMenu: 'Navigation Menu',
    navCompiler: 'Compiler',
    navMaterials: 'Materials',
    navLeaderboard: 'Leaderboard',
    navExam: 'Exams',
    navProfile: 'Profile',
    logout: 'Logout',
    logoutTitle: 'Logout?',
    logoutCancel: 'Cancel',
    roleStudent: 'Student',
    activeExam: 'You have an active exam in progress',
    continueExam: 'Continue Exam',
    pretestTitle: 'Pretest',
    posttestTitle: 'Posttest',
    available: 'Available',
    notAvailable: 'Not available',
    completed: 'Completed',
    locked: 'Locked',
    startExam: 'Start Exam',
    startPretest: 'Start Pretest',
    startPosttest: 'Start Posttest',
    requirements: 'Posttest Requirements',
    requirementPretest: 'Finish the pretest first.',
    requirementMaterials: 'Complete all learning materials.',
    materialsProgress: 'Materials progress',
    loading: 'Loading exam status...',
    refresh: 'Refresh',
    failed: 'Failed to load exam status.',
  },
}

export default function SiswaUjianPage() {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const t = (key: keyof typeof translations['id']) => translations[language][key]
  const [userName, setUserName] = useState('Siswa')
  const [status, setStatus] = useState<ExamStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setShowNavMenu(true)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, full_name')
          .eq('id', session.user.id)
          .single()

        if (profile?.full_name || profile?.name) {
          setUserName(profile.full_name || profile.name)
        }
      }

      const response = await fetch('/api/exams/status')
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || t('failed'))
      }

      const data = await response.json()
      setStatus(data as ExamStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('failed')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const renderStatusBadge = (label: string, color: string) => (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )

  const pretestAvailable = Boolean(status?.pretest?.id) && Boolean(status?.pretest?.is_active)
  const pretestDone = Boolean(status?.pretest?.done)
  const posttestAvailable = Boolean(status?.posttest?.id) && Boolean(status?.posttest?.is_active)
  const posttestDone = Boolean(status?.posttest?.done)
  const posttestUnlocked = Boolean(status?.posttest?.unlocked)

  const materialsDone = status?.posttest?.materials?.done ?? 0
  const materialsTotal = status?.posttest?.materials?.total ?? 0

  const posttestNeedsPretest = !pretestDone
  const posttestNeedsMaterials = materialsTotal > 0 && materialsDone < materialsTotal

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('logoutTitle')}</div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('logout')}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowLogoutModal(false)} className={`px-6 py-3 rounded-xl font-semibold transition-all ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-slate-800'}`}>
                  {t('logoutCancel')}
                </button>
                <button onClick={handleLogout} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30">
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className={`relative z-50 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowNavMenu((prev) => !prev)}
                className={`p-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  showNavMenu ? 'rotate-90' : 'rotate-0'
                } ${theme === 'dark' ? 'bg-emerald-900/85 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/40' : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'}`}
                aria-label={t('navMenu')}
              >
                {showNavMenu ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              <div className="bg-purple-600 p-3 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-8-9h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('title')}</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {showNavMenu && (
        <button
          onClick={() => setShowNavMenu(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label={t('navMenu')}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 max-w-[88vw] pt-24 px-4 pb-4 border-r shadow-xl transition-all duration-300 transform ${
          showNavMenu ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'
        } ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}
      >
        <div className={`h-full rounded-2xl border p-3 overflow-y-auto ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-purple-100'}`}>
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wide px-2 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
              {t('navMenu')}
            </p>

            <Link
              href="/siswa/compiler"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}
            >
              {t('navCompiler')}
            </Link>

            <Link
              href="/siswa/materi"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
            >
              {t('navMaterials')}
            </Link>

            <Link
              href="/siswa/ujian"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/30' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}
            >
              {t('navExam')}
            </Link>

            <Link
              href="/siswa/leaderboard"
              className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${theme === 'dark' ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}
            >
              {t('navLeaderboard')}
            </Link>

            <Link
              href="/siswa/profile"
              className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
            >
              <div>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t('roleStudent')}</p>
              </div>
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            </Link>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all duration-300 text-left"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${showNavMenu ? 'lg:ml-72' : 'lg:ml-0'}`}>
        <main className="relative max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('title')}</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>{t('subtitle')}</p>
            </div>
            <button
              onClick={loadData}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200'}`}
            >
              {t('refresh')}
            </button>
          </div>

          {status?.activeExamId && (
            <div className={`mb-6 rounded-2xl p-5 border shadow-lg ${theme === 'dark' ? 'bg-purple-900/30 border-purple-700/30' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`}>{t('activeExam')}</p>
                  <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('continueExam')}</p>
                </div>
                <Link
                  href={`/exams/${status.activeExamId}`}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
                >
                  {t('continueExam')}
                </Link>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-300 border-t-purple-600"></div>
              <p className={`mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('loading')}</p>
            </div>
          ) : error ? (
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('pretestTitle')}</h3>
                  {pretestDone
                    ? renderStatusBadge(t('completed'), theme === 'dark' ? 'bg-green-500/20 text-green-200' : 'bg-green-100 text-green-700')
                    : pretestAvailable
                    ? renderStatusBadge(t('available'), theme === 'dark' ? 'bg-purple-500/20 text-purple-200' : 'bg-purple-100 text-purple-700')
                    : renderStatusBadge(t('notAvailable'), theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}
                </div>

                <p className={`text-sm mb-5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('startPretest')}
                </p>

                {pretestAvailable && !pretestDone && status?.pretest?.id ? (
                  <Link
                    href={`/exams/${status.pretest.id}`}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
                  >
                    {t('startPretest')}
                  </Link>
                ) : (
                  <button
                    disabled
                    className={`px-5 py-2 rounded-xl font-semibold cursor-not-allowed ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {pretestDone ? t('completed') : t('notAvailable')}
                  </button>
                )}
              </div>

              <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('posttestTitle')}</h3>
                  {posttestDone
                    ? renderStatusBadge(t('completed'), theme === 'dark' ? 'bg-green-500/20 text-green-200' : 'bg-green-100 text-green-700')
                    : posttestAvailable && posttestUnlocked
                    ? renderStatusBadge(t('available'), theme === 'dark' ? 'bg-purple-500/20 text-purple-200' : 'bg-purple-100 text-purple-700')
                    : renderStatusBadge(t('locked'), theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}
                </div>

                <div className={`rounded-xl p-4 mb-5 ${theme === 'dark' ? 'bg-slate-700/60' : 'bg-purple-50'}`}>
                  <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>{t('requirements')}</p>
                  {posttestNeedsPretest && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('requirementPretest')}</p>
                  )}
                  {posttestNeedsMaterials && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t('requirementMaterials')}
                    </p>
                  )}
                  {materialsTotal > 0 && (
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t('materialsProgress')}: {materialsDone}/{materialsTotal}
                    </p>
                  )}
                </div>

                {posttestAvailable && posttestUnlocked && !posttestDone && status?.posttest?.id ? (
                  <Link
                    href={`/exams/${status.posttest.id}`}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
                  >
                    {t('startPosttest')}
                  </Link>
                ) : (
                  <button
                    disabled
                    className={`px-5 py-2 rounded-xl font-semibold cursor-not-allowed ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {posttestDone ? t('completed') : posttestAvailable ? t('locked') : t('notAvailable')}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
