"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = exports.DEFAULT_TENDER = void 0;
const ledger_1 = require("../services/audit/ledger");
exports.DEFAULT_TENDER = {
    id: 'tender-gem-001',
    tenderId: 'GEM/2026/001',
    title: 'Supply of Industrial Equipment',
    description: 'Annual rate contract for certified personal protective equipment and industrial safety gear for CPCL Refinery.',
    department: 'Chennai Petroleum Corporation Limited (CPCL)',
    estimatedValueCr: 4.85,
    submissionDeadline: '2026-09-30T18:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-08-01T10:00:00Z',
    requirements: [
        {
            id: 'req-1',
            code: 'STAT_GST',
            name: 'Active GST Registration',
            description: 'Bidder must possess active Regular taxpayer GSTIN with consistent legal name.',
            category: 'STATUTORY',
            mandatory: true,
            weight: 20,
            expectedDocumentType: 'GST_REGISTRATION_CERTIFICATE',
        },
        {
            id: 'req-2',
            code: 'STAT_PAN',
            name: 'Permanent Account Number (PAN)',
            description: 'Valid PAN registered with Income Tax Department matching entity name.',
            category: 'STATUTORY',
            mandatory: true,
            weight: 15,
            expectedDocumentType: 'PAN_CARD',
        },
        {
            id: 'req-3',
            code: 'STAT_DEBARMENT',
            name: 'Zero Debarment / Blacklisting Clearance',
            description: 'Bidder must have no active sanctions or blacklisting on CVC, GeM, or MoPNG records.',
            category: 'STATUTORY',
            mandatory: true,
            weight: 25,
            expectedDocumentType: 'DECLARATION',
        },
        {
            id: 'req-4',
            code: 'STAT_UDYAM',
            name: 'Udyam / MSME Registration',
            description: 'Micro/Small enterprise certificate for statutory EMD/turnover exemptions under PPP Order 2012.',
            category: 'STATUTORY',
            mandatory: false,
            weight: 10,
            expectedDocumentType: 'UDYAM_MSME_CERTIFICATE',
        },
        {
            id: 'req-5',
            code: 'TECH_MII',
            name: 'Make in India Local Content (>= 50%)',
            description: 'Class-I Local Supplier declaration with minimum 50% domestic value addition.',
            category: 'TECHNICAL',
            mandatory: true,
            weight: 15,
            expectedDocumentType: 'MAKE_IN_INDIA_DECLARATION',
            criteriaDetails: { minLocalContentPercent: 50 },
        },
        {
            id: 'req-6',
            code: 'TECH_OEM',
            name: 'Manufacturer Authorization Form (OEM)',
            description: 'Valid authorization letter from primary manufacturer agreeing to warranty commitments.',
            category: 'TECHNICAL',
            mandatory: true,
            weight: 15,
            expectedDocumentType: 'OEM_AUTHORIZATION_LETTER',
        },
    ],
};
// Memory fallback store ensuring uninterrupted dev & live testing
class MemoryFallbackStore {
    bids = new Map();
    tenders = [exports.DEFAULT_TENDER];
    auditLogs = [];
    constructor() {
        this.initDemoLogs();
    }
    initDemoLogs() {
        const t1 = '2026-08-01T10:00:00.000Z';
        const h1 = ledger_1.auditLedger.calculateBlockHash(ledger_1.GENESIS_HASH, 'TENDER_PUBLISHED', t1, 'Riya Kapoor', `Tender GEM/2026/001 published with 6 mandatory/technical compliance rules.`);
        this.auditLogs.push({
            id: 'audit-init-1',
            actor: 'Riya Kapoor',
            role: 'PROCUREMENT_OFFICER',
            action: 'TENDER_PUBLISHED',
            tenderId: 'GEM/2026/001',
            details: `Tender GEM/2026/001 published with 6 mandatory/technical compliance rules.`,
            timestamp: t1,
            previousHash: ledger_1.GENESIS_HASH,
            currentHash: h1,
        });
    }
    getTenders() {
        return this.tenders;
    }
    addTender(t) {
        this.tenders.push(t);
    }
    getBids() {
        return Array.from(this.bids.values());
    }
    getBid(id) {
        return this.bids.get(id);
    }
    saveBid(bid) {
        this.bids.set(bid.id, bid);
    }
    getAuditLogs() {
        return this.auditLogs;
    }
    addAuditLog(entry) {
        const latest = this.auditLogs[this.auditLogs.length - 1];
        const previousHash = latest?.currentHash || ledger_1.GENESIS_HASH;
        const timestamp = new Date().toISOString();
        const currentHash = ledger_1.auditLedger.calculateBlockHash(previousHash, entry.action, timestamp, entry.actor, entry.details);
        const log = {
            id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp,
            actor: entry.actor,
            role: entry.role,
            action: entry.action,
            tenderId: entry.tenderId,
            bidderId: entry.bidId,
            details: entry.details,
            previousHash,
            currentHash,
        };
        this.auditLogs.push(log);
        return log;
    }
}
exports.memoryStore = global.memoryStore || (global.memoryStore = new MemoryFallbackStore());
exports.default = exports.memoryStore;
