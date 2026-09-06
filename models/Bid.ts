import mongoose, { Schema, Document, Model } from 'mongoose'
import { DocumentSchema, IDocumentRecord } from './Document'
import { VerificationSchema, IVerification } from './Verification'
import { ClarificationSchema, IClarification } from './Clarification'

export interface IOfficerDecision {
  decision: 'APPROVE' | 'REQUEST_CLARIFICATION' | 'REJECT'
  justification: string
  overrideReason?: string
  officerName: string
  officerRole: 'PROCUREMENT_OFFICER' | 'VIGILANCE_AUDITOR' | 'SYSTEM_ADMIN'
  timestamp: string | Date
}

export interface IBidEvaluation {
  id?: string
  bidId?: string
  overallScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskFactors: string[]
  recommendation: 'COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | 'NON-COMPLIANT'
  aiSummary?: string
  ruleResults: any[]
  aiFindings: any[]
  portalVerifications: any[]
  evaluatedAt: string | Date
}

export interface IBid extends Document {
  id: string
  tenderId: string
  tenderNumber: string
  bidderId: string
  bidderName: string
  status: 'PENDING' | 'EVALUATED' | 'CLARIFICATION_REQUESTED' | 'QUALIFIED' | 'DISQUALIFIED'
  submittedAt: Date
  complianceScore?: number
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendation?: 'COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | 'NON-COMPLIANT'
  decision?: 'APPROVE' | 'REQUEST_CLARIFICATION' | 'REJECT'
  decisionReason?: string
  officerName?: string
  officerRole?: string
  decisionTime?: Date
  overrideReason?: string
  officerDecision?: IOfficerDecision
  evaluation?: IBidEvaluation
  documents: IDocumentRecord[]
  verifications: IVerification[]
  clarifications: IClarification[]
  createdAt: Date
  updatedAt: Date
}

const OfficerDecisionSchema = new Schema<IOfficerDecision>(
  {
    decision: {
      type: String,
      enum: ['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT'],
      required: true,
    },
    justification: { type: String, required: true },
    overrideReason: { type: String },
    officerName: { type: String, required: true },
    officerRole: {
      type: String,
      enum: ['PROCUREMENT_OFFICER', 'VIGILANCE_AUDITOR', 'SYSTEM_ADMIN'],
      default: 'PROCUREMENT_OFFICER',
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const EvaluationSchema = new Schema(
  {
    id: { type: String },
    bidId: { type: String },
    overallScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    riskFactors: [{ type: String }],
    recommendation: {
      type: String,
      enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
      required: true,
    },
    aiSummary: { type: String },
    ruleResults: { type: [Schema.Types.Mixed], default: [] },
    aiFindings: { type: [Schema.Types.Mixed], default: [] },
    portalVerifications: { type: [Schema.Types.Mixed], default: [] },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const BidSchema = new Schema<IBid>(
  {
    tenderId: { type: String, required: true, index: true },
    tenderNumber: { type: String, index: true },
    bidderId: { type: String, required: true, index: true },
    bidderName: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'EVALUATED', 'CLARIFICATION_REQUESTED', 'QUALIFIED', 'DISQUALIFIED'],
      default: 'PENDING',
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    complianceScore: { type: Number },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    recommendation: {
      type: String,
      enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
    },
    decision: {
      type: String,
      enum: ['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT'],
    },
    decisionReason: { type: String },
    officerName: { type: String },
    officerRole: { type: String },
    decisionTime: { type: Date },
    overrideReason: { type: String },
    officerDecision: { type: OfficerDecisionSchema },
    evaluation: { type: EvaluationSchema },
    documents: [DocumentSchema],
    verifications: [VerificationSchema],
    clarifications: [ClarificationSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        return ret
      },
    },
  }
)

BidSchema.index({ tenderId: 1, bidderId: 1 })

export const Bid: Model<IBid> = mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema)
export default Bid
