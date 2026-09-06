export type UserRole = 'PROCUREMENT_OFFICER' | 'VIGILANCE_AUDITOR' | 'SYSTEM_ADMIN'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  organization: string
}

export type RequirementCategory = 'STATUTORY' | 'TECHNICAL' | 'FINANCIAL' | 'TENDER_SPECIFIC'

export interface TenderRequirement {
  id: string
  code: string
  name: string
  description: string
  category: RequirementCategory
  mandatory: boolean
  weight: number
  expectedDocumentType: string
  criteriaDetails?: {
    minTurnoverCr?: number
    minExperienceYears?: number
    minLocalContentPercent?: number
    msmeExemptionApplicable?: boolean
    startupExemptionApplicable?: boolean
  }
}

export interface Tender {
  id: string
  tenderId: string
  title: string
  description: string
  department: string
  estimatedValueCr: number
  submissionDeadline: string
  status: 'ACTIVE' | 'CLOSED' | 'EVALUATION'
  requirements: TenderRequirement[]
  createdAt: string
}

export interface Bidder {
  id: string
  name: string
  registrationNumber: string
  gstin: string
  pan: string
  udyamNumber?: string
  cin?: string
  contactEmail: string
  contactPhone: string
  address: string
  category: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'STARTUP'
  isDebarred: boolean
  debarmentReason?: string
}

export interface UploadedDocument {
  id: string
  name: string
  fileName?: string
  sizeBytes: number
  mimeType: string
  sha256Hash: string
  documentType: string
  processingStatus?: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  extractionMethod?: 'TEXT' | 'OCR' | 'MIXED' | 'FAILED'
  uploadedAt: string
  extractedText?: string
  extractedFields: Record<string, any>
}

export type ComplianceStatus = 'PASS' | 'FAIL' | 'WARNING' | 'PENDING' | 'NOT_APPLICABLE' | 'MANUAL_REVIEW'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Recommendation = 'COMPLIANT' | 'NON-COMPLIANT' | 'REQUIRES_MANUAL_REVIEW'

export type VerificationMethod =
  | 'FORMAT_VALID'
  | 'DOCUMENT_EXTRACTED'
  | 'CROSS_VALIDATED'
  | 'SANDBOX_VERIFIED'
  | 'EXTERNALLY_VERIFIED'
  | 'NOT_VERIFIED'
  | 'FAILED'

export interface RuleEvaluationResult {
  ruleId: string
  ruleName: string
  category: RequirementCategory
  mandatory: boolean
  weight: number
  status: ComplianceStatus
  score: number // 0 - 100 for this specific rule
  documentReference?: string
  documentName?: string
  extractedValue?: any
  portalVerifiedValue?: any
  evidence: string
  explanation: string
  confidence: number // 0 - 1
  source: 'DOCUMENT_EXTRACTED' | 'PORTAL_SANDBOX' | 'AI_INFERRED' | 'MANUAL_OFFICER' | 'EXTERNAL_API' | 'LOCAL_VALIDATION'
  verificationMethod?: VerificationMethod
  verificationStatusLabel?: string
  failureReason?: string
  isCritical?: boolean
}

export interface AIFinding {
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  documentEvidence: string
  clauseReference?: string
  confidence: number
  recommendedAction: string
}

export interface PortalVerificationRecord {
  portal: 'GSTN' | 'PAN' | 'UDYAM' | 'MCA21' | 'DEBARMENT' | 'MII' | 'EPFO'
  identifier: string
  status: 'VERIFIED' | 'FAILED' | 'WARNING' | 'UNAVAILABLE'
  source: string
  checkedAt: string
  referenceId: string
  data: Record<string, any>
  rawSummary: string
  isSandbox: boolean
  verificationMethod?: VerificationMethod
}

export interface ComplianceEvaluation {
  id: string
  bidId: string
  overallScore: number // 0 - 100
  riskLevel: RiskLevel
  riskFactors: string[]
  recommendation: Recommendation
  aiSummary: string
  ruleResults: RuleEvaluationResult[]
  aiFindings: AIFinding[]
  portalVerifications: PortalVerificationRecord[]
  evaluatedAt: string
}

export type OfficerDecisionType = 'APPROVE' | 'REQUEST_CLARIFICATION' | 'REJECT' | 'PENDING'

export interface ClarificationRequest {
  id: string
  bidId: string
  tenderId: string
  clauseReference: string
  queryText: string
  deadline: string
  issuedAt: string
  issuedBy: string
  status: 'PENDING_RESPONSE' | 'RESOLVED' | 'OVERDUE'
  responseNotes?: string
}

export interface OfficerDecision {
  decision: OfficerDecisionType
  justification: string
  overrideReason?: string
  officerName: string
  officerRole: UserRole
  timestamp: string
}

export interface Bid {
  id: string
  tenderId: string
  tenderNumber: string
  bidderId: string
  bidderName: string
  submittedAt: string
  documents: UploadedDocument[]
  evaluation?: ComplianceEvaluation
  officerDecision?: OfficerDecision
  clarifications: ClarificationRequest[]
  status: 'PENDING' | 'EVALUATED' | 'CLARIFICATION_REQUESTED' | 'QUALIFIED' | 'DISQUALIFIED'
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: string
  role: UserRole
  action: string
  tenderId?: string
  bidderId?: string
  bidId?: string
  details: string
  previousHash: string
  currentHash: string
}
