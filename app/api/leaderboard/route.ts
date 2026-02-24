import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const filterByClass = searchParams.get('kelas')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!supabaseAdmin) {
      // Kembalikan data kosong alih-alih error
      return NextResponse.json({
        success: true,
        top3: [],
        currentUser: null,
        leaderboard: [],
      })
    }

    // Coba ambil data leaderboard - handle jika tabel tidak ada atau schema berbeda
    const { data: rows, error } = await supabaseAdmin
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(100)

    // Jika error (tabel tidak ada atau masalah lain), kembalikan data kosong
    if (error) {
      console.error('Leaderboard query error:', error.message)
      return NextResponse.json({
        success: true,
        top3: [],
        currentUser: null,
        leaderboard: [],
      })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        top3: [],
        currentUser: null,
        leaderboard: [],
      })
    }

    const studentIds = rows.map((row) => row.student_id).filter(Boolean)

    const profilesMap = new Map<string, { name: string; avatar_url: string | null; kelas: string | null }>()

    if (studentIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name, full_name, avatar_url, kelas')
        .in('id', studentIds)

      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, {
          name: profile.full_name || profile.name || 'Siswa',
          avatar_url: profile.avatar_url || null,
          kelas: profile.kelas || null,
        })
      })
    }

    // Filter berdasarkan kelas jika ditentukan
    let filteredRows = rows
    if (filterByClass) {
      filteredRows = rows.filter((row) => {
        const profile = profilesMap.get(row.student_id)
        return profile?.kelas === filterByClass
      })
    }

    const leaderboard = filteredRows.map((row, index) => ({
      rank: index + 1,
      student_id: row.student_id,
      total_points: row.total_points || 0,
      total_submissions: row.total_submissions || 0,
      average_score: row.average_score || 0,
      highest_score: row.highest_score || 0,
      updated_at: row.updated_at,
      name: profilesMap.get(row.student_id)?.name || 'Siswa',
      avatar_url: profilesMap.get(row.student_id)?.avatar_url || null,
      kelas: profilesMap.get(row.student_id)?.kelas || null,
    }))

    const top3 = leaderboard.slice(0, 3)
    const currentUser = user
      ? leaderboard.find((item) => item.student_id === user.id) || null
      : null

    return NextResponse.json({
      success: true,
      top3,
      currentUser,
      leaderboard: leaderboard.slice(0, 20),
    })
  } catch (error: unknown) {
    console.error('Leaderboard load failed:', error)
    // Kembalikan data kosong alih-alih error 500 untuk mencegah masalah UI
    return NextResponse.json({
      success: true,
      top3: [],
      currentUser: null,
      leaderboard: [],
    })
  }
}
