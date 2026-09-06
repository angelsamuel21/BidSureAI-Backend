import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IClarification extends Document {
  id: string
  bidId: string
  tenderId?: string
  requirementId?: string
  issue?: string
  clauseRef?: string
  clauseReference?: string
  message: string
  queryText?: string
  deadline?: Date
  status: 'PENDING_RESPONSE' | 'RESOLVED' | 'OVERDUE'
  responseNotes?: string
  issuedBy?: string
  issuedAt: Date
  createdAt: Date
  updatedAt: Date
}

export const ClarificationSchema = new Schema<IClarification>(
  {
    bidId: { type: String, required: true, index: true },
    tenderId: { type: String },
    requirementId: { type: String },
    issue: { type: String },
    clauseRef: { type: String },
    clauseReference: { type: String },
    message: { type: String, required: true },
    queryText: { type: String },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['PENDING_RESPONSE', 'RESOLVED', 'OVERDUE'],
      default: 'PENDING_RESPONSE',
    },
    responseNotes: { type: String },
    issuedBy: { type: String },
    issuedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.clauseReference && ret.clauseRef) ret.clauseReference = ret.clauseRef
        if (!ret.clauseRef && ret.clauseReference) ret.clauseRef = ret.clauseReference
        if (!ret.queryText && ret.message) ret.queryText = ret.message
        if (!ret.message && ret.queryText) ret.message = ret.queryText
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

ClarificationSchema.pre('save', function () {
  if (!this.clauseReference && this.clauseRef) this.clauseReference = this.clauseRef
  if (!this.clauseRef && this.clauseReference) this.clauseRef = this.clauseReference
  if (!this.queryText && this.message) this.queryText = this.message
  if (!this.message && this.queryText) this.message = this.queryText
})

export const Clarification: Model<IClarification> =
  mongoose.models.Clarification || mongoose.model<IClarification>('Clarification', ClarificationSchema)
export default Clarification
