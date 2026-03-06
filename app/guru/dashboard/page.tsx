'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { useTheme } from '@/lib/context/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

interface StudentData {
  id: string
  name: string
  email: string
  nis: string
  kelas: string
  total_submissions: number
  total_points: number
  average_score: number
  highest_score: number
  latest_submission: string | null
  // Daily score (resets every day for statistical analysis)
  daily_score: number
  daily_submissions: number
  daily_highest_score: number
}

interface ClassStats {
  total_students: number
  total_submissions: number
  class_average: number
  highest_score: number
}

interface Material {
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

export default function GuruDashboard() {
  const { theme } = useTheme()
  const [userName, setUserName] = useState('Guru')
  const [userId, setUserId] = useState('')
  const [students, setStudents] = useState<StudentData[]>([])
  const [stats, setStats] = useState<ClassStats>({
    total_students: 0,
    total_submissions: 0,
    class_average: 0,
    highest_score: 0,
  })
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'students' | 'materials'>('students')
  
  // Material states
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'Umum',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null)
  const [deleteStudentLoading, setDeleteStudentLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKelas, setSelectedKelas] = useState<string>('all')
  const [selectedNIS, setSelectedNIS] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<string>('default')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Get unique kelas from students (exclude empty values)
  const kelasOptions = [...new Set(students.map(s => s.kelas).filter(k => k && k.trim() !== '' && k !== '-'))].sort()
  
  // Get unique NIS from students (exclude empty values)
  const nisOptions = [...new Set(students.map(s => s.nis).filter(n => n && n.trim() !== '' && n !== '-'))].sort()

