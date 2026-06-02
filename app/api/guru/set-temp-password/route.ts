import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&'
  let res = ''
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)]
  }
  return res
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const studentId = body?.student_id || body?.id

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

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

    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
    }

    const tempPassword = generateTempPassword(12)

    // Use admin API to update user's password
    const adminClient: any = (supabaseAdmin as any).auth?.admin ? supabaseAdmin.auth.admin : supabaseAdmin.auth

    if (!adminClient || typeof adminClient.updateUserById !== 'function') {
      console.error('admin updateUserById not available')
      return NextResponse.json({ success: false, error: 'Admin API not available' }, { status: 500 })
    }

    const { error: updateError } = await adminClient.updateUserById(studentId, { password: tempPassword })

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ success: false, error: updateError.message || 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, temp_password: tempPassword })
  } catch (err: unknown) {
    console.error('set-temp-password error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
