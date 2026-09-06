import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITenderRequirement extends Document {
  id: string
  tenderId: string
  code?: string
  name: string
  description?: string
  category: 'STATUTORY' | 'TECHNICAL' | 'FINANCIAL' | 'TENDER_SPECIFIC'
  mandatory: boolean
  weight: number
  ruleType?: string
  expectedDocumentType?: string
  criteriaDetails?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export const TenderRequirementSchema = new Schema<ITenderRequirement>(
  {
    tenderId: { type: String, required: true, index: true },
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['STATUTORY', 'TECHNICAL', 'FINANCIAL', 'TENDER_SPECIFIC'],
      default: 'STATUTORY',
    },
    mandatory: { type: Boolean, default: true },
    weight: { type: Number, default: 10 },
    ruleType: { type: String },
    expectedDocumentType: { type: String },
    criteriaDetails: { type: Schema.Types.Mixed },
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

export const TenderRequirement: Model<ITenderRequirement> =
  mongoose.models.TenderRequirement || mongoose.model<ITenderRequirement>('TenderRequirement', TenderRequirementSchema)
export default TenderRequirement
