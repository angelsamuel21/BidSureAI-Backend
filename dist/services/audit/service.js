"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const mongodb_1 = require("../../db/mongodb");
const AuditLog_1 = require("../../models/AuditLog");
const ledger_1 = require("./ledger");
class AuditService {
    async log(input) {
        try {
            await (0, mongodb_1.connectToDatabase)();
            // Find latest log in MongoDB
            const latest = await AuditLog_1.AuditLog.findOne().sort({ timestamp: -1, _id: -1 }).lean();
            const previousHash = latest?.currentHash || latest?.hash || ledger_1.GENESIS_HASH;
            const timestamp = new Date();
            const currentHash = ledger_1.auditLedger.calculateBlockHash(previousHash, input.action, timestamp.toISOString(), input.actor, input.details);
            const entry = new AuditLog_1.AuditLog({
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
            });
            await entry.save();
            return entry;
        }
        catch (err) {
            throw err;
        }
    }
    async getAllLogs() {
        try {
            await (0, mongodb_1.connectToDatabase)();
            const logs = await AuditLog_1.AuditLog.find().sort({ timestamp: 1, _id: 1 }).lean();
            if (logs && logs.length > 0) {
                return logs.map((l) => ({
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
                }));
            }
        }
        catch (err) {
            return [];
        }
        return [];
    }
    async verifyChain() {
        const logs = await this.getAllLogs();
        return ledger_1.auditLedger.verifyChainIntegrity(logs);
    }
    async clearAllLogs() {
        try {
            await (0, mongodb_1.connectToDatabase)();
            const result = await AuditLog_1.AuditLog.deleteMany({});
            return result.deletedCount || 0;
        }
        catch (err) {
            console.error('Error clearing audit logs:', err);
            throw err;
        }
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
exports.default = exports.auditService;