  // Load data on mount - middleware handles auth
  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setUserId(session.user.id)
          
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
                           'Guru'
            setUserName(userName)
          }
        }
        
        // Load student data
        loadStudentData()
        loadMaterials()
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    
    loadUserAndData()
  }, [])

  const loadStudentData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/guru/students')
      const data = await response.json()

      if (data.success) {
        setStudents(data.students)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load student data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Material functions
  const loadMaterials = async () => {
    setMaterialsLoading(true)
    try {
      const response = await fetch('/api/materials')
      const data = await response.json()
      if (data.success) {
        setMaterials(data.materials)
      }
    } catch (error) {
      console.error('Failed to load materials:', error)
    } finally {
      setMaterialsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
      if (!allowedTypes.includes(file.type)) {
        alert('Format file tidak didukung. Hanya PDF, PPT, dan PPTX yang diperbolehkan.')
        return
      }
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal 50MB.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUploadMaterial = async () => {
    if (!selectedFile || !uploadForm.title.trim()) {
      alert('Judul dan file harus diisi!')
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', uploadForm.title)
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)

      setUploadProgress(30)

      const response = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(80)

      const data = await response.json()

      if (data.success) {
        setUploadProgress(100)
        // Reset form
        setUploadForm({ title: '', description: '', category: 'Umum' })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Reload materials
        loadMaterials()
        alert('Materi berhasil diupload!')
      } else {
        alert(data.error || 'Gagal mengupload materi')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Terjadi kesalahan saat mengupload materi')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const confirmDeleteMaterial = (material: Material) => {
    setMaterialToDelete(material)
    setShowDeleteModal(true)
  }

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return

    try {
      const response = await fetch(`/api/materials?id=${materialToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        loadMaterials()
        alert('Materi berhasil dihapus!')
      } else {
        alert(data.error || 'Gagal menghapus materi')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Terjadi kesalahan saat menghapus materi')
    } finally {
      setShowDeleteModal(false)
      setMaterialToDelete(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📕'
      case 'ppt':
      case 'pptx':
        return '📊'
      default:
        return '📄'
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

  // Delete student functions
  const confirmDeleteStudent = (student: StudentData) => {
    setStudentToDelete(student)
    setShowDeleteStudentModal(true)
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return

    setDeleteStudentLoading(true)
    try {
      const response = await fetch('/api/guru/delete-student', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentToDelete.id }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh data setelah hapus
        loadStudentData()
        alert(`Akun siswa "${studentToDelete.name}" berhasil dihapus!`)
      } else {
        alert(data.error || 'Gagal menghapus akun siswa')
      }
    } catch (error) {
      console.error('Delete student error:', error)
      alert('Terjadi kesalahan saat menghapus akun siswa')
    } finally {
      setDeleteStudentLoading(false)
      setShowDeleteStudentModal(false)
      setStudentToDelete(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100'
    if (score >= 6) return 'text-purple-600 bg-purple-100'
    if (score >= 4) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.kelas?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesKelas = selectedKelas === 'all' || student.kelas === selectedKelas
      const matchesNIS = selectedNIS === 'all' || student.nis === selectedNIS
      
      return matchesSearch && matchesKelas && matchesNIS
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'score-high':
          return b.highest_score - a.highest_score
        case 'score-low':
          return a.highest_score - b.highest_score
        case 'avg-high':
          return b.average_score - a.average_score
        case 'avg-low':
          return a.average_score - b.average_score
        default:
          return 0
      }
    })

  // Export to Excel function
  const downloadExcel = () => {
    // Get current date for daily score context
    const today = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    // Prepare data for Excel
    const excelData = filteredStudents.map((student, index) => ({
      'No': index + 1,
      'Nama Siswa': student.name,
      'Kelas': student.kelas,
      'NIS': student.nis,
      'Total Submissions': student.total_submissions,
      'Rata-rata Score': Number(student.average_score.toFixed(2)),
      'Score Tertinggi': Number(student.highest_score.toFixed(2)),
      'Persentase (%)': Number(((student.average_score / 10) * 100).toFixed(1)),
      // Daily/Real-time score (resets daily for statistical analysis)
      'Skor Hari Ini': Number((student.daily_score || 0).toFixed(2)),
      'Submissions Hari Ini': student.daily_submissions || 0,
      'Tertinggi Hari Ini': Number((student.daily_highest_score || 0).toFixed(2)),
      'Terakhir Analisis': student.latest_submission 
        ? new Date(student.latest_submission).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-',
    }))

    // Add summary row
    excelData.push({
      'No': '',
      'Nama Siswa': '',
      'Kelas': '',
      'NIS': '',
      'Total Submissions': '',
      'Rata-rata Score': '',
      'Score Tertinggi': '',
      'Persentase (%)': '',
      'Skor Hari Ini': '',
      'Submissions Hari Ini': '',
      'Tertinggi Hari Ini': '',
      'Terakhir Analisis': '',
    } as any)
    
    // Calculate daily stats summary
    const totalDailySubmissions = filteredStudents.reduce((sum, s) => sum + (s.daily_submissions || 0), 0)
    const studentsWithDailyScore = filteredStudents.filter(s => (s.daily_score || 0) > 0)
    const avgDailyScore = studentsWithDailyScore.length > 0 
      ? studentsWithDailyScore.reduce((sum, s) => sum + (s.daily_score || 0), 0) / studentsWithDailyScore.length
      : 0

    excelData.push({
      'No': '',
      'Nama Siswa': 'RINGKASAN KELAS',
      'Kelas': `${stats.total_students} Siswa`,
      'NIS': '',
      'Total Submissions': stats.total_submissions,
      'Rata-rata Score': Number(stats.class_average.toFixed(2)),
      'Score Tertinggi': Number(stats.highest_score.toFixed(2)),
      'Persentase (%)': Number(((stats.class_average / 10) * 100).toFixed(1)),
      'Skor Hari Ini': Number(avgDailyScore.toFixed(2)),
      'Submissions Hari Ini': totalDailySubmissions,
      'Tertinggi Hari Ini': '',
      'Terakhir Analisis': today,
    } as any)

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // No
      { wch: 25 },  // Nama
      { wch: 10 },  // Kelas
      { wch: 15 },  // NIS
      { wch: 12 },  // Submissions
      { wch: 12 },  // Rata-rata
      { wch: 12 },  // Tertinggi
      { wch: 12 },  // Persentase
      { wch: 15 },  // Skor Hari Ini
      { wch: 18 },  // Submissions Hari Ini
      { wch: 15 },  // Tertinggi Hari Ini
      { wch: 20 },  // Terakhir Analisis
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clean Code Progress')

    // Generate filename with date
    const fileDate = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
    const filename = `Laporan_Clean_Code_Siswa_${fileDate}.xlsx`

    // Download file
    XLSX.writeFile(workbook, filename)
  }

  // Middleware handles auth - just render the page
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelLogout}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Logout?</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Apakah Anda yakin ingin keluar dari aplikasi?</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={cancelLogout}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  ❌ Tidak
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  ✅ Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      {showDeleteModal && materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Hapus Materi?</h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Apakah Anda yakin ingin menghapus materi:</p>
              <p className="text-purple-600 font-semibold mb-6">&quot;{materialToDelete.title}&quot;</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  ❌ Batal
                </button>
                <button
                  onClick={handleDeleteMaterial}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  🗑️ Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {showDeleteStudentModal && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteStudentLoading && setShowDeleteStudentModal(false)}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Hapus Akun Siswa?</h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Apakah Anda yakin ingin menghapus akun siswa:</p>
              <div className={`mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-red-50'}`}>
                <p className="text-red-500 font-bold text-lg">{studentToDelete.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>NIS: {studentToDelete.nis} | Kelas: {studentToDelete.kelas}</p>
              </div>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                ⚠️ Semua data siswa termasuk submissions, skor, dan leaderboard akan dihapus permanen!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowDeleteStudentModal(false)}
                  disabled={deleteStudentLoading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  ❌ Batal
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={deleteStudentLoading}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  {deleteStudentLoading ? '⏳ Menghapus...' : '🗑️ Ya, Hapus Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background - Dark Mode Only */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative border-b shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-600 text-white p-3 rounded-xl shadow-lg shadow-purple-500/30">
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
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  👨‍🏫 Dashboard Guru
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  Monitor Progress Clean Code Siswa
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <a
                href="/guru/profile"
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
              >
                <div className="text-right">
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Guru</p>
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

      {/* Tab Navigation */}
      <div className="relative max-w-7xl mx-auto px-6 pt-6">
        <div className={`flex gap-2 p-2 rounded-2xl border w-fit ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-100'}`}>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-100'
            }`}
          >
            👥 Progress Siswa 
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'materials'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-100'
            }`}
          >
            📚 Materi Pembelajaran
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        
        {/* Students Tab Content */}
        {activeTab === 'students' && (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Total Siswa</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.total_students}
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl">
                👥
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-green-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}>Total Submissions</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.total_submissions}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl">
                📝
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-yellow-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>Rata-rata Skor</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.class_average.toFixed(1)}/10
                </p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl">
                📊
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Skor Tertinggi</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.highest_score.toFixed(1)}/10
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl">
                🏆
              </div>
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              📋 Progress Clean Code Siswa
            </h2>
          <div className="flex flex-wrap items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>🔍</span>
                <input
                  type="text"
                  placeholder="Cari nama, NIS, kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                />
              </div>
              
              {/* Filter Kelas */}
              <div className="relative">
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer pr-10 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                >
                  <option value="all" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>📚 Semua Kelas</option>
                  {kelasOptions.map((kelas) => (
                    <option key={kelas} value={kelas} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
                      🏫 {kelas}
                    </option>
                  ))}
                </select>
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>▼</span>
              </div>

              {/* Filter NIS */}
              <div className="relative">
                <select
                  value={selectedNIS}
                  onChange={(e) => setSelectedNIS(e.target.value)}
                  className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer pr-10 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                >
                  <option value="all" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>🔢 Semua NIS</option>
                  {nisOptions.map((nis) => (
                    <option key={nis} value={nis} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
                      📋 {nis}
                    </option>
                  ))}
                </select>
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>▼</span>
              </div>

              {/* Sort by Score */}
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer pr-10 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                >
                  <option value="default" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>📊 Urutkan</option>
                  <option value="score-high" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>⬆️ Skor Tertinggi</option>
                  <option value="score-low" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>⬇️ Skor Terendah</option>
                  <option value="avg-high" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>📈 Rata-rata Tertinggi</option>
                  <option value="avg-low" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>📉 Rata-rata Terendah</option>
                </select>
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>▼</span>
              </div>

              {/* Result Count */}
              {(searchTerm || selectedKelas !== 'all' || selectedNIS !== 'all' || sortOrder !== 'default') && (
                <span className="text-purple-600 text-sm">
                  {filteredStudents.length} dari {students.length} siswa
                </span>
              )}
              
              <button
                onClick={downloadExcel}
                disabled={filteredStudents.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg flex items-center gap-2"
              >
                📥 Download Excel
              </button>
              <button
                onClick={loadStudentData}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl animate-bounce mb-4">📊</div>
              <p className={theme === 'dark' ? 'text-white' : 'text-slate-600'}>Memuat data siswa...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Belum ada data siswa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${theme === 'dark' ? 'border-slate-600 bg-slate-800/80' : 'border-purple-200 bg-purple-50/80'}`}>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap w-10 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>No</th>
                    <th className={`text-left py-3 px-3 font-semibold whitespace-nowrap min-w-[140px] ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Nama Siswa</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Kelas</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>NIS</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Submit</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Rata-rata</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Progress</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Tertinggi</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                      <div className="flex flex-col items-center leading-tight">
                        <span>📊 Skor</span>
                        <span className="text-[10px] text-yellow-500 font-normal">(Hari Ini)</span>
                      </div>
                    </th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Terakhir</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Grade</th>
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap sticky right-0 ${theme === 'dark' ? 'text-purple-300 bg-slate-800' : 'text-purple-700 bg-purple-50'}`} style={{ boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.1)' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className={`border-b transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-purple-50 hover:bg-purple-50'}`}
                    >
                      <td className={`py-3 px-2 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-semibold truncate max-w-[120px] ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} title={student.name}>
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          {student.kelas || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-mono text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {student.nis || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          {student.total_submissions}x
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            student.average_score >= 8
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : student.average_score >= 6
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : student.average_score >= 4
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {student.average_score.toFixed(1)}/10
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className={`w-14 rounded-full h-1.5 overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-purple-100'}`}>
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                student.average_score >= 8
                                  ? 'bg-green-500'
                                  : student.average_score >= 6
                                  ? 'bg-purple-500'
                                  : student.average_score >= 4
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${(student.average_score / 10) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              student.average_score >= 8
                                ? 'text-green-400'
                                : student.average_score >= 6
                                ? 'text-purple-400'
                                : student.average_score >= 4
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {((student.average_score / 10) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            student.highest_score >= 8
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : student.highest_score >= 6
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : student.highest_score >= 4
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {student.highest_score.toFixed(1)}/10
                        </span>
                      </td>
                      {/* Daily Score - Real-time score that resets daily */}
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              (student.daily_score || 0) >= 8
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40'
                                : (student.daily_score || 0) >= 6
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40'
                                : (student.daily_score || 0) >= 4
                                ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/40'
                                : (student.daily_score || 0) > 0
                                ? 'bg-orange-500/30 text-orange-300 border border-orange-400/40'
                                : 'bg-slate-500/30 text-slate-400 border border-slate-400/40'
                            }`}
                          >
                            {(student.daily_score || 0).toFixed(1)}/10
                          </span>
                          {(student.daily_submissions || 0) > 0 && (
                            <span className={`text-[10px] leading-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {student.daily_submissions}x • max: {(student.daily_highest_score || 0).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {student.latest_submission ? (
                          <div className="text-xs">
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                              {new Date(student.latest_submission).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {new Date(student.latest_submission).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Belum ada</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {(() => {
                          const score = student.average_score
                          let grade = ''
                          let gradeClass = ''
                          
                          if (score >= 9) {
                            grade = 'A+'
                            gradeClass = 'bg-purple-500/30 text-purple-300 border-purple-400/50'
                          } else if (score >= 8) {
                            grade = 'A'
                            gradeClass = 'bg-green-500/30 text-green-300 border-green-400/50'
                          } else if (score >= 7) {
                            grade = 'B+'
                            gradeClass = 'bg-purple-500/30 text-purple-300 border-purple-400/50'
                          } else if (score >= 6) {
                            grade = 'B'
                            gradeClass = 'bg-purple-500/30 text-purple-300 border-purple-400/50'
                          } else if (score >= 5) {
                            grade = 'C+'
                            gradeClass = 'bg-yellow-500/30 text-yellow-300 border-yellow-400/50'
                          } else if (score >= 4) {
                            grade = 'C'
                            gradeClass = 'bg-orange-500/30 text-orange-300 border-orange-400/50'
                          } else if (score >= 3) {
                            grade = 'D'
                            gradeClass = 'bg-red-500/30 text-red-300 border-red-400/50'
                          } else {
                            grade = 'E'
                            gradeClass = 'bg-red-700/30 text-red-400 border-red-500/50'
                          }
                          
                          return (
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${gradeClass}`}>
                              {grade}
                            </span>
                          )
                        })()}
                      </td>
                      <td className={`py-3 px-2 text-center sticky right-0 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`} style={{ boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.08)' }}>
                        <button
                          onClick={() => confirmDeleteStudent(student)}
                          className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105"
                          title={`Hapus akun ${student.name}`}
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Student Count Footer */}
          {filteredStudents.length > 0 && (
            <div className={`mt-4 text-sm text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Menampilkan {filteredStudents.length} dari {students.length} siswa
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className={`mt-8 rounded-2xl p-6 border ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💡</span>
              <div>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Tips Mengajar Clean Code</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  Dorong siswa untuk fokus pada naming conventions dan menghindari duplikasi kode
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.total_students}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Siswa Aktif</p>
              </div>
              <div className={`w-px ${theme === 'dark' ? 'bg-purple-500/30' : 'bg-purple-200'}`}></div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.class_average >= 7 ? '✅' : '📈'}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{stats.class_average >= 7 ? 'Tercapai' : 'Progress'}</p>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Materials Tab Content */}
        {activeTab === 'materials' && (
          <div className="space-y-8">
            {/* Upload Section */}
            <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                📤 Upload Materi Baru
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Judul Materi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Contoh: Pengenalan Clean Code"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Deskripsi (Opsional)
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Deskripsi singkat tentang materi..."
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Kategori
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                    >
                      <option value="Umum" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>📚 Umum</option>
                      <option value="Clean Code" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>✨ Clean Code</option>
                      <option value="Python Dasar" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>🐍 Python Dasar</option>
                      <option value="Algoritma" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>🧮 Algoritma</option>
                      <option value="Best Practices" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>🎯 Best Practices</option>
                      <option value="Debugging" className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>🐛 Debugging</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-4">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    File Materi <span className="text-red-500">*</span>
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      selectedFile 
                        ? 'border-purple-500 bg-purple-50' 
                        : theme === 'dark' ? 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50' : 'border-purple-200 hover:border-purple-500 hover:bg-purple-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.ppt,.pptx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="text-5xl">
                          {selectedFile.name.endsWith('.pdf') ? '📕' : '📊'}
                        </div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedFile.name}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{formatFileSize(selectedFile.size)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-red-400 hover:text-red-300 text-sm underline"
                        >
                          Hapus file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-5xl">📁</div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Klik untuk memilih file</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          Format: PDF, PPT, PPTX (Maks. 50MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={handleUploadMaterial}
                    disabled={isUploading || !selectedFile || !uploadForm.title.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                      isUploading || !selectedFile || !uploadForm.title.trim()
                        ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Mengupload... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        📤 Upload Materi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Materials List */}
            <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  📚 Daftar Materi ({materials.length})
                </h2>
                <button
                  onClick={loadMaterials}
                  className="text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-2"
                >
                  🔄 Refresh
                </button>
              </div>

              {materialsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
                  <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Memuat materi...</p>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Belum ada materi yang diupload</p>
                  <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Upload materi pertama Anda di form di atas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className={`rounded-xl p-5 border transition-all duration-300 group ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600 hover:border-purple-500' : 'bg-purple-50 border-purple-100 hover:border-purple-300'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl flex-shrink-0">
                          {getFileIcon(material.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate group-hover:text-purple-600 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            {material.title}
                          </h3>
                          {material.description && (
                            <p className={`text-sm mt-1 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {material.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`px-2 py-1 text-xs rounded-lg border ${theme === 'dark' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                              {material.category || 'Umum'}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatFileSize(material.file_size)}
                            </span>
                          </div>
                          <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(material.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className={`flex gap-2 mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-600' : 'border-purple-100'}`}>
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors border ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200'}`}
                        >
                          👁️ Lihat
                        </a>
                        <a
                          href={material.file_url}
                          download
                          className={`flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors border ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200'}`}
                        >
                          📥 Unduh
                        </a>
                        {material.teacher_id === userId && (
                          <button
                            onClick={() => confirmDeleteMaterial(material)}
                            className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors border border-red-200"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Materials Tips */}
            <div className={`rounded-2xl p-6 border ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">💡</span>
                  <div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Tips Upload Materi</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                      Gunakan format PDF untuk materi yang lebih ringkas, atau PPT untuk presentasi interaktif
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{materials.length}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Total Materi</p>
                  </div>
                  <div className={`w-px ${theme === 'dark' ? 'bg-purple-500/30' : 'bg-purple-200'}`}></div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {materials.filter(m => m.teacher_id === userId).length}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Materi Anda</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
