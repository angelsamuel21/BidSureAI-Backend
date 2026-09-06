import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBidder extends Document {
  id: string
  name: string
  legalName?: string
  registrationNumber?: string
  pan?: string
  gstin?: string
  udyamNumber?: string
  address?: string
  category?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE'
  contactEmail?: string
  contactPhone?: string
  isDebarred: boolean
  createdAt: Date
  updatedAt: Date
}

const BidderSchema = new Schema<IBidder>(
  {
    name: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    pan: { type: String, trim: true, uppercase: true, index: true },
    gstin: { type: String, trim: true, uppercase: true, index: true },
    udyamNumber: { type: String, trim: true },
    address: { type: String },
    category: {
      type: String,
      enum: ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'],
      default: 'MICRO',
    },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isDebarred: { type: Boolean, default: false, index: true },
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

export const Bidder: Model<IBidder> = mongoose.models.Bidder || mongoose.model<IBidder>('Bidder', BidderSchema)
export default Bidder
