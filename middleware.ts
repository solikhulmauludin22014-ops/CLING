import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
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

  // Route yang dilindungi
  const isGuruRoute = pathname.startsWith('/guru')
  const isSiswaRoute = pathname.startsWith('/siswa')
  const isLoginRoute = pathname === '/login'
  const isRegisterRoute = pathname === '/register'
  const isForgotPasswordRoute = pathname === '/lupa-password'
  const isResetPasswordRoute = pathname === '/reset-password'
  const isAuthCallbackRoute = pathname === '/auth/callback'
  const isAuthConfirmRoute = pathname === '/auth/confirm'
  const isProtectedRoute = isGuruRoute || isSiswaRoute

  // Lewati route auth (callback dan confirm)
  if (isAuthCallbackRoute || isAuthConfirmRoute) {
    return supabaseResponse
  }

  // Handle code parameter pada root URL (fallback ketika redirect URL tidak di-whitelist di Supabase)
  const code = request.nextUrl.searchParams.get('code')
  if (code && !isAuthCallbackRoute) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(callbackUrl)
  }

  // Handle token_hash parameter (dari email template kustom)
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  if (tokenHash && type) {
    const confirmUrl = new URL('/auth/confirm', request.url)
    confirmUrl.searchParams.set('token_hash', tokenHash)
    confirmUrl.searchParams.set('type', type)
    confirmUrl.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(confirmUrl)
  }

  // Jangan redirect user yang sedang reset password
  if (isResetPasswordRoute && user) {
    return supabaseResponse
  }

  // Belum login - redirect ke login (hanya untuk route yang dilindungi)
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ambil role user dari profile atau user_metadata
  const getUserRole = async (userId: string) => {
    // Pertama coba ambil dari tabel profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (profile?.role) {
      return profile.role
    }
    
    // Fallback ke user_metadata (diset saat registrasi)
    const { data: { user: fullUser } } = await supabase.auth.getUser()
    return fullUser?.user_metadata?.role || 'siswa'
  }

  // User yang sudah login di halaman login, register, atau lupa password - redirect ke dashboard yang sesuai
  if ((isLoginRoute || isRegisterRoute || isForgotPasswordRoute) && user) {
    const userRole = await getUserRole(user.id)

    if (userRole === 'guru') {
      return NextResponse.redirect(new URL('/guru/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/siswa/compiler', request.url))
  }

  // Kontrol akses berbasis role untuk route yang dilindungi
  if (user && isProtectedRoute) {
    const userRole = await getUserRole(user.id)

    // Guru mencoba akses route siswa
    if (isSiswaRoute && userRole === 'guru') {
      return NextResponse.redirect(new URL('/guru/dashboard', request.url))
    }

    // Siswa mencoba akses route guru
    if (isGuruRoute && userRole === 'siswa') {
      return NextResponse.redirect(new URL('/siswa/compiler', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
