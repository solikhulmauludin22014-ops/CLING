'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme()
  const { language } = useLanguage()
  const tr = (id: string, en: string) => (language === 'id' ? id : en)
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
      return tr('Password minimal 6 karakter', 'Password must be at least 6 characters')
    }
    if (!/\d/.test(password)) {
      return tr('Password harus mengandung minimal 1 angka', 'Password must contain at least 1 number')
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError(tr('Password dan konfirmasi password tidak sama', 'Password and confirmation do not match'))
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
        setError(data.error || tr('Registrasi gagal', 'Registration failed'))
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(tr('Terjadi kesalahan. Silakan coba lagi.', 'An error occurred. Please try again.'))
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
              {tr('Registrasi Berhasil!', 'Registration Successful!')}
            </h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {tr('Akun Anda telah berhasil dibuat. Silakan login untuk melanjutkan.', 'Your account has been created successfully. Please login to continue.')}
          </p>
          <Link
            href="/login"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/30"
          >
              {tr('🔑 Login Sekarang', '🔑 Login Now')}
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
            {tr('Daftar Akun', 'Create Account')}
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
              {tr('👤 Nama Lengkap', '👤 Full Name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClasses}
              placeholder={tr('Masukkan nama lengkap', 'Enter full name')}
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
              {tr('🎭 Daftar Sebagai', '🎭 Register As')}
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
                {tr('👨‍🎓 Siswa', '👨‍🎓 Student')}
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
                {tr('👨‍🏫 Guru', '👨‍🏫 Teacher')}
              </button>
            </div>
          </div>

          {/* Role-specific fields */}
          {formData.role === 'siswa' ? (
            <>
              {/* NIS */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {tr('🔢 NIS (Nomor Induk Siswa)', '🔢 Student ID')}
                </label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className={inputClasses}
                  placeholder={tr('Masukkan NIS', 'Enter student ID')}
                  required
                />
              </div>

              {/* Kelas */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {tr('🏫 Kelas', '🏫 Class')}
                </label>
                <select
                  value={formData.kelas}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                  className={inputClasses}
                  required
                >
                  <option value="">{tr('Pilih Kelas', 'Select Class')}</option>
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
                {tr('🔑 Kode Token Sekolah', '🔑 SMK Antartika 2 Sidoarjo Hebat dan Bisa')}
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
                {tr('⚠️ Kode rahasia dari administrator sekolah', '⚠️ Secret code from school administrator')}
              </p>
            </div>
          )}

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {tr('🔒 Password', '🔒 Password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`${inputClasses} pr-12`}
                placeholder={tr('Minimal 6 karakter + angka', 'Minimum 6 characters + number')}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? tr('Sembunyikan password', 'Hide password')
                    : tr('Lihat password', 'Show password')
                }
                aria-pressed={showPassword}
                title={
                  showPassword
                    ? tr('Sembunyikan password', 'Hide password')
                    : tr('Lihat password', 'Show password')
                }
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-600'
                    : 'text-slate-500 hover:text-purple-700 hover:bg-purple-100'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500`}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a12.1 12.1 0 013.256-4.752m3.357-2.27A9.956 9.956 0 0112 5c5 0 9.27 3.11 11 7.5a12.108 12.108 0 01-4.41 5.264M9.88 9.88a3 3 0 104.24 4.24"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {tr('Min. 6 karakter dan harus ada angka', 'Min. 6 characters and must include a number')}
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {tr('🔒 Konfirmasi Password', '🔒 Confirm Password')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`${inputClasses} pr-12`}
                placeholder={tr('Ulangi password', 'Repeat password')}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? tr('Sembunyikan password', 'Hide password')
                    : tr('Lihat password', 'Show password')
                }
                aria-pressed={showConfirmPassword}
                title={
                  showConfirmPassword
                    ? tr('Sembunyikan password', 'Hide password')
                    : tr('Lihat password', 'Show password')
                }
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-600'
                    : 'text-slate-500 hover:text-purple-700 hover:bg-purple-100'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500`}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a12.1 12.1 0 013.256-4.752m3.357-2.27A9.956 9.956 0 0112 5c5 0 9.27 3.11 11 7.5a12.108 12.108 0 01-4.41 5.264M9.88 9.88a3 3 0 104.24 4.24"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
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
                {tr('Mendaftar...', 'Registering...')}
              </span>
            ) : (
              tr('📝 Daftar Sekarang', '📝 Register Now')
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className={`mt-6 text-center border-t pt-6 ${theme === 'dark' ? 'border-slate-700' : 'border-purple-100'}`}>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
            {tr('Sudah punya akun?', 'Already have an account?')}{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              {tr('Login di sini', 'Login here')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
