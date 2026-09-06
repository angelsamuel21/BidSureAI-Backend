import mongoose, { Schema, Document, Model } from 'mongoose'
import { TenderRequirementSchema, ITenderRequirement } from './TenderRequirement'

export interface ITender extends Document {
  id: string
  tenderId: string
  tenderNumber: string
  title: string
  description?: string
  department: string
  estimatedValueCr?: number
  submissionDeadline?: Date
  status: string
  requirements: ITenderRequirement[]
  createdAt: Date
  updatedAt: Date
}

const TenderSchema = new Schema<ITender>(
  {
    tenderNumber: { type: String, required: true, unique: true, trim: true, index: true },
    tenderId: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    department: { type: String, default: 'Chennai Petroleum Corporation Limited (CPCL)' },
    estimatedValueCr: { type: Number, default: 1.0 },
    submissionDeadline: { type: Date },
    status: { type: String, default: 'ACTIVE', index: true },
    requirements: [TenderRequirementSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.tenderId && ret.tenderNumber) ret.tenderId = ret.tenderNumber
        if (!ret.tenderNumber && ret.tenderId) ret.tenderNumber = ret.tenderId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.tenderId && ret.tenderNumber) ret.tenderId = ret.tenderNumber
        if (!ret.tenderNumber && ret.tenderId) ret.tenderNumber = ret.tenderId
        return ret
      },
    },
  }
)

// Pre-save hook to ensure tenderId and tenderNumber stay in sync
TenderSchema.pre('save', function () {
  if (!this.tenderId && this.tenderNumber) {
    this.tenderId = this.tenderNumber
  } else if (!this.tenderNumber && this.tenderId) {
    this.tenderNumber = this.tenderId
  }
})

export const Tender: Model<ITender> = mongoose.models.Tender || mongoose.model<ITender>('Tender', TenderSchema)
export default Tender
