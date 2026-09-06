import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IRecommendation extends Document {
  id: string
  bidId: string
  recommendations: {
    finding: string
    recommendation: string
    severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'
    clauseReference?: string
  }[]
  generatedAt: Date
  generatedBy: string
  createdAt: Date
  updatedAt: Date
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    bidId: { type: String, required: true, unique: true, index: true },
    recommendations: [
      {
        finding: { type: String, required: true },
        recommendation: { type: String, required: true },
        severity: {
          type: String,
          enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'],
          default: 'INFO',
        },
        clauseReference: { type: String },
      },
    ],
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, default: 'Deterministic Recommendation Engine' },
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

export const Recommendation: Model<IRecommendation> =
  mongoose.models.Recommendation || mongoose.model<IRecommendation>('Recommendation', RecommendationSchema)
export default Recommendation
