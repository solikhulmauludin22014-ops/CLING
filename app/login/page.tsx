'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setForgotError('Terjadi kesalahan. Silakan coba lagi.')
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
          setError('Email atau password salah.')
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
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-purple-50'
    }`}>
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-3 rounded-full transition-all shadow-lg ${
          theme === 'dark'
            ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
            : 'bg-white hover:bg-purple-100 text-purple-600'
        }`}
        title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
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

      <div className="max-w-md w-full">
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
                Clean Code Analyzer
              </h1>
              <p className={theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}>
                Python • PEP 8 • Pylint
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
            Selamat Datang!
          </h2>
          <p className={`text-center mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Masuk untuk mulai coding
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
                📧 Email
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
                🔒 Password
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
                  Memproses...
                </span>
              ) : (
                '🚀 Masuk'
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
                Lupa password?
              </button>
            </div>
            <p className={`text-sm text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Belum punya akun?{' '}
              <Link href="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                Daftar di sini
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
            ← Kembali ke Beranda
          </Link>
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
              Lupa Password?
            </h3>
            <p className={`text-center mb-6 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Masukkan email yang terdaftar, kami akan mengirim link untuk reset password Anda.
            </p>

            {forgotSuccess ? (
              <div className="text-center">
                <div className={`px-4 py-5 rounded-xl mb-6 flex flex-col items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-green-900/30 border border-green-700 text-green-400'
                    : 'bg-green-100 border border-green-300 text-green-700'
                }`}>
                  <span className="text-4xl">📧</span>
                  <p className="font-semibold text-lg">Email Terkirim!</p>
                  <p className="text-sm">
                    Link reset password telah dikirim ke <strong>{forgotEmail}</strong>.
                  </p>
                  <p className="text-xs mt-1 opacity-75">
                    Cek inbox atau folder spam Anda.
                  </p>
                </div>
                <button
                  onClick={closeForgotPassword}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/30"
                >
                  ← Kembali ke Login
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
                      📧 Email Terdaftar
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
                        Mengirim...
                      </span>
                    ) : (
                      '📨 Kirim Link Reset Password'
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
                  Batal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
