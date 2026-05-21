import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type SubmitAllPayload = {
  examId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await request.json()) as SubmitAllPayload
    const { examId } = payload

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? supabase

    const { data: submission, error: submissionError } = await dataClient
      .from('exam_submissions')
      .select('id, is_submitted')
      .eq('exam_id', examId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (submissionError) {
      console.error('Submission lookup error:', submissionError)
      return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 })
    }

    if (submission?.is_submitted) {
      return NextResponse.json({ success: true, final_score: 0 })
    }

    if (!submission) {
      const { data: createdSubmission, error: createError } = await dataClient
        .from('exam_submissions')
        .insert({
          exam_id: examId,
          user_id: user.id,
          is_submitted: true,
          started_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          final_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (createError || !createdSubmission) {
        console.error('Submission create error:', createError)
        return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 })
      }

      return NextResponse.json({ success: true, final_score: 0 })
    }

    const { data: questions, error: questionError } = await dataClient
      .from('exam_questions')
      .select('id')
      .eq('exam_id', examId)

    if (questionError) {
      console.error('Question count error:', questionError)
    }

    const { data: answers, error: answerError } = await dataClient
      .from('exam_answers')
      .select('answer_score')
      .eq('submission_id', submission.id)

    if (answerError) {
      console.error('Answer count error:', answerError)
    }

    const totalQuestions = questions?.length || 0
    const answeredQuestions = answers?.length || 0

    if (answeredQuestions === 0) {
      return NextResponse.json({ error: 'Belum ada jawaban yang tersimpan' }, { status: 400 })
    }

    const totalScore = (answers || []).reduce((sum, answer) => sum + Number(answer.answer_score || 0), 0)
    const rawScore = totalScore / answeredQuestions
    const finalScore = Math.round(rawScore * 100) / 100

    const { error: updateError } = await dataClient
      .from('exam_submissions')
      .update({
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        final_score: finalScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.id)

    if (updateError) {
      console.error('Submission update error:', updateError)
      return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 })
    }

    return NextResponse.json({ success: true, final_score: finalScore })
  } catch (error) {
    console.error('Submit exam error:', error)
    return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 })
  }
}
