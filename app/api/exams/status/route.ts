import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pretest } = await supabase
    .from('exams')
    .select('id, is_active')
    .eq('exam_type', 'pretest')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: posttest } = await supabase
    .from('exams')
    .select('id, is_active')
    .eq('exam_type', 'posttest')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: activeSubmission } = await supabase
    .from('exam_submissions')
    .select('exam_id')
    .eq('user_id', user.id)
    .eq('is_submitted', false)
    .maybeSingle()

  const { data: pretestSubmission } = await supabase
    .from('exam_submissions')
    .select('is_submitted')
    .eq('user_id', user.id)
    .eq('exam_id', pretest?.id || '')
    .maybeSingle()

  const { data: posttestSubmission } = await supabase
    .from('exam_submissions')
    .select('is_submitted')
    .eq('user_id', user.id)
    .eq('exam_id', posttest?.id || '')
    .maybeSingle()

  let totalMaterials = 0
  let completedMaterials = 0

  const { count: materialsCount } = await supabase
    .from('materials')
    .select('id', { count: 'exact', head: true })

  if (materialsCount) totalMaterials = materialsCount

  const { count: progressCount, error: progressError } = await supabase
    .from('material_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (!progressError && progressCount) completedMaterials = progressCount

  const allMaterialsDone = totalMaterials > 0 && completedMaterials >= totalMaterials
  const pretestDone = pretestSubmission?.is_submitted ?? false
  const posttestDone = posttestSubmission?.is_submitted ?? false
  const posttestUnlocked = Boolean(posttest?.is_active) && pretestDone && allMaterialsDone

  return NextResponse.json({
    activeExamId: activeSubmission?.exam_id ?? null,
    pretest: {
      id: pretest?.id ?? null,
      is_active: pretest?.is_active ?? false,
      done: pretestDone,
    },
    posttest: {
      id: posttest?.id ?? null,
      is_active: posttest?.is_active ?? false,
      done: posttestDone,
      unlocked: posttestUnlocked,
      materials: {
        done: completedMaterials,
        total: totalMaterials,
      },
    },
  })
}
