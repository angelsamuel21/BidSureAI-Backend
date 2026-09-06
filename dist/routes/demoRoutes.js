"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/seed', async (req, res) => {
    try {
        const { action } = req.body;
        if (action === 'RESET') {
            try {
                const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
                exec('node scripts/seed-db.mjs', { cwd: '..' });
            }
            catch (e) {
                console.warn('Seed invocation warning:', e);
            }
            return res.json({ success: true, message: 'Database reset to baseline demo state.' });
        }
        const demoProfiles = [
            {
                id: 'abc',
                title: 'Profile 1: Compliant Bidder',
                bidderName: 'ABC Industries Pvt. Ltd.',
                tenderId: 'GEM/2026/001',
                registrationNumber: 'REG-ABC-2018-0934',
                gstin: '09ABCDE1234F1Z5',
                pan: 'ABCDE1234F',
                udyamNumber: 'UDYAM-UP-01-0019284',
                expectedScore: 94,
                expectedRisk: 'LOW',
                expectedRecommendation: 'COMPLIANT',
                summary: 'Clean statutory compliance. Active GSTIN, valid PAN, verified Udyam Micro Enterprise, valid OEM authorization, and 65% local content (>= 50% required).',
                sampleDocuments: [
                    'GST Certificate.pdf',
                    'PAN Certificate.pdf',
                    'Udyam Certificate.pdf',
                    'OEM Authorization.pdf',
                    'Local Content Declaration.pdf',
                ],
            },
            {
                id: 'xyz',
                title: 'Profile 2: Mismatch Bidder',
                bidderName: 'XYZ Enterprises',
                tenderId: 'GEM/2026/001',
                registrationNumber: 'REG-XYZ-2019-4412',
                gstin: '27AAACB1234P1Z8',
                pan: 'AAACB1234P',
                udyamNumber: 'UDYAM-MH-12-0048192',
                expectedScore: 68,
                expectedRisk: 'HIGH',
                expectedRecommendation: 'REQUIRES_MANUAL_REVIEW',
                summary: 'Material discrepancy detected: Bidder claims 65% local content in self-declaration, but OEM document specifies only 42%. Officer clarification required.',
                sampleDocuments: [
                    'GST Certificate.pdf',
                    'PAN Certificate.pdf',
                    'OEM Authorization.pdf',
                    'Local Content Declaration (65% Claimed).pdf',
                ],
            },
            {
                id: 'pqr',
                title: 'Profile 3: Debarred Bidder',
                bidderName: 'PQR Technologies',
                tenderId: 'GEM/2026/001',
                registrationNumber: 'REG-PQR-2015-1120',
                gstin: '07AAAAA0000A1Z9',
                pan: 'AAAAA0000A',
                expectedScore: 38,
                expectedRisk: 'CRITICAL',
                expectedRecommendation: 'NON-COMPLIANT',
                summary: 'Critical failure: Entity is actively debarred by Ministry of Petroleum & Natural Gas on CVC/GeM registries. Mandatory immediate disqualification.',
                sampleDocuments: [
                    'GST Certificate.pdf',
                    'PAN Certificate.pdf',
                    'OEM Authorization.pdf',
                ],
            },
        ];
        return res.json({ success: true, profiles: demoProfiles });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
