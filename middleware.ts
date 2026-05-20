import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Lewati API routes dan file statis
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return supabaseResponse
  }

  const isGuruRoute = pathname.startsWith('/guru')
  const isSiswaRoute = pathname.startsWith('/siswa')
  const isExamRoute = pathname.startsWith('/exams')
  const isLoginRoute = pathname === '/login'
  const isRegisterRoute = pathname === '/register'
  const isForgotPasswordRoute = pathname === '/lupa-password'
  const isResetPasswordRoute = pathname === '/reset-password'
  const isAuthCallbackRoute = pathname === '/auth/callback'
  const isAuthConfirmRoute = pathname === '/auth/confirm'
  const isProtectedRoute = isGuruRoute || isSiswaRoute || isExamRoute

  if (isAuthCallbackRoute || isAuthConfirmRoute) {
    return supabaseResponse
  }

  const code = request.nextUrl.searchParams.get('code')
  if (code && !isAuthCallbackRoute) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(callbackUrl)
  }

  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  if (tokenHash && type) {
    const confirmUrl = new URL('/auth/confirm', request.url)
    confirmUrl.searchParams.set('token_hash', tokenHash)
    confirmUrl.searchParams.set('type', type)
    confirmUrl.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(confirmUrl)
  }

  if (isResetPasswordRoute && user) {
    return supabaseResponse
  }

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const getUserRole = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role) {
      return profile.role
    }

    const { data: { user: fullUser } } = await supabase.auth.getUser()
    return fullUser?.user_metadata?.role || 'siswa'
  }

  if ((isLoginRoute || isRegisterRoute || isForgotPasswordRoute) && user) {
    const userRole = await getUserRole(user.id)
    if (userRole === 'guru') {
      return NextResponse.redirect(new URL('/guru/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/siswa/compiler', request.url))
  }

  if (user && isProtectedRoute) {
    const userRole = await getUserRole(user.id)

    if ((isSiswaRoute || isExamRoute) && userRole === 'guru') {
      return NextResponse.redirect(new URL('/guru/dashboard', request.url))
    }

    if (isGuruRoute && userRole === 'siswa') {
      return NextResponse.redirect(new URL('/siswa/compiler', request.url))
    }
  }

  // Lock navigation saat ujian aktif (khusus siswa)
  if (user) {
    const userRole = await getUserRole(user.id)

    if (userRole === 'siswa') {
      const { data: activeExam } = await supabase
        .from('exam_submissions')
        .select('exam_id')
        .eq('user_id', user.id)
        .eq('is_submitted', false)
        .maybeSingle()

      if (activeExam?.exam_id) {
        const examPath = `/exams/${activeExam.exam_id}`
        const isExamPath = pathname.startsWith(examPath)
        if (!isExamPath) {
          return NextResponse.redirect(new URL(examPath, request.url))
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}