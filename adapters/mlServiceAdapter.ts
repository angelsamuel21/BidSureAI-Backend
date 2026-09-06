const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

export interface MLExtractionResult {
  text: string
  method?: string
  pagesProcessed?: number
  fields: {
    cin?: string | null
    pan?: string | null
    gstin?: string | null
    udyam?: string | null
    turnover?: number | null
    experience?: number | null
    company_name?: string | null
  }
  characterCount?: number
}

export interface MLPredictionResult {
  success: boolean
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED'
  predictedScore?: number
  probabilities?: Record<string, number>
  tenderClassification?: {
    category: 'Goods' | 'Works' | 'Services'
    confidence: number
    model: string
  }
  anomalyDetected?: boolean
  model?: string
  error?: string
}

export class MLServiceAdapter {
  private baseUrl: string

  constructor(url: string = ML_SERVICE_URL) {
    this.baseUrl = url
  }

  async checkHealth(): Promise<{ isHealthy: boolean; models: Record<string, boolean> }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) return { isHealthy: false, models: {} }
      const data = (await res.json()) as any
      return {
        isHealthy: data.status === 'ok' || data.status === 'degraded',
        models: data.models || {},
      }
    } catch {
      return { isHealthy: false, models: {} }
    }
  }

  async extractDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string = 'application/pdf'
  ): Promise<MLExtractionResult | null> {
    try {
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType || 'application/pdf'}\r\n\r\n`
      const footer = `\r\n--${boundary}--\r\n`

      const payload = Buffer.concat([
        Buffer.from(header, 'utf-8'),
        fileBuffer,
        Buffer.from(footer, 'utf-8'),
      ])

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length.toString(),
        },
        body: payload,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) return null
      const data = (await res.json()) as any
      if (data.success) {
        return {
          text: data.extraction?.text || '',
          method: data.extraction?.method || 'TEXT',
          pagesProcessed: data.extraction?.pages_processed,
          fields: data.fields || {},
          characterCount: data.extraction?.text ? data.extraction.text.length : 0,
        }
      }
      return null
    } catch (err) {
      console.warn('[MLServiceAdapter] Document extraction call failed, using fallback:', err)
      return null
    }
  }

  async predict(payload: {
    task?: 'risk' | 'tender' | 'all'
    tenderTitle?: string
    tenderDescription?: string
    ruleScores?: number[]
    criticalFlags?: string[]
    features?: Record<string, any>
  }): Promise<MLPredictionResult> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        return {
          success: false,
          error: 'ML_SERVICE_UNAVAILABLE',
          riskLevel: 'MEDIUM',
          predictedScore: 75.0,
        }
      }

      const data = (await res.json()) as any
      return data
    } catch (err) {
      console.warn('[MLServiceAdapter] Prediction call failed, using backend fallback:', err)
      return {
        success: false,
        error: 'ML_SERVICE_OFFLINE',
        riskLevel: 'MEDIUM',
        predictedScore: 75.0,
      }
    }
  }
}

export const mlServiceAdapter = new MLServiceAdapter()
export default mlServiceAdapter
