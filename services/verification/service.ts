import { connectToDatabase } from '@/db/mongodb'
import { Tender } from '@/models/Tender'
import { Bid } from '@/models/Bid'
import { DocumentModel } from '@/models/Document'
import { verificationPipelineService } from './pipeline'
import { Bid as BidType, ComplianceEvaluation, UploadedDocument } from '@/types'

export interface VerificationInput {
  bidId?: string
  tenderId: string
  bidderData: {
    name?: string
    gstin?: string
    pan?: string
    udyamNumber?: string
    registrationNumber?: string
    address?: string
    category?: string
    isDebarred?: boolean
    email?: string
  }
  documents?: UploadedDocument[]
}

export class VerificationService {
  /**
   * Run verification for an existing bid by ID.
   */
  async runVerificationForBid(bidId: string): Promise<{
    bid: BidType
    evaluation: ComplianceEvaluation
    mlResult?: any
  }> {
    return verificationPipelineService.executePipeline(bidId)
  }

  /**
   * Run verification from input (legacy / generic endpoint).
   * Idempotently resolves or creates the bid, persists documents, and runs the pipeline.
   */
  async runVerification(input: VerificationInput): Promise<{
    bid: BidType
    evaluation: ComplianceEvaluation
    mlResult?: any
  }> {
    await connectToDatabase()

    if (input.bidId) {
      return this.runVerificationForBid(input.bidId)
    }

    const tenderIdentifier = input.tenderId || 'GEM/2026/001'
    const bidderName = input.bidderData?.name || 'New Participating Bidder'

    // Check if an existing pending/evaluated bid exists for this tender and bidder
    let existingBid = await Bid.findOne({
      $or: [
        { tenderId: tenderIdentifier },
        { tenderNumber: tenderIdentifier },
      ],
      bidderName: { $regex: new RegExp(`^${bidderName.trim()}$`, 'i') },
    })

    if (!existingBid) {
      // Resolve Tender Document
      const orClauses: any[] = [
        { tenderNumber: tenderIdentifier },
        { tenderId: tenderIdentifier },
      ]
      if (typeof tenderIdentifier === 'string' && /^[0-9a-fA-F]{24}$/.test(tenderIdentifier)) {
        orClauses.push({ _id: tenderIdentifier })
      }

      const tenderDoc =
        (await Tender.findOne({ $or: orClauses })) || (await Tender.findOne())

      const tenderDbId = tenderDoc?.id || tenderDoc?._id?.toString() || tenderIdentifier
      const tenderNumber = tenderDoc?.tenderNumber || tenderDoc?.tenderId || tenderIdentifier

      existingBid = await Bid.create({
        tenderId: tenderDbId,
        tenderNumber,
        bidderId: `bidder-${Date.now()}`,
        bidderName,
        status: 'PENDING',
        submittedAt: new Date(),
        documents: [],
        verifications: [],
        clarifications: [],
      })
    }

    const bidId = existingBid._id.toString()

    // If documents were passed in, ensure they are stored under this bidId
    if (input.documents && input.documents.length > 0) {
      for (const d of input.documents) {
        const existingDoc = await DocumentModel.findOne({
          bidId,
          documentType: d.documentType,
        })
        if (!existingDoc) {
          await DocumentModel.create({
            bidId,
            fileName: d.name,
            name: d.name,
            fileType: d.mimeType,
            mimeType: d.mimeType,
            fileSize: d.sizeBytes,
            sizeBytes: d.sizeBytes,
            sha256: d.sha256Hash,
            sha256Hash: d.sha256Hash,
            documentType: d.documentType,
            processingStatus: 'PROCESSED',
            extractionMethod: d.extractionMethod || 'TEXT',
            extractedText: d.extractedText || '',
            extractedFields: d.extractedFields || {},
          })
        }
      }
    }

    return this.runVerificationForBid(bidId)
  }
}

export const verificationService = new VerificationService()
export default verificationService
