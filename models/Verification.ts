import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IVerification extends Document {
  id: string
  bidId: string
  requirementId?: string
  ruleId?: string
  ruleName?: string
  category?: string
  status: 'PASS' | 'FAIL' | 'WARNING' | 'PENDING' | 'MANUAL_REVIEW' | 'NOT_APPLICABLE'
  source: 'PORTAL_SANDBOX' | 'DOCUMENT_EXTRACTED' | 'AI_INFERRED' | 'MANUAL_OFFICER' | 'EXTERNAL_API' | 'LOCAL_VALIDATION'
  verificationMethod?: string
  verificationStatusLabel?: string
  failureReason?: string
  documentName?: string
  isCritical?: boolean
  extractedValue?: string
  verifiedValue?: string
  explanation?: string
  evidence?: string
  score: number
  confidence: number
  createdAt: Date
  updatedAt: Date
}

export const VerificationSchema = new Schema<IVerification>(
  {
    bidId: { type: String, required: true, index: true },
    requirementId: { type: String },
    ruleId: { type: String },
    ruleName: { type: String },
    category: { type: String },
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'WARNING', 'PENDING', 'MANUAL_REVIEW', 'NOT_APPLICABLE'],
      default: 'PASS',
      index: true,
    },
    source: {
      type: String,
      default: 'PORTAL_SANDBOX',
    },
    verificationMethod: { type: String },
    verificationStatusLabel: { type: String },
    failureReason: { type: String },
    documentName: { type: String },
    isCritical: { type: Boolean, default: false },
    extractedValue: { type: Schema.Types.Mixed },
    verifiedValue: { type: Schema.Types.Mixed },
    explanation: { type: String },
    evidence: { type: String },
    score: { type: Number, default: 100 },
    confidence: { type: Number, default: 0.95 },
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

export const Verification: Model<IVerification> =
  mongoose.models.Verification || mongoose.model<IVerification>('Verification', VerificationSchema)
export default Verification
