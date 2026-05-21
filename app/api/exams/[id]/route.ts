import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: any }) {
  const { params } = context as { params: { id: string } }
  try {
    const supabase = await createClient()

    const examId = params?.id
    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })
    }

    const dataClient = supabaseAdmin ?? supabase

    const { data: exam, error: examError } = await dataClient
      .from('exams')
      .select('id, title, exam_type, duration_minutes, is_active')
      .eq('id', examId)
      .maybeSingle()

    if (examError) {
      console.error('Exam fetch error:', examError)
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const { data: questions, error: questionError } = await dataClient
      .from('exam_questions')
      .select('id, order_number, instruction_text, dirty_code_template')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true })

    if (questionError) {
      console.error('Exam questions error:', questionError)
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }

    return NextResponse.json({
      exam: {
        ...exam,
        questions: questions || [],
      },
    })
  } catch (error) {
    console.error('Exam load error:', error)
    return NextResponse.json({ error: 'Failed to load exam' }, { status: 500 })
  }
}
