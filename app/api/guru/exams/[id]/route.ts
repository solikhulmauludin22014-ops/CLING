import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function assertGuru() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'guru') {
    return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}

type ExamQuestionInput = {
  order_number: number
  instruction_text: string
  dirty_code_template: string
}

type UpdateExamPayload = {
  title?: string
  exam_type?: 'pretest' | 'posttest'
  duration_minutes?: number
  is_active?: boolean
  questions?: ExamQuestionInput[]
}

async function resolveExamId(request: NextRequest, context: { params: any }, payload?: { id?: string }) {
  const params = (await Promise.resolve(context.params)) as { id?: string } | undefined
  const fromParams = params?.id
  if (fromParams) return fromParams

  const fromQuery = new URL(request.url).searchParams.get('id')
  if (fromQuery) return fromQuery

  return payload?.id || null
}

export async function PATCH(request: NextRequest, context: { params: any }) {
  try {
    const auth = await assertGuru()
    if ('error' in auth) return auth.error

    const payload = (await request.json()) as UpdateExamPayload & { id?: string }
    const examId = await resolveExamId(request, context, payload)
    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? auth.supabase

    const { error: updateError } = await dataClient
      .from('exams')
      .update({
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.exam_type !== undefined ? { exam_type: payload.exam_type } : {}),
        ...(payload.duration_minutes !== undefined ? { duration_minutes: payload.duration_minutes } : {}),
        ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)

    if (updateError) {
      console.error('Update exam error:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update exam' }, { status: 500 })
    }

    if (payload.questions) {
      const { error: deleteQuestionsError } = await dataClient.from('exam_questions').delete().eq('exam_id', examId)
      if (deleteQuestionsError) {
        console.error('Delete old questions error:', deleteQuestionsError)
        return NextResponse.json({ success: false, error: 'Failed to replace exam questions' }, { status: 500 })
      }

      if (payload.questions.length > 0) {
        const questionsToInsert = payload.questions.map((q) => ({
          exam_id: examId,
          order_number: q.order_number,
          instruction_text: q.instruction_text,
          dirty_code_template: q.dirty_code_template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { error: insertError } = await dataClient.from('exam_questions').insert(questionsToInsert)
        if (insertError) {
          console.error('Insert updated questions error:', insertError)
          return NextResponse.json({ success: false, error: 'Failed to update exam questions' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/guru/exams/[id] error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: any }) {
  try {
    const auth = await assertGuru()
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({} as { id?: string }))
    const examId = await resolveExamId(request, context, body)
    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? auth.supabase

    const { error } = await dataClient.from('exams').delete().eq('id', examId)
    if (error) {
      console.error('Delete exam error:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete exam' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/guru/exams/[id] error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
