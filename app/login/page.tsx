'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme()
  const { language } = useLanguage()
  const tr = (id: string, en: string) => (language === 'id' ? id : en)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVisualFallback, setShowVisualFallback] = useState(false)
  const loginVisualSrc = '/images/login-coding.gif'

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setForgotError('')
    setForgotLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      })

      if (resetError) {
        setForgotError(resetError.message)
        setForgotLoading(false)
        return
      }

      setForgotSuccess(true)
    } catch (err) {
      setForgotError(tr('Terjadi kesalahan. Silakan coba lagi.', 'An error occurred. Please try again.'))
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgotPassword = () => {
    setShowForgotPassword(false)
    setForgotEmail('')
    setForgotError('')
    setForgotSuccess(false)
    setForgotLoading(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError(tr('Email atau password salah.', 'Incorrect email or password.'))
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const userRole = profile?.role || 'siswa'
        
        if (userRole === 'guru') {
          window.location.href = '/guru/dashboard'
        } else {
          window.location.href = '/siswa/compiler'
        }
      }
    } catch (err) {
      setError(tr('Terjadi kesalahan. Silakan coba lagi.', 'An error occurred. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-purple-50'
    }`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-20 -left-24 w-72 h-72 rounded-full blur-3xl opacity-60 animate-pulse ${theme === 'dark' ? 'bg-purple-900/50' : 'bg-purple-200'}`}></div>
        <div className={`absolute -bottom-20 -right-16 w-80 h-80 rounded-full blur-3xl opacity-60 animate-pulse ${theme === 'dark' ? 'bg-fuchsia-900/40' : 'bg-fuchsia-200'}`} style={{ animationDelay: '0.8s' }}></div>
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)]' : 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12),transparent_65%)]'}`}></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-3 rounded-full transition-all shadow-lg ${
          theme === 'dark'
            ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
            : 'bg-white hover:bg-purple-100 text-purple-600'
        }`}
        title={theme === 'dark' ? tr('Mode Terang', 'Light Mode') : tr('Mode Gelap', 'Dark Mode')}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.02fr] gap-8 lg:gap-10 items-center">
        <div className="w-full max-w-md lg:max-w-xl mx-auto login-panel">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center space-x-4">
              <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-lg">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-purple-700'}`}>
                CLING
              </h1>
              <p className={theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}>
                Clean Learning Integrated Gateway (Online Compiler Python)
              </p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className={`rounded-2xl shadow-xl p-8 border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-purple-100'
        }`}>
          <h2 className={`text-2xl font-bold text-center mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          }`}>
            {tr('Selamat Datang!', 'Welcome Back!')}
          </h2>
          <p className={`text-center mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {tr('Masuk untuk mulai coding', 'Sign in to start coding')}
          </p>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <span>❌</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {tr('📧 Email', '📧 Email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                  theme === 'dark'
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {tr('🔒 Password', '🔒 Password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                  theme === 'dark'
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {tr('Memproses...', 'Processing...')}
                </span>
              ) : (
                tr('🚀 Masuk', '🚀 Login')
              )}
            </button>
          </form>

          <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email) // Pre-fill with login email if available
                  setShowForgotPassword(true)
                }}
                className={`text-sm transition-colors cursor-pointer ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-500 hover:text-purple-700'}`}
              >
                {tr('Lupa password?', 'Forgot password?')}
              </button>
            </div>
            <p className={`text-sm text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {tr('Belum punya akun?', "Don't have an account?")}{' '}
              <Link href="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                {tr('Daftar di sini', 'Register here')}
              </Link>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className={`transition-colors inline-flex items-center gap-2 ${
              theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
            }`}
          >
            {tr('← Kembali ke Beranda', '← Back to Home')}
          </Link>
        </div>

        </div>

        <div className="w-full max-w-xl lg:max-w-none mx-auto visual-panel">
          <div
            className={`relative overflow-hidden rounded-3xl border shadow-2xl h-[320px] sm:h-[380px] lg:h-[640px] ${
              theme === 'dark'
                ? 'bg-slate-800 border-purple-700/40 shadow-purple-900/40'
                : 'bg-white border-purple-200 shadow-purple-200/70'
            }`}
          >
            <div className={`absolute inset-0 pointer-events-none ${theme === 'dark' ? 'bg-gradient-to-br from-purple-500/20 via-transparent to-fuchsia-500/20' : 'bg-gradient-to-br from-purple-100/60 via-transparent to-fuchsia-100/70'}`}></div>
            <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600 text-white tracking-wide">
              LIVE
            </div>

            {showVisualFallback ? (
              <div className={`h-full w-full flex flex-col items-center justify-center gap-3 ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>
                <div className="text-5xl">🎮</div>
                <p className="text-lg font-bold">{tr('Visual Coding Aktif', 'Coding Visual Active')}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                  {tr('Tambahkan file GIF ke public/images/login-coding.gif', 'Add GIF file to public/images/login-coding.gif')}
                </p>
              </div>
            ) : (
              <img
                src={loginVisualSrc}
                alt={tr('Animasi suasana coding', 'Coding atmosphere animation')}
                className="h-full w-full object-cover object-center"
                onError={() => setShowVisualFallback(true)}
              />
            )}

            <div className="absolute inset-0 pointer-events-none login-scanlines"></div>
            <div className="absolute inset-x-4 bottom-4 z-20">
              <div className={`rounded-2xl px-4 py-3 border backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/55 border-purple-500/35 text-purple-100' : 'bg-white/75 border-purple-300/70 text-purple-700'}`}>
                <p className="text-sm font-semibold">{tr('Ruang Fokus Coding', 'Coding Focus Zone')}</p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-purple-200/90' : 'text-purple-600'}`}>
                  {tr('Masuk dan lanjutkan progress Python kamu hari ini.', 'Sign in and continue your Python progress today.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeForgotPassword}
          />

          {/* Modal Content */}
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl p-8 border transition-colors animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-purple-100'
          }`}>
            {/* Close Button */}
            <button
              onClick={closeForgotPassword}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                  : 'hover:bg-purple-100 text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            <h3 className={`text-2xl font-bold text-center mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            }`}>
              {tr('Lupa Password?', 'Forgot Password?')}
            </h3>
            <p className={`text-center mb-6 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {tr(
                'Masukkan email yang terdaftar, kami akan mengirim link untuk reset password Anda.',
                'Enter your registered email and we will send a reset password link.'
              )}
            </p>

            {forgotSuccess ? (
              <div className="text-center">
                <div className={`px-4 py-5 rounded-xl mb-6 flex flex-col items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-green-900/30 border border-green-700 text-green-400'
                    : 'bg-green-100 border border-green-300 text-green-700'
                }`}>
                  <span className="text-4xl">📧</span>
                  <p className="font-semibold text-lg">{tr('Email Terkirim!', 'Email Sent!')}</p>
                  <p className="text-sm">
                    {tr('Link reset password telah dikirim ke ', 'Reset password link has been sent to ')}<strong>{forgotEmail}</strong>.
                  </p>
                  <p className="text-xs mt-1 opacity-75">
                    {tr('Cek inbox atau folder spam Anda.', 'Check your inbox or spam folder.')}
                  </p>
                </div>
                <button
                  onClick={closeForgotPassword}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/30"
                >
                  {tr('← Kembali ke Login', '← Back to Login')}
                </button>
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className={`px-4 py-3 rounded-xl mb-4 flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-red-900/30 border border-red-700 text-red-400'
                      : 'bg-red-100 border border-red-300 text-red-700'
                  }`}>
                    <span>❌</span>
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {tr('📧 Email Terdaftar', '📧 Registered Email')}
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@email.com"
                      required
                      autoFocus
                      className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                          : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {tr('Mengirim...', 'Sending...')}
                      </span>
                    ) : (
                      tr('📨 Kirim Link Reset Password', '📨 Send Reset Link')
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className={`w-full mt-3 py-3 rounded-xl font-medium transition-all ${
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-purple-50'
                  }`}
                >
                  {tr('Batal', 'Cancel')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .login-panel {
          animation: panelEnter 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .visual-panel {
          animation: panelEnter 780ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 120ms;
        }

        .visual-panel > div {
          animation: visualFloat 6s ease-in-out infinite;
        }

        .login-scanlines {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.06) 1px,
            transparent 1px,
            transparent 4px
          );
          mix-blend-mode: soft-light;
          animation: scanPulse 3.8s ease-in-out infinite;
        }

        @keyframes panelEnter {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes visualFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes scanPulse {
          0%,
          100% {
            opacity: 0.28;
          }
          50% {
            opacity: 0.45;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-panel,
          .visual-panel,
          .visual-panel > div,
          .login-scanlines {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
