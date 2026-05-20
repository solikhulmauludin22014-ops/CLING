import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden: Hanya guru yang dapat mereset progress siswa' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'siswa')

    if (studentsError) {
      console.error('Reset all progress: fetch students error', studentsError)
      return NextResponse.json({ error: 'Gagal mengambil data siswa' }, { status: 500 })
    }

    const studentIds = (students || []).map((student) => student.id)

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada siswa untuk direset' })
    }

    const { error: deleteSubmissionsError } = await supabaseAdmin
      .from('code_submissions')
      .delete()
      .in('student_id', studentIds)

    if (deleteSubmissionsError) {
      console.error('Reset all progress: delete submissions error', deleteSubmissionsError)
      return NextResponse.json({ error: 'Gagal menghapus submissions siswa' }, { status: 500 })
    }

    const resetPayload = studentIds.map((studentId) => ({
      student_id: studentId,
      total_points: 0,
      total_submissions: 0,
      average_score: 0,
      highest_score: 0,
      updated_at: new Date().toISOString(),
    }))

    const { error: resetLeaderboardError } = await supabaseAdmin
      .from('leaderboard')
      .upsert(resetPayload, { onConflict: 'student_id' })

    if (resetLeaderboardError) {
      console.error('Reset all progress: leaderboard error', resetLeaderboardError)
      return NextResponse.json({ error: 'Gagal mereset leaderboard siswa' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Semua progress siswa berhasil direset',
      totalStudents: studentIds.length,
    })
  } catch (error: unknown) {
    console.error('Reset all progress error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal mereset progress siswa'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
