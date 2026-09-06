import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAuditLog extends Document {
  id: string
  userId?: string
  actor: string
  role: string
  action: string
  tenderId?: string
  bidId?: string
  verificationId?: string
  details: string
  timestamp: Date
  previousHash: string
  hash: string
  currentHash?: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String },
    actor: { type: String, default: 'Procurement Officer' },
    role: { type: String, default: 'PROCUREMENT_OFFICER' },
    action: { type: String, required: true },
    tenderId: { type: String },
    bidId: { type: String },
    verificationId: { type: String, index: true },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true },
    currentHash: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.currentHash && ret.hash) ret.currentHash = ret.hash
        if (!ret.hash && ret.currentHash) ret.hash = ret.currentHash
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

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ timestamp: -1 })

AuditLogSchema.pre('save', function () {
  if (!this.currentHash && this.hash) this.currentHash = this.hash
  if (!this.hash && this.currentHash) this.hash = this.currentHash
})

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
export default AuditLog
