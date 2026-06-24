'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'
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

interface ExamScoreRow {
  exam_id: string
  exam_title: string
  exam_type: 'pretest' | 'posttest'
  student_id: string
  student_name: string
  nis: string
  kelas: string
  final_score: number
  submitted_at: string | null
  answer_scores: Array<{ order_number: number; answer_score: number }>
  total_questions: number
}

export default function GuruDashboard() {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const tr = (id: string, en: string) => (language === 'id' ? id : en)
  const [userName, setUserName] = useState('Guru')
  const [userId, setUserId] = useState('')
  const [students, setStudents] = useState<StudentData[]>([])
  const [stats, setStats] = useState<ClassStats>({
    total_students: 0,
    total_submissions: 0,
    class_average: 0,
    highest_score: 0,
  })
  
  // Tab / Sidebar state
  const [activeTab, setActiveTab] = useState<'students' | 'materials' | 'exams'>('students')
  const [showSidebar, setShowSidebar] = useState(false)
  
  // Material states
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  // Exams (teacher) states
  const [exams, setExams] = useState<Array<any>>([])
  const [examsLoading, setExamsLoading] = useState(false)
  const [examScoreRows, setExamScoreRows] = useState<ExamScoreRow[]>([])
  const [examScoresLoading, setExamScoresLoading] = useState(false)
  const [resetExamLoading, setResetExamLoading] = useState<string | null>(null)
  const [showCreateExamModal, setShowCreateExamModal] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [newExam, setNewExam] = useState({
    title: '',
    exam_type: 'pretest' as 'pretest' | 'posttest',
    duration_minutes: 60,
    is_active: false,
    questions: [] as Array<{ order_number: number; instruction_text: string; dirty_code_template: string }>,
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'Umum',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null)

  const [deleteStudentLoading, setDeleteStudentLoading] = useState(false)
  const [showResetProgressModal, setShowResetProgressModal] = useState(false)
  const [studentToReset, setStudentToReset] = useState<StudentData | null>(null)
  const [resetProgressLoading, setResetProgressLoading] = useState(false)
  const [showResetAllModal, setShowResetAllModal] = useState(false)
  const [resetAllLoading, setResetAllLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [examSearchTerm, setExamSearchTerm] = useState('')
  const [selectedExamType, setSelectedExamType] = useState<'all' | 'pretest' | 'posttest'>('all')
  const [selectedExamKelas, setSelectedExamKelas] = useState<string>('all')
  const [selectedExamNIS, setSelectedExamNIS] = useState<string>('all')
  const [examSortOrder, setExamSortOrder] = useState<'default' | 'score-high' | 'score-low'>('default')
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

  const examKelasOptions = [...new Set(examScoreRows.map((row) => row.kelas).filter((kelas) => kelas && kelas.trim() !== '' && kelas !== '-'))].sort()
  const examNisOptions = [...new Set(examScoreRows.map((row) => row.nis).filter((nis) => nis && nis.trim() !== '' && nis !== '-'))].sort()

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
        loadExams()
        loadExamScores()
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    
    loadUserAndData()
  }, [])

  useEffect(() => {
    setSelectedStudentIds((prev) =>
      prev.filter((id) => students.some((student) => student.id === id))
    )
  }, [students])

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

  const loadExams = async () => {
    setExamsLoading(true)
    try {
      const res = await fetch('/api/guru/exams')
      const data = await res.json()
      if (data.success) setExams(data.exams || [])
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setExamsLoading(false)
    }
  }

  const loadExamScores = async () => {
    setExamScoresLoading(true)
    try {
      const res = await fetch('/api/guru/exams/scores')
      const data = await res.json()
      if (data.success) {
        const rows = (data.exams || []).flatMap((exam: any) =>
          (exam.submissions || []).map((submission: any) => ({
            exam_id: exam.id,
            exam_title: exam.title,
            exam_type: exam.exam_type,
            student_id: submission.user_id,
            student_name: submission.student_name,
            nis: submission.nis,
            kelas: submission.kelas,
            final_score: Number(submission.final_score || 0),
            submitted_at: submission.submitted_at,
            answer_scores: submission.answer_scores || [],
            total_questions: exam.total_questions || 0,
          }))
        )
        setExamScoreRows(rows)
      }
    } catch (err) {
      console.error('Failed to load exam scores:', err)
    } finally {
      setExamScoresLoading(false)
    }
  }

  const handleResetExamScore = async (row: any) => {
    const confirmed = window.confirm(
      tr(
        `Reset ujian ${row.exam_title} untuk ${row.student_name}? Siswa akan bisa mengerjakan ulang pretest.`,
        `Reset ${row.exam_title} for ${row.student_name}? The student will be able to retake the pretest.`
      )
    )

    if (!confirmed) return

    const resetKey = `${row.exam_id}:${row.student_name}`
    setResetExamLoading(resetKey)
    try {
      const res = await fetch('/api/guru/reset-exam-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: row.student_id, examId: row.exam_id }),
      })

      const data = await res.json()
      if (data.success) {
        await loadExamScores()
        alert(data.message || tr('Ujian siswa berhasil direset', 'Student exam reset successfully'))
      } else {
        const detail = data?.detail ? `\nDetail: ${data.detail}` : ''
        alert((data.error || tr('Gagal mereset ujian siswa', 'Failed to reset student exam')) + detail)
      }
    } catch (error) {
      console.error('Reset exam score error:', error)
      alert(tr('Terjadi kesalahan saat mereset ujian siswa', 'An error occurred while resetting student exam'))
    } finally {
      setResetExamLoading(null)
    }
  }

  const openCreateExamModal = () => {
    setEditingExamId(null)
    setNewExam({
      title: '',
      exam_type: 'pretest',
      duration_minutes: 60,
      is_active: true,
      questions: [{ order_number: 1, instruction_text: '', dirty_code_template: '' }],
    })
    setShowCreateExamModal(true)
  }

  const openEditExamModal = (exam: any) => {
    setEditingExamId(exam.id)
    setNewExam({
      title: exam.title || '',
      exam_type: exam.exam_type || 'pretest',
      duration_minutes: exam.duration_minutes || 60,
      is_active: Boolean(exam.is_active),
      questions: exam.questions?.length
        ? exam.questions
            .slice()
            .sort((a: any, b: any) => a.order_number - b.order_number)
            .map((question: any) => ({
              order_number: question.order_number,
              instruction_text: question.instruction_text || '',
              dirty_code_template: question.dirty_code_template || '',
            }))
        : [{ order_number: 1, instruction_text: '', dirty_code_template: '' }],
    })
    setShowCreateExamModal(true)
  }

  const handleAddQuestion = () => {
    setNewExam((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { order_number: prev.questions.length + 1, instruction_text: '', dirty_code_template: '' },
      ],
    }))
  }

  const handleRemoveQuestion = (index: number) => {
    setNewExam((prev) => {
      const q = [...prev.questions]
      q.splice(index, 1)
      return { ...prev, questions: q.map((qq, i) => ({ ...qq, order_number: i + 1 })) }
    })
  }

  const handleCreateExam = async () => {
    if (!newExam.title.trim()) {
      alert(tr('Judul ujian harus diisi', 'Exam title is required'))
      return
    }

    if (!newExam.questions.length) {
      alert(tr('Minimal harus ada 1 soal.', 'At least 1 question is required.'))
      return
    }

    const invalidQuestion = newExam.questions.find((question) => !question.instruction_text.trim())
    if (invalidQuestion) {
      alert(tr('Setiap soal harus punya instruksi.', 'Each question must have an instruction.'))
      return
    }

    try {
      const endpoint = editingExamId ? `/api/guru/exams/${editingExamId}` : '/api/guru/exams'
      const res = await fetch(endpoint, {
        method: editingExamId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam),
      })
      const data = await res.json()
      if (data.success) {
        alert(editingExamId ? tr('Ujian berhasil diperbarui', 'Exam updated') : tr('Ujian berhasil dibuat', 'Exam created'))
        setShowCreateExamModal(false)
        setEditingExamId(null)
        setNewExam({
          title: '',
          exam_type: 'pretest',
          duration_minutes: 60,
          is_active: true,
          questions: [{ order_number: 1, instruction_text: '', dirty_code_template: '' }],
        })
        loadExams()
        loadExamScores()
      } else {
        alert(data.error || (editingExamId ? tr('Gagal memperbarui ujian', 'Failed to update exam') : tr('Gagal membuat ujian', 'Failed to create exam')))
      }
    } catch (err) {
      console.error('Create exam error:', err)
      alert(editingExamId ? tr('Terjadi kesalahan saat memperbarui ujian', 'Error updating exam') : tr('Terjadi kesalahan saat membuat ujian', 'Error creating exam'))
    }
  }

  const handleDeleteExam = async (examId: string) => {
    const confirmed = window.confirm(tr('Hapus ujian ini beserta semua soalnya?', 'Delete this exam and all questions?'))
    if (!confirmed) return

    try {
      const res = await fetch(`/api/guru/exams/${examId}?id=${encodeURIComponent(examId)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        loadExams()
        loadExamScores()
        alert(tr('Ujian berhasil dihapus', 'Exam deleted'))
      } else {
        alert(data.error || tr('Gagal menghapus ujian', 'Failed to delete exam'))
      }
    } catch (err) {
      console.error('Delete exam error:', err)
      alert(tr('Terjadi kesalahan saat menghapus ujian', 'Error deleting exam'))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
      if (!allowedTypes.includes(file.type)) {
        alert(tr('Format file tidak didukung. Hanya PDF, PPT, dan PPTX yang diperbolehkan.', 'Unsupported file format. Only PDF, PPT, and PPTX are allowed.'))
        return
      }
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert(tr('Ukuran file terlalu besar. Maksimal 50MB.', 'File is too large. Maximum size is 50MB.'))
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUploadMaterial = async () => {
    if (!selectedFile || !uploadForm.title.trim()) {
      alert(tr('Judul dan file harus diisi!', 'Title and file are required!'))
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

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
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
        alert(tr('Materi berhasil diupload!', 'Material uploaded successfully!'))
      } else {
        alert(data.error || tr('Gagal mengupload materi', 'Failed to upload material'))
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(tr('Terjadi kesalahan saat mengupload materi', 'An error occurred while uploading material'))
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
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`/api/materials?id=${materialToDelete.id}`, {
        method: 'DELETE',
        headers: {
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
      })

      const data = await response.json()

      if (data.success) {
        loadMaterials()
        alert(tr('Materi berhasil dihapus!', 'Material deleted successfully!'))
      } else {
        alert(data.error || tr('Gagal menghapus materi', 'Failed to delete material'))
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(tr('Terjadi kesalahan saat menghapus materi', 'An error occurred while deleting material'))
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

  const confirmResetProgress = (student: StudentData) => {
    setStudentToReset(student)
    setShowResetProgressModal(true)
  }

  const confirmResetAllProgress = () => {
    setShowResetAllModal(true)
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
        alert(language === 'id' ? `Akun siswa "${studentToDelete.name}" berhasil dihapus!` : `Student account "${studentToDelete.name}" deleted successfully!`)
      } else {
        alert(data.error || tr('Gagal menghapus akun siswa', 'Failed to delete student account'))
      }
    } catch (error) {
      console.error('Delete student error:', error)
      alert(tr('Terjadi kesalahan saat menghapus akun siswa', 'An error occurred while deleting student account'))
    } finally {
      setDeleteStudentLoading(false)
      setShowDeleteStudentModal(false)
      setStudentToDelete(null)
    }
  }

  const handleResetProgress = async () => {
    if (!studentToReset) return

    setResetProgressLoading(true)
    try {
      const response = await fetch('/api/guru/reset-student-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentToReset.id }),
      })

      const data = await response.json()

      if (data.success) {
        loadStudentData()
        alert(
          language === 'id'
            ? `Progress siswa "${studentToReset.name}" berhasil direset.`
            : `Student progress "${studentToReset.name}" reset successfully.`
        )
      } else {
        alert(data.error || tr('Gagal mereset progress siswa', 'Failed to reset student progress'))
      }
    } catch (error) {
      console.error('Reset progress error:', error)
      alert(tr('Terjadi kesalahan saat mereset progress', 'An error occurred while resetting progress'))
    } finally {
      setResetProgressLoading(false)
      setShowResetProgressModal(false)
      setStudentToReset(null)
    }
  }

  const handleResetAllProgress = async () => {
    setResetAllLoading(true)
    try {
      const response = await fetch('/api/guru/reset-all-progress', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        loadStudentData()
        alert(tr('Semua progress siswa berhasil direset.', 'All student progress has been reset.'))
      } else {
        alert(data.error || tr('Gagal mereset semua progress siswa', 'Failed to reset all student progress'))
      }
    } catch (error) {
      console.error('Reset all progress error:', error)
      alert(tr('Terjadi kesalahan saat mereset semua progress', 'An error occurred while resetting all progress'))
    } finally {
      setResetAllLoading(false)
      setShowResetAllModal(false)
    }
  }



  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const toggleSelectAllVisible = () => {
    if (filteredStudents.length === 0) return

    const visibleIds = new Set(filteredStudents.map((student) => student.id))
    const allSelected = filteredStudents.every((student) => selectedStudentIds.includes(student.id))

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.has(id)))
      return
    }

    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      filteredStudents.forEach((student) => next.add(student.id))
      return Array.from(next)
    })
  }

  const confirmBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return
    setShowBulkDeleteModal(true)
  }

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return

    const studentsToDelete = students.filter((student) => selectedStudentIds.includes(student.id))
    if (studentsToDelete.length === 0) {
      setShowBulkDeleteModal(false)
      return
    }

    setBulkDeleteLoading(true)
    try {
      let successCount = 0
      let failedCount = 0

      for (const student of studentsToDelete) {
        try {
          const response = await fetch('/api/guru/delete-student', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: student.id }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            successCount += 1
          } else {
            failedCount += 1
          }
        } catch (error) {
          failedCount += 1
        }
      }

      if (successCount > 0) {
        loadStudentData()
      }

      setSelectedStudentIds([])

      if (failedCount === 0) {
        alert(tr('Semua akun siswa terpilih berhasil dihapus.', 'All selected student accounts were deleted.'))
      } else {
        alert(
          tr(
            `${successCount} akun siswa berhasil dihapus, ${failedCount} gagal.`,
            `${successCount} student accounts deleted, ${failedCount} failed.`
          )
        )
      }
    } finally {
      setBulkDeleteLoading(false)
      setShowBulkDeleteModal(false)
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

  const filteredExamScoreRows = useMemo(() => {
    const rows = examScoreRows.filter((row) => {
      const matchesSearch =
        row.student_name.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        row.exam_title.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        row.nis.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        row.kelas.toLowerCase().includes(examSearchTerm.toLowerCase())

      const matchesType = selectedExamType === 'all' || row.exam_type === selectedExamType
      const matchesKelas = selectedExamKelas === 'all' || row.kelas === selectedExamKelas
      const matchesNis = selectedExamNIS === 'all' || row.nis === selectedExamNIS

      return matchesSearch && matchesType && matchesKelas && matchesNis
    })

    rows.sort((a, b) => {
      switch (examSortOrder) {
        case 'score-high':
          return b.final_score - a.final_score
        case 'score-low':
          return a.final_score - b.final_score
        default:
          return 0
      }
    })

    return rows
  }, [examScoreRows, examSearchTerm, selectedExamType, selectedExamKelas, selectedExamNIS, examSortOrder])

  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id))
  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedStudentIds.includes(student.id))
  const someVisibleSelected = filteredStudents.some((student) => selectedStudentIds.includes(student.id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected
    }
  }, [allVisibleSelected, someVisibleSelected])

  // Export to Excel function
  const downloadExcel = () => {
    // Get current date for daily score context
    const today = '05 Jun 2026'

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
        ? '05 Jun 2026'
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
    const filename = `Laporan_Clean_Code_Siswa_05-06-2026.xlsx`

    // Download file
    XLSX.writeFile(workbook, filename)
  }

  const downloadExamScoresExcel = () => {
    // Determine max number of questions across all filtered rows
    const maxQuestions = filteredExamScoreRows.reduce((max, row) => {
      const questionCount = Math.max(row.total_questions || 0, row.answer_scores?.length || 0)
      return Math.max(max, questionCount)
    }, 0)

    // Ensure we have at least 10 columns for the S1..S10 format if there are fewer questions
    const cols = Math.max(10, maxQuestions)

    const exportRows: any[] = []

    // 1. Subheader row
    const subheaderRow: Record<string, any> = {
      'No.': '',
      'Nama Siswa': `Skor Maks: 10 / soal | Total: ${cols * 10}`,
      'Kode': '',
    }
    for (let q = 1; q <= cols; q++) {
      subheaderRow[`S${q}`] = '0-10'
    }
    exportRows.push(subheaderRow)

    // 2. Data rows
    filteredExamScoreRows.forEach((row, index) => {
      const baseRow: Record<string, any> = {
        'No.': index + 1,
        'Nama Siswa': row.student_name,
        'Kode': row.nis || '-',
      }

      // Add per-question score columns
      for (let q = 1; q <= cols; q++) {
        const answerForQ = row.answer_scores?.find((a) => a.order_number === q)
        baseRow[`S${q}`] = answerForQ ? Number(answerForQ.answer_score.toFixed(2)) : '-'
      }

      exportRows.push(baseRow)
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const colWidths = [
      { wch: 5 },   // No.
      { wch: 35 },  // Nama Siswa
      { wch: 15 },  // Kode
    ]
    // Add column width for each question
    for (let q = 1; q <= cols; q++) {
      colWidths.push({ wch: 8 }) // S1..S10
    }
    worksheet['!cols'] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Ujian')

    const filename = `Rekap_Hasil_Ujian_Siswa_05-06-2026.xlsx`
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
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Keluar?', 'Logout?')}</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{tr('Apakah Anda yakin ingin keluar dari aplikasi?', 'Are you sure you want to logout from the app?')}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={cancelLogout}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Tidak', '❌ No')}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  {tr('✅ Ya, Keluar', '✅ Yes, Logout')}
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
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Hapus Materi?', 'Delete Material?')}</h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{tr('Apakah Anda yakin ingin menghapus materi:', 'Are you sure you want to delete material:')}</p>
              <p className="text-purple-600 font-semibold mb-6">&quot;{materialToDelete.title}&quot;</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Batal', '❌ Cancel')}
                </button>
                <button
                  onClick={handleDeleteMaterial}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  {tr('🗑️ Ya, Hapus', '🗑️ Yes, Delete')}
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
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{tr('Hapus Akun Siswa?', 'Delete Student Account?')}</h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{tr('Apakah Anda yakin ingin menghapus akun siswa:', 'Are you sure you want to delete this student account:')}</p>
              <div className={`mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-red-50'}`}>
                <p className="text-red-500 font-bold text-lg">{studentToDelete.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>NIS: {studentToDelete.nis} | Kelas: {studentToDelete.kelas}</p>
              </div>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                {tr('⚠️ Semua data siswa termasuk submissions, skor, dan leaderboard akan dihapus permanen!', '⚠️ All student data including submissions, scores, and leaderboard entries will be permanently deleted!')}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowDeleteStudentModal(false)}
                  disabled={deleteStudentLoading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Batal', '❌ Cancel')}
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={deleteStudentLoading}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  {deleteStudentLoading ? tr('⏳ Menghapus...', '⏳ Deleting...') : tr('🗑️ Ya, Hapus Akun', '🗑️ Yes, Delete Account')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetProgressModal && studentToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !resetProgressLoading && setShowResetProgressModal(false)}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-yellow-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {tr('Reset Progress Siswa?', 'Reset Student Progress?')}
              </h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {tr('Apakah Anda yakin ingin mereset progress siswa:', 'Are you sure you want to reset progress for:')}
              </p>
              <div className={`mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-yellow-50'}`}>
                <p className="text-yellow-500 font-bold text-lg">{studentToReset.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  NIS: {studentToReset.nis} | Kelas: {studentToReset.kelas}
                </p>
              </div>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                {tr(
                  '⚠️ Semua submission, skor, dan leaderboard siswa ini akan direset menjadi 0. Akun tetap ada.',
                  '⚠️ All submissions, scores, and leaderboard data will be reset to 0. The account remains.'
                )}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowResetProgressModal(false)}
                  disabled={resetProgressLoading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Batal', '❌ Cancel')}
                </button>
                <button
                  onClick={handleResetProgress}
                  disabled={resetProgressLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-yellow-500/30"
                >
                  {resetProgressLoading ? tr('⏳ Mereset...', '⏳ Resetting...') : tr('🔄 Ya, Reset', '🔄 Yes, Reset')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !resetAllLoading && setShowResetAllModal(false)}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-yellow-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {tr('Reset Semua Progress?', 'Reset All Progress?')}
              </h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {tr(
                  'Tindakan ini akan mereset semua submission, skor, dan leaderboard seluruh siswa menjadi 0. Akun siswa tetap ada.',
                  'This will reset all submissions, scores, and leaderboard data for every student to 0. Student accounts remain.'
                )}
              </p>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                {tr('⚠️ Aksi ini tidak bisa dibatalkan.', '⚠️ This action cannot be undone.')}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowResetAllModal(false)}
                  disabled={resetAllLoading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Batal', '❌ Cancel')}
                </button>
                <button
                  onClick={handleResetAllProgress}
                  disabled={resetAllLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-yellow-500/30"
                >
                  {resetAllLoading ? tr('⏳ Mereset...', '⏳ Resetting...') : tr('🔄 Ya, Reset Semua', '🔄 Yes, Reset All')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !bulkDeleteLoading && setShowBulkDeleteModal(false)}
          ></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {tr('Hapus Banyak Akun?', 'Delete Multiple Accounts?')}
              </h3>
              <p className={`mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {tr(
                  `Anda akan menghapus ${selectedStudents.length} akun siswa terpilih.`,
                  `You are about to delete ${selectedStudents.length} selected student accounts.`
                )}
              </p>
              {selectedStudents.length > 0 && (
                <div className={`mb-4 max-h-32 overflow-y-auto rounded-xl border px-3 py-2 text-left text-xs ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-red-50 border-red-200 text-slate-600'}`}>
                  {selectedStudents.map((student) => (
                    <div key={student.id} className="flex justify-between gap-2">
                      <span className="font-medium truncate">{student.name}</span>
                      <span className="text-[10px] text-slate-400">{student.nis} • {student.kelas}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                {tr('⚠️ Semua data siswa terpilih akan dihapus permanen!', '⚠️ All selected student data will be permanently deleted!')}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={bulkDeleteLoading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {tr('❌ Batal', '❌ Cancel')}
                </button>
                <button
                  onClick={handleBulkDeleteStudents}
                  disabled={bulkDeleteLoading}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-red-500/30"
                >
                  {bulkDeleteLoading ? tr('⏳ Menghapus...', '⏳ Deleting...') : tr('🗑️ Ya, Hapus Akun', '🗑️ Yes, Delete Accounts')}
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
      <nav className={`relative z-50 border-b shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Hamburger Button */}
              <button
                onClick={() => setShowSidebar(prev => !prev)}
                className={`p-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  showSidebar ? 'rotate-90' : 'rotate-0'
                } ${theme === 'dark' ? 'bg-purple-900/85 hover:bg-purple-800 text-purple-200 border border-purple-400/40' : 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-500'}`}
                aria-label="Toggle navigation menu"
              >
                {showSidebar ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
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
                  👨‍🏫 {tr('Dashboard Guru', 'Teacher Dashboard')}
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  {tr('Monitor Progress Clean Code Siswa', 'Monitor Student Clean Code Progress')}
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
                🚪 {tr('Keluar', 'Logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <button
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close navigation menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 max-w-[88vw] pt-24 px-4 pb-4 border-r shadow-xl transition-all duration-300 transform ${
          showSidebar ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'
        } ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}
      >
        <div className={`h-full rounded-2xl border p-3 overflow-y-auto ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-purple-100'}`}>
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wide px-2 mb-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
              {tr('Menu Navigasi', 'Navigation Menu')}
            </p>

            <button
              onClick={() => { setActiveTab('students'); setShowSidebar(false) }}
              className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-left font-semibold ${
                activeTab === 'students'
                  ? theme === 'dark' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              👥 {tr('Progress Siswa', 'Student Progress')}
            </button>

            <button
              onClick={() => { setActiveTab('materials'); setShowSidebar(false) }}
              className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-left font-semibold ${
                activeTab === 'materials'
                  ? theme === 'dark' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              📚 {tr('Materi Pembelajaran', 'Learning Materials')}
            </button>

            <button
              onClick={() => { setActiveTab('exams'); setShowSidebar(false) }}
              className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-left font-semibold ${
                activeTab === 'exams'
                  ? theme === 'dark' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              📝 {tr('Ujian', 'Exams')}
            </button>

            <div className={`my-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`} />

            <a
              href="/guru/profile"
              className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
            >
              <div>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{userName}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>Guru</p>
              </div>
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            </a>

            <button
              onClick={confirmLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all duration-300 text-left"
            >
              🚪 {tr('Keluar', 'Logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content — shifts right when sidebar is open on large screens */}
      <div className={`transition-all duration-300 ${showSidebar ? 'lg:ml-72' : 'lg:ml-0'}`}>
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
              <button
                onClick={confirmResetAllProgress}
                disabled={students.length === 0 || loading}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg"
              >
                🔄 {tr('Reset Semua', 'Reset All')}
              </button>
              <button
                onClick={confirmBulkDeleteStudents}
                disabled={selectedStudentIds.length === 0}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg"
              >
                🗑️ {tr('Hapus Akun', 'Delete Accounts')}{selectedStudentIds.length > 0 ? ` (${selectedStudentIds.length})` : ''}
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
                    <th className={`text-center py-3 px-2 font-semibold whitespace-nowrap w-10 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        disabled={filteredStudents.length === 0}
                        onChange={toggleSelectAllVisible}
                        aria-label={tr('Pilih semua siswa yang terlihat', 'Select all visible students')}
                        className={`h-4 w-4 rounded border ${theme === 'dark' ? 'bg-slate-700 border-slate-500 text-purple-400' : 'bg-white border-purple-300 text-purple-600'}`}
                      />
                    </th>
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
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          aria-label={tr('Pilih siswa', 'Select student')}
                          className={`h-4 w-4 rounded border ${theme === 'dark' ? 'bg-slate-700 border-slate-500 text-purple-400' : 'bg-white border-purple-300 text-purple-600'}`}
                        />
                      </td>
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
                              05 Jun 2026
                            </p>
                            <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              21:23
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
                          
                          if (score >= 8.1) {
                            grade = 'Sangat Terampil'
                            gradeClass = 'bg-green-500/30 text-green-300 border-green-400/50'
                          } else if (score >= 6.1) {
                            grade = 'Terampil'
                            gradeClass = 'bg-purple-500/30 text-purple-300 border-purple-400/50'
                          } else if (score >= 4.1) {
                            grade = 'Cukup Terampil'
                            gradeClass = 'bg-yellow-500/30 text-yellow-300 border-yellow-400/50'
                          } else if (score >= 2.1) {
                            grade = 'Kurang Terampil'
                            gradeClass = 'bg-orange-500/30 text-orange-300 border-orange-400/50'
                          } else {
                            grade = 'Tidak Terampil'
                            gradeClass = 'bg-red-500/30 text-red-300 border-red-400/50'
                          }
                          
                          return (
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${gradeClass}`}>
                              {grade}
                            </span>
                          )
                        })()}
                      </td>
                      <td className={`py-3 px-2 text-center sticky right-0 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`} style={{ boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.08)' }}>
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => confirmResetProgress(student)}
                            className="px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105"
                            title={tr(`Reset progress ${student.name}`, `Reset progress ${student.name}`)}
                          >
                            🔄 {tr('Reset', 'Reset')}
                          </button>

                          <button
                            onClick={() => confirmDeleteStudent(student)}
                            className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105"
                            title={`Hapus akun ${student.name}`}
                          >
                            🗑️ {tr('Hapus', 'Delete')}
                          </button>
                        </div>
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

        {/* Exams Tab Content */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className={`rounded-2xl p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📝 {tr('Ujian', 'Exams')}</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      loadExams()
                      loadExamScores()
                    }}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={openCreateExamModal}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl"
                  >
                    ➕ {tr('Buat Ujian', 'Create Exam')}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {examsLoading ? (
                  <div className="py-8 text-center">{tr('Memuat ujian...', 'Loading exams...')}</div>
                ) : exams.length === 0 ? (
                  <div className="py-8 text-center">{tr('Belum ada ujian', 'No exams yet')}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {exams.map((exam: any) => (
                      <div key={exam.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-purple-100'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{exam.title}</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{exam.exam_type} • {exam.duration_minutes} menit</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>{new Date(exam.created_at).toLocaleDateString()}</p>
                            <p className={`text-xs mt-2 ${exam.is_active ? 'text-green-500' : 'text-slate-400'}`}>{exam.is_active ? tr('Aktif','Active') : tr('Tidak aktif','Inactive')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => openEditExamModal(exam)} className="flex-1 px-3 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold">
                            {tr('Edit', 'Edit')}
                          </button>
                          <button onClick={() => handleDeleteExam(exam.id)} className="flex-1 px-3 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                            {tr('Hapus', 'Delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

              <div className={`mt-6 rounded-2xl border p-5 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-purple-50/70 border-purple-100'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      📊 Rekap Skor Ujian Siswa
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nilai akhir diambil dari rata-rata skor tiap soal yang dihitung dengan analisis Pylint.
                    </p>
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    Total submission: <span className="font-semibold">{examScoreRows.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={examSearchTerm}
                        onChange={(e) => setExamSearchTerm(e.target.value)}
                        placeholder={tr('Cari nama, ujian, NIS, kelas...', 'Search name, exam, NIS, class...')}
                        className={`w-72 max-w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                      />
                    </div>

                    <select
                      value={selectedExamType}
                      onChange={(e) => setSelectedExamType(e.target.value as 'all' | 'pretest' | 'posttest')}
                      className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                    >
                      <option value="all">{tr('Semua Jenis', 'All Types')}</option>
                      <option value="pretest">Pretest</option>
                      <option value="posttest">Posttest</option>
                    </select>

                    <select
                      value={selectedExamKelas}
                      onChange={(e) => setSelectedExamKelas(e.target.value)}
                      className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                    >
                      <option value="all">{tr('Semua Kelas', 'All Classes')}</option>
                      {examKelasOptions.map((kelas) => (
                        <option key={kelas} value={kelas}>{kelas}</option>
                      ))}
                    </select>

                    <select
                      value={selectedExamNIS}
                      onChange={(e) => setSelectedExamNIS(e.target.value)}
                      className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                    >
                      <option value="all">{tr('Semua NIS', 'All NIS')}</option>
                      {examNisOptions.map((nis) => (
                        <option key={nis} value={nis}>{nis}</option>
                      ))}
                    </select>

                    <select
                      value={examSortOrder}
                      onChange={(e) => setExamSortOrder(e.target.value as 'default' | 'score-high' | 'score-low')}
                      className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
                    >
                      <option value="default">{tr('Urutan default', 'Default order')}</option>
                      <option value="score-high">{tr('Skor tertinggi ke terendah', 'Highest score to lowest')}</option>
                      <option value="score-low">{tr('Skor terendah ke tertinggi', 'Lowest score to highest')}</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={downloadExamScoresExcel}
                      disabled={filteredExamScoreRows.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg flex items-center gap-2"
                    >
                      📥 Download Excel
                    </button>
                    <button
                      onClick={() => {
                        setExamSearchTerm('')
                        setSelectedExamType('all')
                        setSelectedExamKelas('all')
                        setSelectedExamNIS('all')
                        setExamSortOrder('default')
                      }}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-50'}`}
                    >
                      {tr('Reset Filter', 'Reset Filters')}
                    </button>
                  </div>
                </div>

                {examScoresLoading ? (
                  <div className="py-8 text-center">Memuat rekap skor ujian...</div>
                ) : filteredExamScoreRows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    {examScoreRows.length === 0
                      ? 'Belum ada submission ujian yang tersimpan.'
                      : 'Tidak ada data yang cocok dengan filter saat ini.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-purple-100">
                    <table className="w-full text-sm">
                      <thead className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
                        <tr>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Ujian</th>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Siswa</th>
                          <th className={`text-center px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Kelas</th>
                          <th className={`text-center px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>NIS</th>
                          <th className={`text-center px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Skor Akhir</th>
                          <th className={`text-center px-4 py-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Waktu Submit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExamScoreRows.map((row, index) => (
                          <tr key={`${row.exam_id}-${row.student_name}-${index}`} className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
                            <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{row.exam_title}</td>
                            <td className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{row.student_name}</td>
                            <td className="px-4 py-3 text-center">{row.kelas || '-'}</td>
                            <td className="px-4 py-3 text-center font-mono text-xs">{row.nis || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  row.final_score >= 8
                                    ? 'bg-green-500/20 text-green-300'
                                    : row.final_score >= 6
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : row.final_score >= 4
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {row.final_score.toFixed(2)}/10
                                </span>
                                <button
                                  onClick={() => handleResetExamScore(row)}
                                  disabled={resetExamLoading === `${row.exam_id}:${row.student_name}`}
                                  className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {resetExamLoading === `${row.exam_id}:${row.student_name}`
                                    ? tr('Mereset...', 'Resetting...')
                                    : tr('Reset Ujian', 'Reset Exam')}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              05 Jun 2026
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Menampilkan {filteredExamScoreRows.length} dari {examScoreRows.length} submission
                </div>
              </div>

            {/* Create Exam Modal */}
            {showCreateExamModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60" onClick={() => {
                  setShowCreateExamModal(false)
                  setEditingExamId(null)
                }}></div>
                <div className={`relative w-11/12 max-w-2xl rounded-2xl p-6 border shadow-2xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{editingExamId ? tr('Edit Ujian','Edit Exam') : tr('Buat Ujian Baru','Create New Exam')}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm block mb-1">{tr('Judul Ujian','Exam Title')}</label>
                      <input value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-sm block mb-1">{tr('Tipe','Type')}</label>
                        <select value={newExam.exam_type} onChange={(e) => setNewExam({ ...newExam, exam_type: e.target.value as any })} className="w-full px-3 py-2 rounded-xl border">
                          <option value="pretest">Pretest</option>
                          <option value="posttest">Posttest</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm block mb-1">{tr('Durasi (menit)','Duration (minutes)')}</label>
                        <input type="number" value={newExam.duration_minutes} onChange={(e) => setNewExam({ ...newExam, duration_minutes: Number(e.target.value) })} className="w-32 px-3 py-2 rounded-xl border" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={newExam.is_active} onChange={(e) => setNewExam({ ...newExam, is_active: e.target.checked })} /> {tr('Aktif','Active')}
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold">{tr('Soal Ujian','Exam Questions')}</label>
                        <button onClick={handleAddQuestion} className="text-sm text-green-600">+ {tr('Tambah Soal','Add Question')}</button>
                      </div>
                      {newExam.questions.length === 0 && <p className="text-sm text-slate-500">{tr('Belum ada soal','No questions added')}</p>}
                      <div className="space-y-3 max-h-60 overflow-auto">
                        {newExam.questions.map((q, idx) => (
                          <div key={idx} className="p-3 border rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <strong>{tr('Soal','Question')} #{q.order_number}</strong>
                              <button onClick={() => handleRemoveQuestion(idx)} className="text-red-500">{tr('Hapus','Remove')}</button>
                            </div>
                            <div className="mb-2">
                              <label className="text-sm block mb-1">{tr('Instruksi','Instruction')}</label>
                              <input value={q.instruction_text} onChange={(e) => {
                                const v = e.target.value
                                setNewExam(prev => ({ ...prev, questions: prev.questions.map((qq,i) => i===idx ? { ...qq, instruction_text: v } : qq) }))
                              }} className="w-full px-3 py-2 rounded-xl border" />
                            </div>
                            <div>
                              <label className="text-sm block mb-1">{tr('Template Kode','Code Template')}</label>
                              <textarea value={q.dirty_code_template} onChange={(e) => {
                                const v = e.target.value
                                setNewExam(prev => ({ ...prev, questions: prev.questions.map((qq,i) => i===idx ? { ...qq, dirty_code_template: v } : qq) }))
                              }} className="w-full px-3 py-2 rounded-xl border resize-none" rows={4} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => {
                          setShowCreateExamModal(false)
                          setEditingExamId(null)
                        }} className="px-4 py-2 rounded-xl border">{tr('Batal','Cancel')}</button>
                      <button onClick={handleCreateExam} className="px-4 py-2 rounded-xl bg-purple-600 text-white">{editingExamId ? tr('Simpan Perubahan','Save Changes') : tr('Buat Ujian','Create Exam')}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
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
                        <button
                          onClick={() => confirmDeleteMaterial(material)}
                          className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors border border-red-200 flex items-center gap-1"
                          aria-label={`Hapus materi ${material.title}`}
                          title={`Hapus materi ${material.title}`}
                        >
                          🗑️ <span>Hapus</span>
                        </button>
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
    </div>
  )
}
