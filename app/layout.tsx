import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import AuthListener from '@/components/AuthListener'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clean Code Analyzer - Python Compiler & PEP 8',
  description: 'Platform pembelajaran Clean Code Python dengan analisis PEP 8 dan Pylint',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-slate-900 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthListener />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
