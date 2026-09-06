import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IComplianceResult extends Document {
  id: string
  bidId: string
  score: number
  overallScore?: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | 'NON-COMPLIANT'
  recommendation?: 'COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | 'NON-COMPLIANT'
  summary?: string
  aiSummary?: string
  riskFactors: string[]
  ruleResults?: any[]
  portalVerifications?: Record<string, any>
  aiFindings?: any[]
  evaluatedAt: Date
  createdAt: Date
  updatedAt: Date
}

export const ComplianceResultSchema = new Schema<IComplianceResult>(
  {
    bidId: { type: String, required: true, unique: true, index: true },
    score: { type: Number, required: true },
    overallScore: { type: Number },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
      required: true,
    },
    recommendation: {
      type: String,
      enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
    },
    summary: { type: String },
    aiSummary: { type: String },
    riskFactors: [{ type: String }],
    ruleResults: { type: Schema.Types.Mixed },
    portalVerifications: { type: Schema.Types.Mixed },
    aiFindings: { type: Schema.Types.Mixed },
    evaluatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.overallScore && ret.score !== undefined) ret.overallScore = ret.score
        if (!ret.score && ret.overallScore !== undefined) ret.score = ret.overallScore
        if (!ret.recommendation && ret.status) ret.recommendation = ret.status
        if (!ret.status && ret.recommendation) ret.status = ret.recommendation
        if (!ret.aiSummary && ret.summary) ret.aiSummary = ret.summary
        if (!ret.summary && ret.aiSummary) ret.summary = ret.aiSummary
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

ComplianceResultSchema.pre('save', function () {
  if (this.overallScore === undefined && this.score !== undefined) this.overallScore = this.score
  if (this.score === undefined && this.overallScore !== undefined) this.score = this.overallScore
  if (!this.recommendation && this.status) this.recommendation = this.status
  if (!this.status && this.recommendation) this.status = this.recommendation
  if (!this.aiSummary && this.summary) this.aiSummary = this.summary
  if (!this.summary && this.aiSummary) this.summary = this.aiSummary
})

export const ComplianceResult: Model<IComplianceResult> =
  mongoose.models.ComplianceResult || mongoose.model<IComplianceResult>('ComplianceResult', ComplianceResultSchema)
export default ComplianceResult
