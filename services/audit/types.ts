import { AuditLogEntry, UserRole } from '@/types'

export interface CreateAuditEntryInput {
  actor: string
  role: UserRole
  action: string
  tenderId?: string
  bidderId?: string
  bidId?: string
  verificationId?: string
  userId?: string
  details: string
}

export interface AuditChainVerificationResult {
  isValid: boolean
  totalBlocks: number
  genesisHash: string
  latestHash: string
  tamperedIndex?: number
}
