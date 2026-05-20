import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dataClient = supabaseAdmin ?? (await createClient())

    const { data: exams, error } = await dataClient
      .from('exams')
      .select('id, title, exam_type, duration_minutes, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch exams:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch exams' }, { status: 500 })
    }

    return NextResponse.json({ success: true, exams: exams || [] })
  } catch (err) {
    console.error('GET /api/guru/exams error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

type CreateExamPayload = {
  title: string
  exam_type: 'pretest' | 'posttest'
  duration_minutes?: number
  is_active?: boolean
  questions?: Array<{
    order_number: number
    instruction_text: string
    dirty_code_template: string
  }>
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

    // Verify teacher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const payload = (await request.json()) as CreateExamPayload

    if (!payload?.title || !payload?.exam_type) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? supabase

    const { data: createdExam, error: createError } = await dataClient
      .from('exams')
      .insert({
        title: payload.title,
        exam_type: payload.exam_type,
        duration_minutes: payload.duration_minutes ?? 60,
        is_active: !!payload.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError || !createdExam) {
      console.error('Create exam error:', createError)
      return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 })
    }

    const examId = createdExam.id

    if (payload.questions && payload.questions.length > 0) {
      const questionsToInsert = payload.questions.map((q) => ({
        exam_id: examId,
        order_number: q.order_number,
        instruction_text: q.instruction_text,
        dirty_code_template: q.dirty_code_template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: qError } = await dataClient.from('exam_questions').insert(questionsToInsert)
      if (qError) {
        console.error('Insert questions error:', qError)
        return NextResponse.json({ success: false, error: 'Exam created but failed to insert questions' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, examId })
  } catch (err) {
    console.error('POST /api/guru/exams error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
