import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ success: false, error: 'Forbidden: Hanya guru yang dapat mereset ujian siswa' }, { status: 403 })
    }

    const { studentId, examId } = await request.json()

    if (!studentId || !examId) {
      return NextResponse.json({ success: false, error: 'Student ID dan Exam ID diperlukan' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      console.error('Reset exam progress: supabaseAdmin not configured; isAdminConfigured=', isAdminConfigured)
      return NextResponse.json(
        { success: false, error: 'Admin client not configured', isAdminConfigured: Boolean(isAdminConfigured) },
        { status: 500 }
      )
    }

    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, name, full_name')
      .eq('id', studentId)
      .single()

    if (!studentProfile) {
      return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    if (studentProfile.role !== 'siswa') {
      return NextResponse.json({ success: false, error: 'Hanya akun siswa yang dapat direset' }, { status: 400 })
    }

    const { data: examRow } = await supabaseAdmin
      .from('exams')
      .select('id, title, exam_type')
      .eq('id', examId)
      .single()

    if (!examRow) {
      return NextResponse.json({ success: false, error: 'Ujian tidak ditemukan' }, { status: 404 })
    }

    console.log('Reset exam progress: deleting submissions for', { studentId, examId })
    const { data: deletedSubmissions, error: deleteSubmissionError } = await supabaseAdmin
      .from('exam_submissions')
      .delete()
      .match({ user_id: studentId, exam_id: examId })

    if (deleteSubmissionError) {
      console.error('Reset exam progress: delete submission error', deleteSubmissionError)
      const errMsg = (deleteSubmissionError as any)?.message || JSON.stringify(deleteSubmissionError)
      return NextResponse.json({ success: false, error: 'Gagal mereset ujian siswa', detail: errMsg }, { status: 500 })
    }

    // If nothing was deleted, respond with a helpful message
    const deletedCount = Array.isArray(deletedSubmissions) ? deletedSubmissions.length : (deletedSubmissions ? 1 : 0)

    if (deleteSubmissionError) {
      console.error('Reset exam progress: delete submission error', deleteSubmissionError)
      const errMsg = (deleteSubmissionError as any)?.message || JSON.stringify(deleteSubmissionError)
      return NextResponse.json({ success: false, error: 'Gagal mereset ujian siswa', detail: errMsg, isAdminConfigured: Boolean(isAdminConfigured) }, { status: 500 })
    }

    if (deletedCount === 0) {
      console.warn('Reset exam progress: no submissions deleted', { studentId, examId })
      return NextResponse.json({ success: false, error: 'Tidak ada submission yang ditemukan untuk direset', deletedCount, isAdminConfigured: Boolean(isAdminConfigured) }, { status: 404 })
    }

    const studentName = studentProfile.full_name || studentProfile.name || 'Siswa'

    return NextResponse.json({
      success: true,
      message: `Ujian "${examRow.title}" untuk siswa "${studentName}" berhasil direset`,
      deletedCount,
    })
  } catch (error: unknown) {
    console.error('Reset exam progress error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal mereset ujian siswa'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}