'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
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
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [userName, setUserName] = useState('Siswa')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 p-3 rounded-xl shadow-lg">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Materi Pembelajaran</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>C3-Py Clean Code Analyzer</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/siswa/compiler"
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
              >
                💻 Compiler
              </Link>
              <Link
                href="/siswa/leaderboard"
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 rounded-xl font-medium transition-all flex items-center gap-2 border border-amber-500/30"
              >
                🏆 Leaderboard
              </Link>
              <Link href="/siswa/profile" className={`flex items-center gap-3 px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-purple-100 text-purple-700'}`}>
                <span className="text-2xl">👨‍🎓</span>
                <span className="font-medium">{userName}</span>
              </Link>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl transition-all"
                title="Logout"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header & Search */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📖 Materi dari Guru</h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Pelajari materi yang telah disiapkan oleh guru untuk meningkatkan kemampuan coding kamu</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
              <input
                type="text"
                placeholder="Cari materi..."
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
              <option value="all" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>Semua Kategori</option>
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
            <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Memuat materi...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-6xl mb-4">📭</div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Belum Ada Materi</h3>
            <p className={theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}>
              {searchTerm || selectedCategory !== 'all' 
                ? 'Tidak ada materi yang cocok dengan pencarian Anda' 
                : 'Guru belum mengupload materi pembelajaran'}
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
                      👁️ Lihat Materi
                    </a>
                    <a
                      href={material.file_url}
                      download={material.file_name}
                      className={`py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
                      title="Download"
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
              Menampilkan {filteredMaterials.length} dari {materials.length} materi
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
