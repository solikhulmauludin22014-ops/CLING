import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, nis, nip, kelas } = body

    // Validasi field wajib
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan role wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi role
    if (!['siswa', 'guru'].includes(role)) {
      return NextResponse.json(
        { error: 'Role harus siswa atau guru' },
        { status: 400 }
      )
    }

    // Validasi password: minimal 6 karakter dan mengandung angka
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung minimal 1 angka' },
        { status: 400 }
      )
    }

    // Validasi field khusus berdasarkan role
    if (role === 'siswa') {
      if (!nis) {
        return NextResponse.json(
          { error: 'NIS wajib diisi untuk siswa' },
          { status: 400 }
        )
      }
      if (!kelas) {
        return NextResponse.json(
          { error: 'Kelas wajib diisi untuk siswa' },
          { status: 400 }
        )
      }
    }

    if (role === 'guru') {
      // Validasi kode token sekolah untuk guru
      const { kodeToken } = body
      const VALID_TEACHER_TOKEN = 'ae45-bb91-c001-f5a2'
      
      if (!kodeToken) {
        return NextResponse.json(
          { error: 'Kode Token Sekolah wajib diisi untuk guru' },
          { status: 400 }
        )
      }
      
      if (kodeToken !== VALID_TEACHER_TOKEN) {
        return NextResponse.json(
          { error: 'Kode Token Sekolah tidak valid. Hubungi administrator sekolah.' },
          { status: 400 }
        )
      }
    }

    // Buat Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Buat user di auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Konfirmasi email otomatis
      user_metadata: {
        name,
        full_name: name,  // Simpan juga sebagai full_name
        role,
        nis: role === 'siswa' ? nis : null,
        kelas: role === 'siswa' ? kelas : null,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      if (authError.message.includes('already')) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Gagal membuat akun' },
        { status: 500 }
      )
    }

    // Masukkan ke tabel profiles - PENTING: harus berhasil
    const profileData = {
      id: authData.user.id,
      email,
      name,
      full_name: name,
      role,
      nis: role === 'siswa' ? nis : null,
      kelas: role === 'siswa' ? kelas : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    console.log('Creating profile with data:', profileData)
    
    const { data: profileResult, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()

    if (profileError) {
      console.error('Profile error:', profileError)
      // Coba insert tanpa upsert
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
      
      if (insertError) {
        console.error('Profile insert also failed:', insertError)
      }
    } else {
      console.log('Profile created successfully:', profileResult)
    }

    // Jika siswa, buat entry leaderboard kosong
    if (role === 'siswa') {
      await supabaseAdmin.from('leaderboard').upsert({
        student_id: authData.user.id,
        total_points: 0,
        total_submissions: 0,
        average_score: 0,
        highest_score: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })
    }

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
    })
  } catch (error: unknown) {
    console.error('Register error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Registrasi gagal'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
