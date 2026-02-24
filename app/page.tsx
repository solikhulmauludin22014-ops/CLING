'use client'

import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-900' 
        : 'bg-white'
    }`}>
      {/* Navbar */}
      <nav className={`border-b transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-purple-100 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-600 text-white p-2 rounded-lg">
                <svg
                  className="w-8 h-8"
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
              <div>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-purple-700'}`}>
                  CLING
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}`}>
                  Clean Code Compiler Python
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
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
              <Link
                href="/login"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className={`text-5xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            Belajar <span className="text-purple-600">Clean Code</span> Python
          </h2>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            Platform pembelajaran untuk menulis kode Python yang bersih,
            efisien, dan sesuai standar PEP 8 menggunakan analisis Pylint.
          </p>

          <div className="flex justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-purple-600/30"
            >
              Mulai Sekarang
            </Link>
            <a
              href="#features"
              className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors border-2 ${
                theme === 'dark'
                  ? 'border-purple-500 text-purple-400 hover:bg-purple-500/10'
                  : 'border-purple-600 text-purple-600 hover:bg-purple-50'
              }`}
            >
              Pelajari Lebih Lanjut
            </a>
          </div>

          {/* Code Preview */}
          <div className={`rounded-xl p-6 max-w-2xl mx-auto text-left shadow-xl border ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-slate-900 border-purple-200'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-purple-400 text-sm ml-2">example.py</span>
            </div>
            <pre className="text-sm font-mono">
              <code>
                <span className="text-purple-400">def</span>{' '}
                <span className="text-white">calculate_average</span>
                <span className="text-white">(numbers):</span>
                {'\n'}
                <span className="text-slate-500">
                  {'    '}"""Calculate the average of a list."""
                </span>
                {'\n'}
                <span className="text-purple-400">{'    '}if not</span>
                <span className="text-white"> numbers:</span>
                {'\n'}
                <span className="text-purple-400">{'        '}return</span>
                <span className="text-green-400"> 0</span>
                {'\n'}
                <span className="text-white">{'    '}total = </span>
                <span className="text-white">sum</span>
                <span className="text-white">(numbers)</span>
                {'\n'}
                <span className="text-purple-400">{'    '}return</span>
                <span className="text-white"> total / </span>
                <span className="text-white">len</span>
                <span className="text-white">(numbers)</span>
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className={`py-20 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-800' : 'bg-purple-50'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <h3 className={`text-3xl font-bold text-center mb-12 ${
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          }`}>
            Fitur Utama
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className={`rounded-xl p-6 border transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 border-slate-600'
                : 'bg-white border-purple-100 shadow-md'
            }`}>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                Python Compiler
              </h4>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                Jalankan kode Python langsung di browser tanpa perlu instalasi.
                Output ditampilkan secara real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={`rounded-xl p-6 border transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 border-slate-600'
                : 'bg-white border-purple-100 shadow-md'
            }`}>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                Analisis PEP 8 & Pylint
              </h4>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                Dapatkan skor kualitas kode berdasarkan standar PEP 8 dan
                analisis Pylint dengan detail masalah dan saran.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={`rounded-xl p-6 border transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 border-slate-600'
                : 'bg-white border-purple-100 shadow-md'
            }`}>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                Progress & Leaderboard
              </h4>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                Lacak kemajuan belajar dan bandingkan dengan siswa lain melalui
                sistem poin dan leaderboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Section */}
      <div className={`py-20 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <h3 className={`text-3xl font-bold text-center mb-12 ${
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          }`}>
            Untuk Siapa?
          </h3>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Siswa */}
            <div className={`rounded-xl p-8 border-2 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 border-purple-500/30'
                : 'bg-white border-purple-200 shadow-lg'
            }`}>
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <h4 className={`text-2xl font-bold text-center mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              }`}>
                Siswa
              </h4>
              <ul className={`space-y-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Tulis dan jalankan kode Python
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Analisis kualitas kode otomatis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Dapatkan saran perbaikan
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Kumpulkan poin dan naik peringkat
                </li>
              </ul>
            </div>

            {/* Guru */}
            <div className={`rounded-xl p-8 border-2 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 border-purple-500/30'
                : 'bg-white border-purple-200 shadow-lg'
            }`}>
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl font-bold text-white">G</span>
              </div>
              <h4 className={`text-2xl font-bold text-center mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              }`}>
                Guru
              </h4>
              <ul className={`space-y-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Monitor progress semua siswa
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Lihat persentase clean code
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Analisis statistik kelas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Identifikasi siswa yang perlu bantuan
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-8 border-t transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-purple-50 border-purple-100'
      }`}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            © 2026 C3-Py Clean Code Compiler Python
          </p>
        </div>
      </footer>
    </div>
  )
}
