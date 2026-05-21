'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import ThemeToggle from '@/components/ThemeToggle'

type ExamQuestion = {
  id: string
  order_number: number
  instruction_text: string
  dirty_code_template: string
}

type ExamData = {
  id: string
  title: string
  exam_type: 'pretest' | 'posttest'
  duration_minutes: number
  is_active: boolean
  questions: ExamQuestion[]
}

const translations = {
  id: {
    run: 'Jalankan Kode',
    saveNext: 'Simpan & Lanjut',
    submit: 'Submit Selesai Ujian',
    processing: 'Memproses ujian...',
    loadingExam: 'Memuat ujian...',
    notFound: 'Ujian tidak ditemukan',
    question: 'Soal',
    from: 'dari',
    instructions: 'Instruksi Soal',
    dirtyCode: 'Dirty Code',
    output: 'Output',
    runTip: 'Klik "Run" untuk cek output atau error',
    navTitle: 'Navigasi Soal',
    saveFirst: 'Simpan jawaban dulu untuk lanjut.',
    saving: 'Menyimpan...',
    running: 'Menjalankan...',
  },
  en: {
    run: 'Run Code',
    saveNext: 'Save & Next',
    submit: 'Submit Exam',
    processing: 'Processing exam...',
    loadingExam: 'Loading exam...',
    notFound: 'Exam not found',
    question: 'Question',
    from: 'of',
    instructions: 'Instructions',
    dirtyCode: 'Dirty Code',
    output: 'Output',
    runTip: 'Click "Run" to check output or errors',
    navTitle: 'Question Navigation',
    saveFirst: 'Save your answer first to continue.',
    saving: 'Saving...',
    running: 'Running...',
  },
}

export default function ExamPage({ params }: { params: { id: string } }) {
  const { theme } = useTheme()
  const { language } = useLanguage()
  const t = (key: keyof typeof translations['id']) => translations[language][key]

  const [exam, setExam] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [runLoading, setRunLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({})

  const questions = useMemo(() => exam?.questions || [], [exam])
  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    const loadExam = async () => {
      setLoading(true)
      const res = await fetch(`/api/exams/${params.id}`)
      const data = await res.json()
      const examData = data.exam as ExamData | undefined

      if (examData?.questions) {
        examData.questions = examData.questions.sort((a, b) => a.order_number - b.order_number)
      }

      setExam(examData || null)
      setCode(examData?.questions?.[0]?.dirty_code_template || '')
      setLoading(false)
    }

    loadExam()
  }, [params.id])

  const handleRun = async () => {
    if (!code.trim()) return
    setRunLoading(true)
    setOutput('')
    try {
      const res = await fetch('/api/compiler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setOutput(data.success ? data.output || 'OK' : data.error || 'Error')
    } catch {
      setOutput('Network error')
    } finally {
      setRunLoading(false)
    }
  }

  const saveAnswer = async () => {
    if (!currentQuestion || !exam) return false
    setSaveLoading(true)
    try {
      const res = await fetch('/api/exams/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          questionId: currentQuestion.id,
          answerCode: code,
          runStatus: output ? 'success' : 'not_run',
        }),
      })
      const data = await res.json()
      if (typeof data.question_score === 'number') {
        setQuestionScores((prev) => ({ ...prev, [currentQuestion.id]: data.question_score }))
      }
      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))
      return true
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSaveNext = async () => {
    const ok = await saveAnswer()
    if (!ok) return
    const next = Math.min(currentIndex + 1, questions.length - 1)
    setCurrentIndex(next)
    setCode(questions[next].dirty_code_template || '')
    setOutput('')
  }

  const handleSubmit = async () => {
    if (!exam) return
    await saveAnswer()
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/exams/submit-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Score: ${data.final_score?.toFixed(2) || '0.00'}/10`)
      } else {
        alert(data.error || 'Failed')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">{t('loadingExam')}</div>
  }

  if (!exam || !currentQuestion) {
    return <div className="p-6">{t('notFound')}</div>
  }

  const canGoTo = (idx: number) => {
    if (idx <= currentIndex) return true
    return answeredIds.has(currentQuestion.id)
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <nav className={`border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{exam.title}</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
              {t('question')} {currentIndex + 1} {t('from')} {questions.length}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('instructions')}</h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {currentQuestion.instruction_text}
          </p>

          <div className="mt-5">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t('dirtyCode')}</h3>
            <pre className="mt-2 bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-auto">
{currentQuestion.dirty_code_template}
            </pre>
          </div>

          <div className="mt-6">
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t('navTitle')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  disabled={!canGoTo(idx)}
                  onClick={() => {
                    if (!canGoTo(idx)) {
                      alert(t('saveFirst'))
                      return
                    }
                    setCurrentIndex(idx)
                    setCode(q.dirty_code_template || '')
                    setOutput('')
                  }}
                  className={`w-10 h-10 rounded-xl border text-sm font-semibold ${
                    idx === currentIndex
                      ? 'bg-purple-600 text-white border-purple-600'
                      : answeredIds.has(q.id)
                      ? 'bg-green-500/20 text-green-600 border-green-300'
                      : 'bg-white border-slate-200 text-slate-600'
                  } ${!canGoTo(idx) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {q.order_number}
                </button>
              ))}
            </div>
          </div>

          {questionScores[currentQuestion.id] !== undefined && (
            <div className={`mt-5 rounded-xl p-4 border ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <p className="text-sm font-semibold">Skor soal ini</p>
              <p className="text-2xl font-bold">{questionScores[currentQuestion.id].toFixed(2)}/10</p>
              <p className="text-xs mt-1 opacity-80">Diambil dari formula Pylint pada kode jawaban saat disimpan.</p>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
          <textarea
            className={`w-full h-64 rounded-xl border p-3 font-mono text-sm ${
              theme === 'dark' ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-slate-50 border-purple-200'
            }`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleRun}
              disabled={runLoading}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {runLoading ? t('running') : t('run')}
            </button>
            <button
              onClick={handleSaveNext}
              disabled={saveLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {saveLoading ? t('saving') : t('saveNext')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitLoading}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {submitLoading ? t('processing') : t('submit')}
            </button>
          </div>

          <div className="mt-4">
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('output')}</p>
            <pre className="mt-2 bg-black text-green-400 text-xs rounded-xl p-4 min-h-[120px]">
{output || t('runTip')}
            </pre>
          </div>
        </div>
      </div>

      {submitLoading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg">
            {t('processing')}
          </div>
        </div>
      )}
    </div>
  )
}
