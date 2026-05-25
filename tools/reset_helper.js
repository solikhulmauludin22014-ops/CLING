#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')

function parseArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1]
}

const mode = process.argv[2] || 'list'

const fs = require('fs')

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const l = line.trim()
    if (!l || l.startsWith('#')) continue
    const idx = l.indexOf('=')
    if (idx === -1) continue
    const key = l.slice(0, idx).trim()
    const val = l.slice(idx + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
}

// load .env.local if present
loadEnvFile('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(JSON.stringify({ success: false, error: 'Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function list() {
  try {
    const { data, error } = await supabase
      .from('exam_submissions')
      .select('id, exam_id, user_id, final_score, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error(JSON.stringify({ success: false, error: error.message || error }))
      process.exit(1)
    }

    console.log(JSON.stringify({ success: true, rows: data }, null, 2))
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message || String(e) }))
    process.exit(1)
  }
}

async function reset(studentId, examId) {
  if (!studentId || !examId) {
    console.error(JSON.stringify({ success: false, error: 'studentId and examId required' }))
    process.exit(1)
  }

  try {
    const { error } = await supabase
      .from('exam_submissions')
      .delete()
      .eq('user_id', studentId)
      .eq('exam_id', examId)

    if (error) {
      console.error(JSON.stringify({ success: false, error: error.message || error }))
      process.exit(1)
    }

    console.log(JSON.stringify({ success: true, message: `Deleted submissions for student ${studentId}, exam ${examId}` }))
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message || String(e) }))
    process.exit(1)
  }
}

if (mode === 'list') {
  list()
} else if (mode === 'reset') {
  const studentId = parseArg('--student')
  const examId = parseArg('--exam')
  reset(studentId, examId)
} else {
  console.error(JSON.stringify({ success: false, error: 'Unknown mode. Use list or reset' }))
  process.exit(1)
}
