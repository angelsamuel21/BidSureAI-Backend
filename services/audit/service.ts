import { connectToDatabase } from '@/db/mongodb'
import { AuditLog, IAuditLog } from '@/models/AuditLog'

import { auditLedger, GENESIS_HASH } from './ledger'
import { CreateAuditEntryInput, AuditChainVerificationResult } from './types'
import { AuditLogEntry } from '@/types'

export class AuditService {
  async log(input: CreateAuditEntryInput): Promise<IAuditLog | AuditLogEntry> {

    try {
      await connectToDatabase()

      // Find latest log in MongoDB
      const latest = await AuditLog.findOne().sort({ timestamp: -1, _id: -1 }).lean()
      const previousHash = latest?.currentHash || latest?.hash || GENESIS_HASH

      const timestamp = new Date()
      const currentHash = auditLedger.calculateBlockHash(
        previousHash,
        input.action,
        timestamp.toISOString(),
        input.actor,
        input.details
      )

      const entry = new AuditLog({
        userId: input.userId,
        actor: input.actor,
        role: input.role,
        action: input.action,
        tenderId: input.tenderId,
        bidId: input.bidId || input.bidderId,
        verificationId: input.verificationId,
        details: input.details,
        timestamp,
        previousHash,
        hash: currentHash,
        currentHash,
      })

      await entry.save()
      return entry
    } catch (err) {
      throw err
    }
  }

  async getAllLogs(): Promise<AuditLogEntry[]> {
    try {
      await connectToDatabase()
      const logs = await AuditLog.find().sort({ timestamp: 1, _id: 1 }).lean()

      if (logs && logs.length > 0) {
        return logs.map((l: any) => ({
          id: l._id ? l._id.toString() : l.id,
          timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
          actor: l.actor,
          role: l.role,
          action: l.action,
          tenderId: l.tenderId,
          bidId: l.bidId,
          bidderId: l.bidId,
          details: l.details,
          previousHash: l.previousHash,
          currentHash: l.currentHash || l.hash,
        }))
      }
    } catch (err) {
      return []
    }

    return []
  }

  async verifyChain(): Promise<AuditChainVerificationResult> {
    const logs = await this.getAllLogs()
    return auditLedger.verifyChainIntegrity(logs)
  }

  async clearAllLogs(): Promise<number> {
    try {
      await connectToDatabase()
      const result = await AuditLog.deleteMany({})
      return result.deletedCount || 0
    } catch (err) {
      console.error('Error clearing audit logs:', err)
      throw err
    }
  }
}

export const auditService = new AuditService()
export default auditService
