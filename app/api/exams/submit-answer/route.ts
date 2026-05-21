import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cleanCodeAnalyzer } from '@/lib/services/CleanCodeAnalyzer'

export const dynamic = 'force-dynamic'

type SubmitAnswerPayload = {
  examId: string
  questionId: string
  answerCode: string
  runStatus?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await request.json()) as SubmitAnswerPayload
    const { examId, questionId, answerCode, runStatus } = payload

    if (!examId || !questionId || typeof answerCode !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? supabase
    const analysis = await cleanCodeAnalyzer.analyze(answerCode, 'id')
    const answerScore = analysis.final_score

    const { data: existingSubmission, error: submissionError } = await dataClient
      .from('exam_submissions')
      .select('id, is_submitted')
      .eq('exam_id', examId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (submissionError) {
      console.error('Submission lookup error:', submissionError)
      return NextResponse.json({ success: false, error: 'Failed to save answer', detail: submissionError.message || submissionError }, { status: 500 })
    }

    if (existingSubmission?.is_submitted) {
      return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 })
    }

    let submissionId = existingSubmission?.id

    if (!submissionId) {
      const { data: createdSubmission, error: createError } = await dataClient
        .from('exam_submissions')
        .insert({
          exam_id: examId,
          user_id: user.id,
          is_submitted: false,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (createError || !createdSubmission) {
        console.error('Submission create error:', createError)
        return NextResponse.json({ success: false, error: 'Failed to start exam', detail: createError?.message || createError }, { status: 500 })
      }

      submissionId = createdSubmission.id
    }

    let answerError = null
    try {
      const result = await dataClient
        .from('exam_answers')
        .upsert(
          {
            submission_id: submissionId,
            question_id: questionId,
            answer_code: answerCode,
            answer_score: answerScore,
            analysis_result: analysis,
            run_status: runStatus || 'not_run',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'submission_id,question_id' }
        )

      answerError = result.error
      // If error indicates missing column (schema mismatch), try fallback without analysis_result
      if (answerError && /analysis_result/.test(answerError.message || '')) {
        console.warn('analysis_result column missing, retrying upsert without analysis_result')
        const fallback = await dataClient
          .from('exam_answers')
          .upsert(
            {
              submission_id: submissionId,
              question_id: questionId,
              answer_code: answerCode,
              answer_score: answerScore,
              run_status: runStatus || 'not_run',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'submission_id,question_id' }
          )
        answerError = fallback.error
      }
    } catch (e) {
      console.error('Answer upsert exception:', e)
      return NextResponse.json({ success: false, error: 'Failed to save answer', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }

    if (answerError) {
      console.error('Answer upsert error:', answerError)
      return NextResponse.json({ success: false, error: 'Failed to save answer', detail: answerError.message || answerError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      question_score: answerScore,
      analysis,
    })
  } catch (error) {
    console.error('Submit answer error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: 'Failed to save answer', detail: msg }, { status: 500 })
  }
}
