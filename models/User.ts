import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'PROCUREMENT_OFFICER' | 'VIGILANCE_AUDITOR' | 'SYSTEM_ADMIN'
  department?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['PROCUREMENT_OFFICER', 'VIGILANCE_AUDITOR', 'SYSTEM_ADMIN'],
      default: 'PROCUREMENT_OFFICER',
      required: true,
    },
    department: { type: String, default: 'CPCL' },
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

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export default User
