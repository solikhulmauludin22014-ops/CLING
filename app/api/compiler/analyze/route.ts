import { NextRequest, NextResponse } from 'next/server'
import { cleanCodeAnalyzer } from '@/lib/services/CleanCodeAnalyzer'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Analisis kode dan hitung poin yang didapat
    // Skor 0-10, konversi ke persentase (0-100%)
    const analysis = await cleanCodeAnalyzer.analyze(code)
    const scorePercentage = Math.round(analysis.final_score * 10) // Konversi ke 0-100%
    const pointsEarned = scorePercentage // Poin = persentase

    // Ambil role user jika sudah login
    let userRole: string | null = null
    if (user && !authError) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      userRole = profile?.role || null
    }

    // Simpan submission hanya untuk siswa yang sudah login
    if (user && !authError && userRole === 'siswa') {
      console.log('=== SAVING FOR SISWA ===')
      console.log('User ID:', user.id)
      console.log('Points to add:', pointsEarned)
      
      const { data: insertData, error: insertError } = await supabase.from('code_submissions').insert({
        student_id: user.id,
        code,
        clean_code_score: analysis.final_score,
        grade: analysis.grade,
        analysis_result: analysis,
        submitted_at: new Date().toISOString(),
      }).select()

      if (insertError) {
        console.error('Failed to insert submission:', insertError)
      } else {
        console.log('Submission inserted successfully')
      }

      // Update leaderboard menggunakan service role
      await updateLeaderboardPoints(user.id, pointsEarned, analysis.final_score)
    } else {
      console.log('=== NOT SAVING ===')
      console.log('user:', !!user, 'authError:', !!authError, 'userRole:', userRole)
    }

    return NextResponse.json({
      success: true,
      analysis,
      requires_login: !user,
      userRole: userRole,
      pointsSaved: userRole === 'siswa',
    })
  } catch (error: unknown) {
    console.error('Analyze error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function updateLeaderboardPoints(studentId: string, pointsEarned: number, score: number) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    console.warn('Skip leaderboard update: missing service role env')
    return
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')

    if (!supabaseAdmin) {
      console.warn('Skip leaderboard update: admin client not configured')
      return
    }

    console.log('Updating leaderboard for student:', studentId, 'points:', pointsEarned, 'score:', score)

    // Ambil data yang sudah ada
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('leaderboard')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle()

    if (selectError) {
      console.error('Error selecting leaderboard:', selectError)
    }

    console.log('Existing leaderboard data:', existing)

    // Hitung nilai baru
    const newTotalPoints = (existing?.total_points || 0) + pointsEarned
    const newTotalSubmissions = (existing?.total_submissions || 0) + 1
    
    // Ambil semua submission siswa untuk menghitung rata-rata yang akurat
    const { data: allSubmissions } = await supabaseAdmin
      .from('code_submissions')
      .select('clean_code_score')
      .eq('student_id', studentId)
    
    // Hitung rata-rata dari submission yang ada
    const totalScore = allSubmissions?.reduce((sum, s) => sum + (s.clean_code_score || 0), 0) || score
    const submissionCount = allSubmissions?.length || 1
    const newAverageScore = totalScore / submissionCount
    const newHighestScore = Math.max(existing?.highest_score || 0, score)

    console.log('New values:', { newTotalPoints, newTotalSubmissions, newAverageScore, newHighestScore })

    // Upsert data ke leaderboard
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('leaderboard')
      .upsert(
        {
          student_id: studentId,
          total_points: newTotalPoints,
          total_submissions: newTotalSubmissions,
          average_score: newAverageScore,
          highest_score: newHighestScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
      .select()

    if (upsertError) {
      console.error('Leaderboard upsert error:', upsertError)
    } else {
      console.log('Leaderboard updated successfully:', upsertData)
    }
  } catch (error) {
    console.error('Leaderboard update failed:', error)
  }
}
