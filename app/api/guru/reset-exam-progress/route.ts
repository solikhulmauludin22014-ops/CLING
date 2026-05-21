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
      return NextResponse.json({ error: 'Forbidden: Hanya guru yang dapat mereset ujian siswa' }, { status: 403 })
    }

    const { studentId, examId } = await request.json()

    if (!studentId || !examId) {
      return NextResponse.json({ error: 'Student ID dan Exam ID diperlukan' }, { status: 400 })
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

    const { data: examRow } = await supabaseAdmin
      .from('exams')
      .select('id, title, exam_type')
      .eq('id', examId)
      .single()

    if (!examRow) {
      return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 })
    }

    const { error: deleteSubmissionError } = await supabaseAdmin
      .from('exam_submissions')
      .delete()
      .eq('student_id', studentId)
      .eq('exam_id', examId)

    if (deleteSubmissionError) {
      console.error('Reset exam progress: delete submission error', deleteSubmissionError)
      return NextResponse.json({ error: 'Gagal mereset ujian siswa' }, { status: 500 })
    }

    const studentName = studentProfile.full_name || studentProfile.name || 'Siswa'

    return NextResponse.json({
      success: true,
      message: `Ujian "${examRow.title}" untuk siswa "${studentName}" berhasil direset`,
    })
  } catch (error: unknown) {
    console.error('Reset exam progress error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal mereset ujian siswa'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}