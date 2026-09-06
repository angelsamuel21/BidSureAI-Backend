import {
  RequirementCategory,
  RuleEvaluationResult,
  TenderRequirement,
  Bidder,
  UploadedDocument,
  PortalVerificationRecord,
} from '@/types'

export interface ComplianceEvaluationContext {
  tenderRequirements: TenderRequirement[]
  bidder: Bidder
  documents: UploadedDocument[]
  portalRecords: Record<string, PortalVerificationRecord>
}

export interface ComplianceRule {
  id: string
  code: string
  name: string
  category: RequirementCategory
  mandatory: boolean
  defaultWeight: number
  evaluate(context: ComplianceEvaluationContext, customRequirement?: TenderRequirement): RuleEvaluationResult
}
