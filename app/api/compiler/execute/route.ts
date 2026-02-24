import { NextRequest, NextResponse } from 'next/server'
import { pythonCompiler } from '@/lib/services/PythonCompilerService'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Validasi sintaks terlebih dahulu
    const syntaxCheck = await pythonCompiler.validateSyntax(code)
    if (!syntaxCheck.valid) {
      return NextResponse.json({
        success: false,
        error: syntaxCheck.error,
        type: 'syntax_error',
      })
    }

    // Eksekusi kode
    const result = await pythonCompiler.execute(code)

    return NextResponse.json({ ...result, requires_login: !user })
  } catch (error: unknown) {
    console.error('Execute error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Execution failed'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
