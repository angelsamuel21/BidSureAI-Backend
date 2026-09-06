import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose'

export interface IDocumentRecord extends MongooseDocument {
  id: string
  bidId: string
  fileName: string
  name?: string
  fileType?: string
  mimeType?: string
  fileSize?: number
  sizeBytes?: number
  storagePath?: string
  sha256?: string
  sha256Hash?: string
  documentType?: string
  processingStatus: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  extractionMethod?: 'TEXT' | 'OCR' | 'MIXED' | 'FAILED'
  extractedText?: string
  extractedFields?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export const DocumentSchema = new Schema<IDocumentRecord>(
  {
    bidId: { type: String, required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    fileType: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    sizeBytes: { type: Number },
    storagePath: { type: String },
    sha256: { type: String, trim: true },
    sha256Hash: { type: String, trim: true },
    documentType: { type: String },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'PROCESSED',
    },
    extractionMethod: {
      type: String,
      enum: ['TEXT', 'OCR', 'MIXED', 'FAILED'],
      default: 'TEXT',
    },
    extractedText: { type: String },
    extractedFields: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (!ret.name && ret.fileName) ret.name = ret.fileName
        if (!ret.fileName && ret.name) ret.fileName = ret.name
        if (!ret.sha256Hash && ret.sha256) ret.sha256Hash = ret.sha256
        if (!ret.sha256 && ret.sha256Hash) ret.sha256 = ret.sha256Hash
        if (!ret.sizeBytes && ret.fileSize) ret.sizeBytes = ret.fileSize
        if (!ret.fileSize && ret.sizeBytes) ret.fileSize = ret.sizeBytes
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

// Pre-save alias sync
DocumentSchema.pre('save', function () {
  if (!this.name && this.fileName) this.name = this.fileName
  if (!this.fileName && this.name) this.fileName = this.name
  if (!this.sha256Hash && this.sha256) this.sha256Hash = this.sha256
  if (!this.sha256 && this.sha256Hash) this.sha256 = this.sha256Hash
  if (!this.sizeBytes && this.fileSize) this.sizeBytes = this.fileSize
  if (!this.fileSize && this.sizeBytes) this.fileSize = this.sizeBytes
})

export const DocumentModel: Model<IDocumentRecord> =
  mongoose.models.Document || mongoose.model<IDocumentRecord>('Document', DocumentSchema)
export default DocumentModel
