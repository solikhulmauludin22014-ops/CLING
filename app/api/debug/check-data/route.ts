import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin not configured' })
    }

    // Cek semua profiles
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, full_name, email, role')
      .order('role')

    // Cek semua submissions  
    const { data: allSubmissions, error: submissionsError } = await supabaseAdmin
      .from('code_submissions')
      .select('id, student_id, clean_code_score, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(20)

    // Cek leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabaseAdmin
      .from('leaderboard')
      .select('*')

    return NextResponse.json({
      profiles: {
        data: allProfiles,
        error: profilesError?.message,
        count: allProfiles?.length || 0,
        byRole: {
          siswa: allProfiles?.filter(p => p.role === 'siswa').length || 0,
          guru: allProfiles?.filter(p => p.role === 'guru').length || 0,
          other: allProfiles?.filter(p => !['siswa', 'guru'].includes(p.role)).length || 0,
        }
      },
      submissions: {
        data: allSubmissions,
        error: submissionsError?.message,
        count: allSubmissions?.length || 0,
      },
      leaderboard: {
        data: leaderboard,
        error: leaderboardError?.message,
        count: leaderboard?.length || 0,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message })
  }
}
