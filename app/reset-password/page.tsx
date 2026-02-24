'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'

export default function ResetPasswordPage() {
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsAuthenticated(true)
      } else {
        // No session, user might not have a valid recovery token
        setError('Sesi tidak valid. Silakan kirim ulang link reset password.')
      }
      setChecking(false)
    }

    checkSession()
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        if (updateError.message.includes('should be different')) {
          setError('Password baru harus berbeda dari password lama.')
        } else {
          setError(updateError.message)
        }
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

        {/* Reset Password Card */}
        <div className={`rounded-2xl shadow-xl p-8 border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-purple-100'
        }`}>
          {checking ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-10 w-10 mx-auto text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                Memverifikasi sesi...
              </p>
            </div>
          ) : !isAuthenticated && !success ? (
            <div className="text-center">
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-4 rounded-xl mb-6 flex flex-col items-center gap-2">
                <span className="text-3xl">⚠️</span>
                <p className="font-semibold">Sesi tidak valid</p>
                <p className="text-sm">
                  Link reset password sudah kadaluarsa atau tidak valid. Silakan kirim ulang link reset password.
                </p>
              </div>
              <Link
                href="/lupa-password"
                className="inline-flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-600/30"
              >
                📨 Kirim Ulang Link Reset
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-4 rounded-xl mb-6 flex flex-col items-center gap-2">
                <span className="text-3xl">✅</span>
                <p className="font-semibold">Password berhasil diubah!</p>
                <p className="text-sm">
                  Password Anda telah diperbarui. Silakan masuk dengan password baru Anda.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-600/30"
              >
                🚀 Masuk Sekarang
              </Link>
            </div>
          ) : (
            <>
              <h2 className={`text-2xl font-bold text-center mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              }`}>
                Reset Password
              </h2>
              <p className={`text-center mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Masukkan password baru Anda
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
                    htmlFor="password"
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    🔒 Password Baru
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                          : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                        theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    🔒 Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      minLength={6}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                          : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                        theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            password.length >= level * 3
                              ? password.length >= 12
                                ? 'bg-green-500'
                                : password.length >= 8
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              : theme === 'dark'
                                ? 'bg-slate-600'
                                : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      password.length >= 12
                        ? 'text-green-500'
                        : password.length >= 8
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }`}>
                      {password.length >= 12
                        ? '💪 Password sangat kuat'
                        : password.length >= 8
                          ? '👍 Password cukup kuat'
                          : password.length >= 6
                            ? '⚠️ Password lemah'
                            : '❌ Minimal 6 karakter'}
                    </p>
                  </div>
                )}

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
                      Menyimpan...
                    </span>
                  ) : (
                    '🔐 Simpan Password Baru'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/login"
            className={`transition-colors inline-flex items-center gap-2 ${
              theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
            }`}
          >
            ← Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  )
}
