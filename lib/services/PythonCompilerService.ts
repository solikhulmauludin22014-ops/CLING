import type { ExecutionResult } from '@/lib/types/database'

// Wandbox API - gratis, tanpa API key, kompatibel dengan Vercel serverless
const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json'
const WANDBOX_COMPILER = 'cpython-3.10.15'

interface WandboxResponse {
  status: string
  signal: string
  compiler_output: string
  compiler_error: string
  compiler_message: string
  program_output: string
  program_error: string
  program_message: string
}

export class PythonCompilerService {
  private maxExecutionTime: number

  constructor() {
    this.maxExecutionTime = 15000 // Timeout 15 detik untuk network request
  }

  /**
   * Eksekusi kode Python menggunakan Wandbox API
   * Kompatibel dengan Vercel serverless (tidak butuh Python lokal)
   */
  async execute(code: string): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.maxExecutionTime)

      const response = await fetch(WANDBOX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          compiler: WANDBOX_COMPILER,
          save: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`,
        }
      }

      const result: WandboxResponse = await response.json()
      const executionTime = Date.now() - startTime

      // Cek error kompilasi
      if (result.compiler_error) {
        return {
          success: false,
          error: result.compiler_error,
          execution_time: executionTime,
        }
      }

      // Cek error runtime (status !== "0" berarti ada error)
      if (result.status !== '0') {
        const errorMsg = result.program_error || result.program_message || 'Runtime error'
        // Jika ada output + error, tampilkan keduanya
        if (result.program_output && result.program_error) {
          return {
            success: false,
            error: result.program_error,
            output: result.program_output,
            execution_time: executionTime,
          }
        }
        return {
          success: false,
          error: errorMsg,
          execution_time: executionTime,
        }
      }

      // Sukses
      return {
        success: true,
        output: result.program_output || '',
        execution_time: executionTime,
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Execution timeout (max ${this.maxExecutionTime / 1000}s)`,
        }
      }

      return {
        success: false,
        error: error.message || 'Failed to execute code',
      }
    }
  }

  /**
   * Validasi sintaks Python menggunakan Wandbox API
   * Menjalankan ast.parse() untuk cek sintaks tanpa eksekusi
   */
  async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Escape kode untuk dimasukkan ke string Python
      const escapedCode = code
        .replace(/\\/g, '\\\\')
        .replace(/"""/g, '\\"\\"\\"')

      const syntaxCheckCode = `
import ast
try:
    ast.parse("""${escapedCode}""")
    print("SYNTAX_OK")
except SyntaxError as e:
    print(f"SyntaxError: line {e.lineno}: {e.msg}")
`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(WANDBOX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: syntaxCheckCode,
          compiler: WANDBOX_COMPILER,
          save: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Jika API error, skip validasi dan biarkan eksekusi yang tangani
        return { valid: true }
      }

      const result: WandboxResponse = await response.json()

      if (result.program_output?.includes('SYNTAX_OK')) {
        return { valid: true }
      }

      const errorOutput = result.program_output || result.program_error || 'Syntax error'
      return {
        valid: false,
        error: errorOutput.trim(),
      }
    } catch {
      // Jika validasi gagal (network error dll), skip dan biarkan eksekusi yang tangani
      return { valid: true }
    }
  }

  /**
   * Ambil versi Python yang digunakan
   */
  async getAvailableVersions(): Promise<string[]> {
    try {
      const response = await fetch('https://wandbox.org/api/list.json', {
        signal: AbortSignal.timeout(5000),
      })
      const runtimes = await response.json()

      return runtimes
        .filter((r: any) => r.language === 'Python' && r.name.startsWith('cpython-3'))
        .map((r: any) => r.name.replace('cpython-', ''))
        .slice(0, 5)
    } catch {
      return ['3.10.15']
    }
  }
}

// Instance singleton
export const pythonCompiler = new PythonCompilerService()
