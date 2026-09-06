"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../db/mongodb");
const ComplianceResult_1 = require("../models/ComplianceResult");
const Bid_1 = require("../models/Bid");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/scores/:bidId — Get score and risk for a bid
router.get('/:bidId', auth_1.requireAuth, async (req, res) => {
    try {
        const { bidId } = req.params;
        await (0, mongodb_1.connectToDatabase)();
        // Check ComplianceResult collection first
        const result = await ComplianceResult_1.ComplianceResult.findOne({ bidId }).lean();
        if (result) {
            const score = result.overallScore ?? result.score;
            let riskLevel = result.riskLevel;
            // Critical statutory override
            if (riskLevel !== 'CRITICAL' && result.riskFactors?.some((f) => f.toLowerCase().includes('debarment') || f.toLowerCase().includes('blacklist'))) {
                riskLevel = 'CRITICAL';
            }
            const rules = result.ruleResults || (await Bid_1.Bid.findById(bidId).lean())?.evaluation?.ruleResults || [];
            const breakdown = rules.map((r) => ({
                ruleId: r.ruleId,
                ruleName: r.ruleName,
                category: r.category,
                weight: r.weight,
                score: r.score,
                weightedContribution: Math.round(((r.score || 0) / 100) * (r.weight || 0) * 100) / 100,
                status: r.status,
            }));
            return res.json({
                success: true,
                data: {
                    bidId,
                    score,
                    overallScore: score,
                    riskLevel,
                    recommendation: result.recommendation || result.status,
                    breakdown,
                    evaluatedAt: result.evaluatedAt instanceof Date ? result.evaluatedAt.toISOString() : result.evaluatedAt,
                },
            });
        }
        // Fallback: check bid's embedded evaluation
        const bid = await Bid_1.Bid.findById(bidId).lean();
        if (bid?.evaluation) {
            const eval_ = bid.evaluation;
            return res.json({
                success: true,
                data: {
                    bidId,
                    score: eval_.overallScore,
                    riskLevel: eval_.riskLevel,
                    recommendation: eval_.recommendation,
                    evaluatedAt: eval_.evaluatedAt instanceof Date ? eval_.evaluatedAt.toISOString() : eval_.evaluatedAt,
                },
            });
        }
        if (bid?.complianceScore !== undefined) {
            return res.json({
                success: true,
                data: {
                    bidId,
                    score: bid.complianceScore,
                    riskLevel: bid.riskLevel || 'MEDIUM',
                    recommendation: bid.recommendation || 'REQUIRES_MANUAL_REVIEW',
                },
            });
        }
        return res.status(404).json({ success: false, message: 'No score found for this bid', error: 'NOT_FOUND' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
    }
});
exports.default = router;
