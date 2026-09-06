import { AIFinding, RuleEvaluationResult } from '@/types'

export interface AIEvaluationRequest {
  bidderName: string
  tenderTitle: string
  extractedFields: Record<string, any>
  documents: { name: string; type: string; snippet?: string }[]
  ruleDiscrepancies: string[]
  ruleResults?: RuleEvaluationResult[]
  isDebarred?: boolean
}

export interface AIEvaluationResponse {
  summary: string
  findings: AIFinding[]
  confidenceScore: number
  analyzedAt: string
  modelName: string
}
