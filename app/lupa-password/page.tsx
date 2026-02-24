'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
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

        {/* Forgot Password Card */}
        <div className={`rounded-2xl shadow-xl p-8 border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-purple-100'
        }`}>
          <h2 className={`text-2xl font-bold text-center mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          }`}>
            Lupa Password?
          </h2>
          <p className={`text-center mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Masukkan email untuk reset password
          </p>

          {success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-4 rounded-xl mb-6 flex flex-col items-center gap-2">
                <span className="text-3xl">📧</span>
                <p className="font-semibold">Email terkirim!</p>
                <p className="text-sm">
                  Kami telah mengirim link reset password ke <strong>{email}</strong>. Silakan cek inbox atau folder spam Anda.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                ← Kembali ke Login
              </Link>
            </div>
          ) : (
            <>
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
                      Mengirim...
                    </span>
                  ) : (
                    '📨 Kirim Link Reset'
                  )}
                </button>
              </form>

              <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
                <p className={`text-sm text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sudah ingat password?{' '}
                  <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                    Masuk di sini
                  </Link>
                </p>
              </div>
            </>
          )}
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
    </div>
  )
}
