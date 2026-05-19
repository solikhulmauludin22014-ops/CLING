'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import ThemeToggle from '@/components/ThemeToggle'

interface Material {
  id: string
  teacher_id: string
  teacher_name: string
  title: string
  description: string | null
  file_name: string
  file_url: string
  file_type: 'pdf' | 'ppt' | 'pptx'
  file_size: number
  category: string | null
  created_at: string
}

export default function SiswaMateriPage() {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const tr = (id: string, en: string) => (language === 'id' ? id : en)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [userName, setUserName] = useState('Siswa')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)

  // Get unique categories
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))]

  useEffect(() => {
    loadUserAndMaterials()
  }, [])

  const loadUserAndMaterials = async () => {
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

      // Load materials
      const response = await fetch('/api/materials')
      const data = await response.json()

      if (data.success) {
        setMaterials(data.materials)
      }
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return '📄'
      case 'ppt':
      case 'pptx':
        return '📊'
      default:
        return '📁'
    }
  }

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return 'from-red-500 to-red-600'
      case 'ppt':
      case 'pptx':
        return 'from-orange-500 to-orange-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = 
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Keluar?', 'Logout?')}</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{tr('Apakah Anda yakin ingin keluar?', 'Are you sure you want to logout?')}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowLogoutModal(false)} className={`px-6 py-3 rounded-xl font-semibold transition-all ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-slate-800'}`}>
                  {tr('❌ Tidak', '❌ No')}
                </button>
                <button onClick={handleLogout} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30">
                  {tr('✅ Ya, Keluar', '✅ Yes, Logout')}
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
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative z-50 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowNavMenu((prev) => !prev)}
                className={`p-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  showNavMenu ? 'rotate-90' : 'rotate-0'
                } ${theme === 'dark' ? 'bg-emerald-900/85 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/40' : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'}`}
                aria-label={tr('Buka menu navigasi', 'Toggle navigation menu')}
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
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Materi Pembelajaran', 'Learning Materials')}</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>C3-Py Clean Code Analyzer</p>
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
          aria-label={tr('Tutup menu navigasi', 'Close navigation menu')}
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
              {tr('Menu Navigasi', 'Navigation Menu')}
            </p>

            <Link
              href="/siswa/compiler"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}
            >
              💻 {tr('Compiler', 'Compiler')}
            </Link>

            <Link
              href="/siswa/materi"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
            >
              📚 {tr('Materi', 'Materials')}
            </Link>

            <Link
              href="/siswa/leaderboard"
              className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${theme === 'dark' ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}
            >
              🏆 {tr('Leaderboard', 'Leaderboard')}
            </Link>

            <Link
              href="/siswa/profile"
              className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
            >
              <div>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{tr('Siswa', 'Student')}</p>
              </div>
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            </Link>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all duration-300 text-left"
            >
              🚪 {tr('Keluar', 'Logout')}
            </button>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${showNavMenu ? 'lg:ml-72' : 'lg:ml-0'}`}>
      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header & Search */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📖 {tr('Materi dari Guru', 'Materials from Teachers')}</h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{tr('Pelajari materi yang telah disiapkan oleh guru untuk meningkatkan kemampuan coding kamu', 'Study the materials prepared by teachers to improve your coding skills')}</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
              <input
                type="text"
                placeholder={tr('Cari materi...', 'Search materials...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-500'}`}
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
            >
              <option value="all" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>{tr('Semua Kategori', 'All Categories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat!} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl animate-bounce mb-4">📚</div>
            <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Memuat materi...', 'Loading materials...')}</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-6xl mb-4">📭</div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Belum Ada Materi', 'No Materials Yet')}</h3>
            <p className={theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}>
              {searchTerm || selectedCategory !== 'all' 
                ? tr('Tidak ada materi yang cocok dengan pencarian Anda', 'No materials match your search') 
                : tr('Guru belum mengupload materi pembelajaran', 'Teachers have not uploaded any materials yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 group ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-purple-500' : 'bg-white border-purple-100 hover:border-purple-400 shadow-sm'}`}
              >
                {/* File Type Header */}
                <div className={`bg-gradient-to-r ${getFileColor(material.file_type)} p-4`}>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{getFileIcon(material.file_type)}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-medium uppercase">
                      {material.file_type}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className={`text-lg font-bold mb-2 line-clamp-2 transition-colors ${theme === 'dark' ? 'text-white group-hover:text-purple-300' : 'text-slate-800 group-hover:text-purple-600'}`}>
                    {material.title}
                  </h3>
                  
                  {material.description && (
                    <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      {material.description}
                    </p>
                  )}

                  <div className={`space-y-2 text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-2">
                      <span>👨‍🏫</span>
                      <span>{material.teacher_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(material.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📦</span>
                      <span>{formatFileSize(material.file_size)}</span>
                    </div>
                    {material.category && (
                      <div className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span className={`px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          {material.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-semibold text-center transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                    >
                      👁️ {tr('Lihat Materi', 'View Material')}
                    </a>
                    <a
                      href={material.file_url}
                      download={material.file_name}
                      className={`py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
                      title={tr('Download', 'Download')}
                    >
                      ⬇️
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {materials.length > 0 && (
          <div className={`mt-8 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <p>
              {tr(`Menampilkan ${filteredMaterials.length} dari ${materials.length} materi`, `Showing ${filteredMaterials.length} of ${materials.length} materials`)}
            </p>
          </div>
        )}
      </main>
      </div>
    </div>
  )
}
