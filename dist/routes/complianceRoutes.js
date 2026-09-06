"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../db/mongodb");
const Bid_1 = require("../models/Bid");
const ComplianceResult_1 = require("../models/ComplianceResult");
const auth_1 = require("../middleware/auth");
const pipeline_1 = require("../services/verification/pipeline");
const router = (0, express_1.Router)();
// POST /api/compliance/:bidId/evaluate — Evaluate compliance for a bid
router.post('/:bidId/evaluate', auth_1.requireAuth, async (req, res) => {
    try {
        const bidId = req.params.bidId;
        const result = await pipeline_1.verificationPipelineService.executePipeline(bidId);
        const evaluation = result.evaluation;
        return res.json({
            success: true,
            data: {
                bidId,
                score: evaluation.overallScore,
                riskLevel: evaluation.riskLevel,
                recommendation: evaluation.recommendation,
                riskFactors: evaluation.riskFactors,
                ruleResults: evaluation.ruleResults,
                aiSummary: evaluation.aiSummary,
                aiFindings: evaluation.aiFindings,
                portalVerifications: evaluation.portalVerifications,
                evaluatedAt: evaluation.evaluatedAt,
            },
        });
    }
    catch (error) {
        console.error('Compliance evaluation error:', error);
        return res.status(500).json({ success: false, message: error.message, error: 'EVALUATION_FAILED' });
    }
});
// GET /api/compliance/:bidId — Get compliance result for a bid
router.get('/:bidId', auth_1.requireAuth, async (req, res) => {
    try {
        const { bidId } = req.params;
        await (0, mongodb_1.connectToDatabase)();
        const result = await ComplianceResult_1.ComplianceResult.findOne({ bidId }).lean();
        if (!result) {
            // Fallback: check bid's embedded evaluation
            const bid = await Bid_1.Bid.findById(bidId).lean();
            if (bid?.evaluation) {
                return res.json({ success: true, data: bid.evaluation });
            }
            return res.status(404).json({ success: false, message: 'No compliance result found', error: 'NOT_FOUND' });
        }
        return res.json({
            success: true,
            data: {
                id: result._id?.toString(),
                bidId: result.bidId,
                score: result.score,
                overallScore: result.overallScore || result.score,
                riskLevel: result.riskLevel,
                status: result.status,
                recommendation: result.recommendation || result.status,
                summary: result.summary || result.aiSummary,
                aiSummary: result.summary || result.aiSummary,
                riskFactors: result.riskFactors,
                ruleResults: result.ruleResults || (await Bid_1.Bid.findById(bidId).lean())?.evaluation?.ruleResults || [],
                portalVerifications: result.portalVerifications,
                aiFindings: result.aiFindings,
                evaluatedAt: result.evaluatedAt instanceof Date ? result.evaluatedAt.toISOString() : result.evaluatedAt,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
    }
});
exports.default = router;
