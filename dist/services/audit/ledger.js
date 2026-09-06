"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLedger = exports.AuditLedger = exports.GENESIS_HASH = void 0;
const crypto_1 = __importDefault(require("crypto"));
exports.GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
class AuditLedger {
    calculateBlockHash(previousHash, action, timestamp, actor, details) {
        const payload = `${previousHash}|${action}|${timestamp}|${actor}|${details}`;
        return crypto_1.default.createHash('sha256').update(payload).digest('hex');
    }
    createEntry(input, previousHash = exports.GENESIS_HASH) {
        const timestamp = new Date().toISOString();
        const currentHash = this.calculateBlockHash(previousHash, input.action, timestamp, input.actor, input.details);
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
        };
    }
    verifyChainIntegrity(entries) {
        if (!entries || entries.length === 0) {
            return {
                isValid: true,
                totalBlocks: 0,
                genesisHash: exports.GENESIS_HASH,
                latestHash: exports.GENESIS_HASH,
            };
        }
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const expectedPrevHash = i === 0 ? exports.GENESIS_HASH : entries[i - 1].currentHash;
            if (entry.previousHash !== expectedPrevHash) {
                return {
                    isValid: false,
                    totalBlocks: entries.length,
                    genesisHash: entries[0].previousHash,
                    latestHash: entries[entries.length - 1].currentHash,
                    tamperedIndex: i,
                };
            }
            const recalculatedHash = this.calculateBlockHash(entry.previousHash, entry.action, entry.timestamp, entry.actor, entry.details);
            if (entry.currentHash !== recalculatedHash) {
                return {
                    isValid: false,
                    totalBlocks: entries.length,
                    genesisHash: entries[0].previousHash,
                    latestHash: entries[entries.length - 1].currentHash,
                    tamperedIndex: i,
                };
            }
        }
        return {
            isValid: true,
            totalBlocks: entries.length,
            genesisHash: entries[0].previousHash,
            latestHash: entries[entries.length - 1].currentHash,
        };
    }
}
exports.AuditLedger = AuditLedger;
exports.auditLedger = new AuditLedger();
exports.default = exports.auditLedger;
