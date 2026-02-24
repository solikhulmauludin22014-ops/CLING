'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'siswa',
    nis: '',
    kelas: '',
    kodeToken: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const kelasOptions = [
    'X-1', 'X-2', 'X-3', 'X-4', 'X-5',
    'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5',
    'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5',
  ]

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password minimal 6 karakter'
    }
    if (!/\d/.test(password)) {
      return 'Password harus mengandung minimal 1 angka'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama')
      setLoading(false)
      return
    }

    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          nis: formData.role === 'siswa' ? formData.nis : null,
          kelas: formData.role === 'siswa' ? formData.kelas : null,
          kodeToken: formData.role === 'guru' ? formData.kodeToken : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registrasi gagal')
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

  const inputClasses = `w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
    theme === 'dark'
      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
      : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
  }`

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-purple-50'
      }`}>
        <div className={`rounded-2xl p-8 border shadow-xl max-w-md w-full text-center ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'
        }`}>
          <div className="text-6xl mb-4">✅</div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            Registrasi Berhasil!
          </h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Akun Anda telah berhasil dibuat. Silakan login untuk melanjutkan.
          </p>
          <Link
            href="/login"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/30"
          >
            🔑 Login Sekarang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-purple-50'
    }`}>
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-3 rounded-full transition-all shadow-lg z-10 ${
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

      <div className={`rounded-2xl p-8 border shadow-xl max-w-md w-full ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'
      }`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 text-white p-4 rounded-2xl inline-block mb-4 shadow-lg">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            Daftar Akun
          </h1>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
            Clean Code Analyzer
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              👤 Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClasses}
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              📧 Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClasses}
              placeholder="contoh@email.com"
              required
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              🎭 Daftar Sebagai
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'siswa', kodeToken: '' })}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  formData.role === 'siswa'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                👨‍🎓 Siswa
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'guru', nis: '', kelas: '' })}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  formData.role === 'guru'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                👨‍🏫 Guru
              </button>
            </div>
          </div>

          {/* Role-specific fields */}
          {formData.role === 'siswa' ? (
            <>
              {/* NIS */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  🔢 NIS (Nomor Induk Siswa)
                </label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className={inputClasses}
                  placeholder="Masukkan NIS"
                  required
                />
              </div>

              {/* Kelas */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  🏫 Kelas
                </label>
                <select
                  value={formData.kelas}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                  className={inputClasses}
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {kelasOptions.map((kelas) => (
                    <option key={kelas} value={kelas}>
                      {kelas}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                🔑 Kode Token Sekolah
              </label>
              <input
                type="text"
                value={formData.kodeToken}
                onChange={(e) => setFormData({ ...formData, kodeToken: e.target.value })}
                className={`${inputClasses} font-mono tracking-widest`}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                ⚠️ Kode rahasia dari administrator sekolah
              </p>
            </div>
          )}

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              🔒 Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={inputClasses}
              placeholder="Minimal 6 karakter + angka"
              required
            />
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Min. 6 karakter dan harus ada angka
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              🔒 Konfirmasi Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={inputClasses}
              placeholder="Ulangi password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/30 mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Mendaftar...
              </span>
            ) : (
              '📝 Daftar Sekarang'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className={`mt-6 text-center border-t pt-6 ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
            Sudah punya akun?{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
