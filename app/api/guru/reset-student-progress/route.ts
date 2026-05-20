import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID diperlukan' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, name, full_name')
      .eq('id', studentId)
      .single()

    if (!studentProfile) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    if (studentProfile.role !== 'siswa') {
      return NextResponse.json({ error: 'Hanya akun siswa yang dapat direset' }, { status: 400 })
    }

    const { error: deleteSubmissionsError } = await supabaseAdmin
      .from('code_submissions')
      .delete()
      .eq('student_id', studentId)

    if (deleteSubmissionsError) {
      console.error('Reset progress: delete submissions error', deleteSubmissionsError)
      return NextResponse.json({ error: 'Gagal menghapus submissions siswa' }, { status: 500 })
    }

    const { error: resetLeaderboardError } = await supabaseAdmin
      .from('leaderboard')
      .upsert(
        {
          student_id: studentId,
          total_points: 0,
          total_submissions: 0,
          average_score: 0,
          highest_score: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )

    if (resetLeaderboardError) {
      console.error('Reset progress: leaderboard error', resetLeaderboardError)
      return NextResponse.json({ error: 'Gagal mereset leaderboard siswa' }, { status: 500 })
    }

    const studentName = studentProfile.full_name || studentProfile.name || 'Siswa'

    return NextResponse.json({
      success: true,
      message: `Progress siswa "${studentName}" berhasil direset`,
    })
  } catch (error: unknown) {
    console.error('Reset progress error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal mereset progress siswa'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
