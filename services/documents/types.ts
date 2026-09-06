export interface ExtractedEntities {
  gstin?: string
  pan?: string
  udyamNumber?: string
  cin?: string
  legalName?: string
  tradeName?: string
  dateOfIssue?: string
  expiryDate?: string
  turnoverCr?: number
  experienceYears?: number
  localContentPercent?: number
  authorizedSignatory?: string
  isOemAuthorizationValid?: boolean
  addresses: string[]
  unrecognizedFields: Record<string, string>
}

export interface DocumentParseResult {
  fileName: string
  mimeType: string
  sizeBytes: number
  sha256Hash: string
  rawText: string
  extractionMethod?: 'TEXT' | 'OCR' | 'MIXED' | 'FAILED'
  extractedEntities: ExtractedEntities
  documentType: string
}
