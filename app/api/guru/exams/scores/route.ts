import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const dataClient = supabaseAdmin ?? supabase

    const [examsResult, submissionsResult, studentsResult, questionsResult, answersResult] = await Promise.all([
      dataClient
        .from('exams')
        .select('id, title, exam_type, duration_minutes, is_active, created_at')
        .order('created_at', { ascending: false }),
      dataClient
        .from('exam_submissions')
        .select('id, exam_id, user_id, is_submitted, started_at, submitted_at, final_score')
        .order('submitted_at', { ascending: false }),
      dataClient
        .from('profiles')
        .select('id, name, full_name, nis, kelas')
        .eq('role', 'siswa'),
      dataClient
        .from('exam_questions')
        .select('id, exam_id, order_number')
        .order('order_number', { ascending: true }),
      dataClient
        .from('exam_answers')
        .select('id, submission_id, question_id, answer_score'),
    ])

    if (examsResult.error) {
      console.error('Exam score exams error:', examsResult.error)
      return NextResponse.json({ success: false, error: 'Failed to load exam scores' }, { status: 500 })
    }

    if (submissionsResult.error) {
      console.error('Exam score submissions error:', submissionsResult.error)
      return NextResponse.json({ success: false, error: 'Failed to load exam scores' }, { status: 500 })
    }

    if (studentsResult.error) {
      console.error('Exam score students error:', studentsResult.error)
      return NextResponse.json({ success: false, error: 'Failed to load exam scores' }, { status: 500 })
    }

    // Build question map: question_id -> { exam_id, order_number }
    const questionMap = new Map<string, { exam_id: string; order_number: number }>()
    ;(questionsResult.data || []).forEach((q) => {
      questionMap.set(q.id, { exam_id: q.exam_id, order_number: q.order_number })
    })

    // Build exam question count map: exam_id -> total questions
    const examQuestionCountMap = new Map<string, number>()
    ;(questionsResult.data || []).forEach((q) => {
      examQuestionCountMap.set(q.exam_id, (examQuestionCountMap.get(q.exam_id) || 0) + 1)
    })

    // Build answer map: submission_id -> Array<{ order_number, answer_score }>
    const answerMap = new Map<string, Array<{ order_number: number; answer_score: number }>>()
    ;(answersResult.data || []).forEach((answer) => {
      const questionInfo = questionMap.get(answer.question_id)
      if (!questionInfo) return
      if (!answerMap.has(answer.submission_id)) {
        answerMap.set(answer.submission_id, [])
      }
      answerMap.get(answer.submission_id)!.push({
        order_number: questionInfo.order_number,
        answer_score: Number(answer.answer_score || 0),
      })
    })

    // Sort each submission's answers by order_number
    answerMap.forEach((answers) => {
      answers.sort((a, b) => a.order_number - b.order_number)
    })

    const studentMap = new Map(
      (studentsResult.data || []).map((student) => [student.id, student])
    )

    const examMap = new Map()
    ;(examsResult.data || []).forEach((exam) => {
      examMap.set(exam.id, {
        ...exam,
        total_questions: examQuestionCountMap.get(exam.id) || 0,
        submissions: [] as Array<{
          id: string
          user_id: string
          student_name: string
          nis: string
          kelas: string
          is_submitted: boolean
          started_at: string | null
          submitted_at: string | null
          final_score: number
          answer_scores: Array<{ order_number: number; answer_score: number }>
        }>,
      })
    })

    ;(submissionsResult.data || []).forEach((submission) => {
      const examEntry = examMap.get(submission.exam_id)
      if (!examEntry) return

      const student = studentMap.get(submission.user_id)
      examEntry.submissions.push({
        id: submission.id,
        user_id: submission.user_id,
        student_name: student?.full_name || student?.name || 'Siswa',
        nis: student?.nis || '-',
        kelas: student?.kelas || '-',
        is_submitted: Boolean(submission.is_submitted),
        started_at: submission.started_at || null,
        submitted_at: submission.submitted_at || null,
        final_score: Number(submission.final_score || 0),
        answer_scores: answerMap.get(submission.id) || [],
      })
    })

    const exams = Array.from(examMap.values()).map((exam) => {
      const scores = exam.submissions.map((submission: { final_score: number }) => submission.final_score)
      const totalSubmissions = exam.submissions.length
      const averageScore = totalSubmissions > 0 ? scores.reduce((sum: number, score: number) => sum + score, 0) / totalSubmissions : 0
      const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0

      return {
        ...exam,
        total_submissions: totalSubmissions,
        average_score: averageScore,
        highest_score: highestScore,
      }
    })

    return NextResponse.json({ success: true, exams })
  } catch (error) {
    console.error('GET /api/guru/exams/scores error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}