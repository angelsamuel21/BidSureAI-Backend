import crypto from 'crypto'
import { DocumentParseResult } from './types'
import { entityExtractor } from './extractor'
import { mlServiceAdapter } from '@/adapters'

export async function parseDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DocumentParseResult> {
  // 1. Calculate Cryptographic SHA-256 Hash for Document Integrity
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex')

  let rawText = ''
  let mlFields: Record<string, any> = {}
  let extractionMethod: 'TEXT' | 'OCR' | 'MIXED' | 'FAILED' = 'TEXT'

  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
  const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g)$/i.test(fileName)
  const isText = mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')

  // 2. Extract Text based on Document Format
  if (isPdf || isImage) {
    // Strategy A: Call Python MLService (PyMuPDF for text PDF, Tesseract for scanned/image)
    try {
      const mlExtracted = await mlServiceAdapter.extractDocument(buffer, fileName, mimeType)
      if (mlExtracted && mlExtracted.text) {
        rawText = mlExtracted.text
        extractionMethod = (mlExtracted.method as any) || (isImage ? 'OCR' : 'TEXT')
        if (mlExtracted.fields) {
          if (mlExtracted.fields.company_name) mlFields.legalName = mlExtracted.fields.company_name
          if (mlExtracted.fields.gstin) mlFields.gstin = mlExtracted.fields.gstin
          if (mlExtracted.fields.pan) mlFields.pan = mlExtracted.fields.pan
          if (mlExtracted.fields.udyam) mlFields.udyamNumber = mlExtracted.fields.udyam
          if (mlExtracted.fields.cin) mlFields.cin = mlExtracted.fields.cin
          if (mlExtracted.fields.turnover !== null && mlExtracted.fields.turnover !== undefined) {
            mlFields.turnoverCr = mlExtracted.fields.turnover
          }
          if (mlExtracted.fields.experience !== null && mlExtracted.fields.experience !== undefined) {
            mlFields.experienceYears = mlExtracted.fields.experience
          }
        }
      }
    } catch {
      // Fallback if ML service is unreachable
    }

    // Strategy B: Fallback to Node.js pdf-parse for native text PDFs if ML service did not return text
    if (!rawText && isPdf) {
      try {
        const pdfModule: any = await import('pdf-parse')
        const pdfParse = pdfModule.default || pdfModule
        const pdfData = await pdfParse(buffer)
        rawText = pdfData.text || ''
        if (rawText.trim()) {
          extractionMethod = 'TEXT'
        }
      } catch {
        rawText = ''
      }
    }

    // If still no text extracted for an image or scanned document
    if (!rawText.trim()) {
      extractionMethod = 'FAILED'
    }
  } else if (isText) {
    rawText = buffer.toString('utf-8')
    extractionMethod = 'TEXT'
  } else {
    extractionMethod = 'FAILED'
  }

  // 3. Extract Statutory Entities & Classify Document
  const { entities, classifiedType } = entityExtractor.extractFromText(rawText, fileName)
  const mergedEntities = { ...entities, ...mlFields }

  return {
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    sha256Hash,
    rawText,
    extractionMethod,
    extractedEntities: mergedEntities,
    documentType: classifiedType,
  }
}

export default parseDocumentBuffer
