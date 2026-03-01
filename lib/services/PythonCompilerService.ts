import type { ExecutionResult } from '@/lib/types/database'

// URL Python API yang di-deploy di Render.com
// Set PYTHON_API_URL di .env.local dan di Vercel environment variables
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'
const PYTHON_API_SECRET = process.env.PYTHON_API_SECRET || ''
const REQUEST_TIMEOUT = 30000 // 30 detik

export class PythonCompilerService {
  private apiUrl: string
  private apiSecret: string

  constructor() {
    this.apiUrl = PYTHON_API_URL
    this.apiSecret = PYTHON_API_SECRET
  }

  /**
   * Eksekusi kode Python via Render API
   */
  async execute(code: string): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      const response = await fetch(`${this.apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, api_key: this.apiSecret }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return {
          success: false,
          error: `API Error ${response.status}: ${text}`,
          execution_time: Date.now() - startTime,
        }
      }

      const result = await response.json()
      return {
        success: result.success,
        output: result.output || '',
        error: result.error || undefined,
        execution_time: Date.now() - startTime,
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout (${REQUEST_TIMEOUT / 1000}s)`,
          execution_time: Date.now() - startTime,
        }
      }
      return {
        success: false,
        error: `Gagal menghubungi Python API: ${error.message}`,
        execution_time: Date.now() - startTime,
      }
    }
  }

  /**
   * Validasi sintaks Python via Render API
   */
  async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${this.apiUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, api_key: this.apiSecret }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) return { valid: true }

      const result = await response.json()
      return { valid: result.valid, error: result.error || undefined }
    } catch {
      // Jika API tidak bisa dihubungi, lewati validasi — eksekusi yang akan tangani
      return { valid: true }
    }
  }

  /**
   * Ambil versi Python di Render API
   */
  async getAvailableVersions(): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      return [data.python || 'unknown']
    } catch {
      return ['unknown']
    }
  }
}

// Instance singleton
export const pythonCompiler = new PythonCompilerService()
