import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verifikasi autentikasi
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verifikasi user adalah guru
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden: Hanya guru yang dapat menghapus akun siswa' }, { status: 403 })
    }

    // Ambil student_id dari request body
    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID diperlukan' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // Verifikasi bahwa user yang akan dihapus memang seorang siswa
    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, name')
      .eq('id', studentId)
      .single()

    if (!studentProfile) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    if (studentProfile.role !== 'siswa') {
      return NextResponse.json({ error: 'Hanya akun siswa yang dapat dihapus' }, { status: 400 })
    }

    // Hapus data leaderboard siswa
    await supabaseAdmin
      .from('leaderboard')
      .delete()
      .eq('student_id', studentId)

    // Hapus data code_submissions siswa
    await supabaseAdmin
      .from('code_submissions')
      .delete()
      .eq('student_id', studentId)

    // Hapus profil siswa
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', studentId)

    // Hapus avatar dari storage jika ada
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list('avatars', {
        search: studentId,
      })

    if (avatarFiles && avatarFiles.length > 0) {
      const filesToDelete = avatarFiles.map((f) => `avatars/${f.name}`)
      await supabaseAdmin.storage.from('avatars').remove(filesToDelete)
    }

    // Hapus auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId)

    if (deleteError) {
      console.error('Error deleting student auth user:', deleteError)
      return NextResponse.json(
        { error: 'Gagal menghapus akun siswa: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Akun siswa "${studentProfile.name}" berhasil dihapus` 
    })
  } catch (error: unknown) {
    console.error('Delete student error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus akun siswa'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
