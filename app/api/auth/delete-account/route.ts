import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify password confirmation from request body
    const { confirmText } = await request.json()

    if (confirmText !== 'HAPUS AKUN') {
      return NextResponse.json(
        { error: 'Konfirmasi tidak valid. Ketik "HAPUS AKUN" untuk menghapus.' },
        { status: 400 }
      )
    }

    // Use admin client to delete user data and auth account
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { supabaseAdmin } = await import('@/lib/supabase/admin')

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not configured' },
        { status: 500 }
      )
    }

    const userId = user.id

    // Get user role to determine which data to clean up
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const userRole = profile?.role || 'siswa'

    // Delete related data based on role
    if (userRole === 'siswa') {
      // Delete leaderboard entry
      await supabaseAdmin
        .from('leaderboard')
        .delete()
        .eq('student_id', userId)

      // Delete code submissions
      await supabaseAdmin
        .from('code_submissions')
        .delete()
        .eq('student_id', userId)
    }

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    // Delete avatar from storage if exists
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list('avatars', {
        search: userId,
      })

    if (avatarFiles && avatarFiles.length > 0) {
      const filesToDelete = avatarFiles.map((f) => `avatars/${f.name}`)
      await supabaseAdmin.storage.from('avatars').remove(filesToDelete)
    }

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return NextResponse.json(
        { error: 'Gagal menghapus akun: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus' })
  } catch (error: unknown) {
    console.error('Delete account error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus akun'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
