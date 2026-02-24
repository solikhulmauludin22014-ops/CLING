import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Fungsi helper untuk mendapatkan rentang tanggal hari ini
function getTodayRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    start: today.toISOString(),
    end: tomorrow.toISOString()
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verifikasi user adalah guru
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cek apakah supabaseAdmin sudah dikonfigurasi
    if (!supabaseAdmin) {
      console.error('Admin client not configured')
      return NextResponse.json({ 
        success: true,
        students: [],
        stats: {
          total_students: 0,
          total_submissions: 0,
          class_average: 0,
          highest_score: 0,
        },
      })
    }

    // Ambil rentang tanggal hari ini untuk skor harian
    const todayRange = getTodayRange()

    // Ambil semua profil siswa
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, full_name, email, role, nis, kelas')
      .eq('role', 'siswa')
      .order('kelas')
      .order('name')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      throw studentsError
    }

    console.log('Found students:', students?.length || 0)

    // Ambil data leaderboard
    const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
      .from('leaderboard')
      .select('student_id, total_points, total_submissions, average_score, highest_score')

    if (leaderboardError) {
      console.error('Leaderboard error (table might not exist):', leaderboardError.message)
    }

    console.log('Leaderboard data:', leaderboardData?.length || 0)

    // Buat map dari data leaderboard
    const leaderboardMap = new Map()
    leaderboardData?.forEach((entry) => {
      leaderboardMap.set(entry.student_id, entry)
    })

    // Ambil statistik submission langsung dari code_submissions sebagai fallback
    const { data: submissionStats, error: submissionError } = await supabaseAdmin
      .from('code_submissions')
      .select('student_id, clean_code_score, submitted_at')
      .order('submitted_at', { ascending: false })

    if (submissionError) {
      console.error('Submission stats error:', submissionError.message)
    }

    console.log('Submission stats:', submissionStats?.length || 0)

    // Ambil submission hari ini untuk skor harian (skor real-time)
    const { data: todaySubmissions, error: todayError } = await supabaseAdmin
      .from('code_submissions')
      .select('student_id, clean_code_score, submitted_at')
      .gte('submitted_at', todayRange.start)
      .lt('submitted_at', todayRange.end)
      .order('submitted_at', { ascending: false })

    if (todayError) {
      console.error('Today submissions error:', todayError.message)
    }

    console.log('Today submissions:', todaySubmissions?.length || 0)

    // Hitung statistik harian untuk setiap siswa
    const dailyStatsMap = new Map<string, {
      daily_submissions: number;
      daily_total_score: number;
      daily_highest_score: number;
      daily_average_score: number;
    }>()

    todaySubmissions?.forEach((sub) => {
      const existing = dailyStatsMap.get(sub.student_id)
      if (existing) {
        existing.daily_submissions += 1
        existing.daily_total_score += sub.clean_code_score || 0
        existing.daily_highest_score = Math.max(existing.daily_highest_score, sub.clean_code_score || 0)
        existing.daily_average_score = existing.daily_total_score / existing.daily_submissions
      } else {
        dailyStatsMap.set(sub.student_id, {
          daily_submissions: 1,
          daily_total_score: sub.clean_code_score || 0,
          daily_highest_score: sub.clean_code_score || 0,
          daily_average_score: sub.clean_code_score || 0,
        })
      }
    })

    // Hitung statistik dari submissions jika leaderboard kosong
    const submissionMap = new Map<string, { 
      total: number; 
      count: number; 
      highest: number; 
      latest: string | null 
    }>()

    submissionStats?.forEach((sub) => {
      const existing = submissionMap.get(sub.student_id)
      if (existing) {
        existing.total += sub.clean_code_score || 0
        existing.count += 1
        existing.highest = Math.max(existing.highest, sub.clean_code_score || 0)
      } else {
        submissionMap.set(sub.student_id, {
          total: sub.clean_code_score || 0,
          count: 1,
          highest: sub.clean_code_score || 0,
          latest: sub.submitted_at,
        })
      }
    })

    // Gabungkan data siswa dengan statistik (prioritas leaderboard, fallback ke submissions)
    const studentsWithStats = students?.map((student) => {
      const leaderboard = leaderboardMap.get(student.id)
      const submissions = submissionMap.get(student.id)
      const dailyStats = dailyStatsMap.get(student.id)

      // Gunakan leaderboard jika tersedia, jika tidak hitung dari submissions
      const totalSubmissions = leaderboard?.total_submissions || submissions?.count || 0
      const totalPoints = leaderboard?.total_points || Math.round((submissions?.total || 0) * 10)
      const averageScore = leaderboard?.average_score || 
        (submissions?.count ? submissions.total / submissions.count : 0)
      const highestScore = leaderboard?.highest_score || submissions?.highest || 0
      const latestSubmission = submissions?.latest || null

      // Skor harian/real-time (reset setiap hari)
      const dailyScore = dailyStats?.daily_average_score || 0
      const dailySubmissions = dailyStats?.daily_submissions || 0
      const dailyHighestScore = dailyStats?.daily_highest_score || 0

      return {
        id: student.id,
        name: student.full_name || student.name || 'Siswa',
        email: student.email || '-',
        nis: student.nis || '-',
        kelas: student.kelas || '-',
        total_submissions: totalSubmissions,
        total_points: totalPoints,
        average_score: averageScore,
        highest_score: highestScore,
        latest_submission: latestSubmission,
        // Field harian/real-time baru
        daily_score: dailyScore,
        daily_submissions: dailySubmissions,
        daily_highest_score: dailyHighestScore,
      }
    }) || []

    // Hitung statistik kelas
    const totalStudents = studentsWithStats.length
    const totalSubmissions = studentsWithStats.reduce(
      (sum, s) => sum + s.total_submissions,
      0
    )
    const classAverage =
      totalStudents > 0
        ? studentsWithStats.reduce((sum, s) => sum + s.average_score, 0) /
          totalStudents
        : 0
    const highestScore = Math.max(
      ...studentsWithStats.map((s) => s.highest_score),
      0
    )

    console.log('Returning students:', studentsWithStats.length)

    return NextResponse.json({
      success: true,
      students: studentsWithStats,
      stats: {
        total_students: totalStudents,
        total_submissions: totalSubmissions,
        class_average: classAverage,
        highest_score: highestScore,
      },
    })
  } catch (error: unknown) {
    console.error('Error loading student data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
    return NextResponse.json(
      { success: false, error: errorMessage, students: [], stats: { total_students: 0, total_submissions: 0, class_average: 0, highest_score: 0 } },
      { status: 500 }
    )
  }
}
