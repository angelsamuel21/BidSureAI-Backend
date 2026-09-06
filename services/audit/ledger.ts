import crypto from 'crypto'
import { AuditLogEntry } from '@/types'
import { CreateAuditEntryInput, AuditChainVerificationResult } from './types'

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

export class AuditLedger {
  calculateBlockHash(
    previousHash: string,
    action: string,
    timestamp: string,
    actor: string,
    details: string
  ): string {
    const payload = `${previousHash}|${action}|${timestamp}|${actor}|${details}`
    return crypto.createHash('sha256').update(payload).digest('hex')
  }

  createEntry(
    input: CreateAuditEntryInput,
    previousHash: string = GENESIS_HASH
  ): AuditLogEntry {
    const timestamp = new Date().toISOString()
    const currentHash = this.calculateBlockHash(
      previousHash,
      input.action,
      timestamp,
      input.actor,
      input.details
    )

    return {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      actor: input.actor,
      role: input.role,
      action: input.action,
      tenderId: input.tenderId,
      bidderId: input.bidderId,
      details: input.details,
      previousHash,
      currentHash,
    }
  }

  verifyChainIntegrity(entries: AuditLogEntry[]): AuditChainVerificationResult {
    if (!entries || entries.length === 0) {
      return {
        isValid: true,
        totalBlocks: 0,
        genesisHash: GENESIS_HASH,
        latestHash: GENESIS_HASH,
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const expectedPrevHash = i === 0 ? GENESIS_HASH : entries[i - 1].currentHash

      if (entry.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalBlocks: entries.length,
          genesisHash: entries[0].previousHash,
          latestHash: entries[entries.length - 1].currentHash,
          tamperedIndex: i,
        }
      }

      const recalculatedHash = this.calculateBlockHash(
        entry.previousHash,
        entry.action,
        entry.timestamp,
        entry.actor,
        entry.details
      )

      if (entry.currentHash !== recalculatedHash) {
        return {
          isValid: false,
          totalBlocks: entries.length,
          genesisHash: entries[0].previousHash,
          latestHash: entries[entries.length - 1].currentHash,
          tamperedIndex: i,
        }
      }
    }

    return {
      isValid: true,
      totalBlocks: entries.length,
      genesisHash: entries[0].previousHash,
      latestHash: entries[entries.length - 1].currentHash,
    }
  }
}

export const auditLedger = new AuditLedger()
export default auditLedger
