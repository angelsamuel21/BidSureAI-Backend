"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../db/mongodb");
const Bid_1 = require("../models/Bid");
const verification_1 = require("../services/verification");
const router = (0, express_1.Router)();
// POST /api/verify — Legacy endpoint (used by frontend NewVerificationView)
// Also POST /api/verifications — same handler
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { bidId, tenderId, bidderData, documents } = body;
        if (!bidId && !tenderId) {
            return res.status(400).json({ success: false, error: 'Bid ID or Tender ID is required' });
        }
        const result = await verification_1.verificationService.runVerification({
            bidId,
            tenderId: tenderId || 'GEM/2026/001',
            bidderData: bidderData || {},
            documents: documents || [],
        });
        return res.json({
            success: true,
            bid: result.bid,
            evaluation: result.evaluation,
            data: result,
        });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Verification could not be completed. Please try again.'
        });
    }
});
// POST /api/verifications/:bidId/run — Run verification on an existing bid
router.post('/:bidId/run', async (req, res) => {
    try {
        const { bidId } = req.params;
        const result = await verification_1.verificationService.runVerificationForBid(bidId);
        return res.json({
            success: true,
            bid: result.bid,
            evaluation: result.evaluation,
            data: result,
        });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Verification could not be completed.'
        });
    }
});
// GET /api/verifications/:bidId — Get verification result for a bid
router.get('/:bidId', async (req, res) => {
    try {
        const { bidId } = req.params;
        await (0, mongodb_1.connectToDatabase)();
        const bid = await Bid_1.Bid.findById(bidId).lean();
        if (!bid) {
            return res.status(404).json({ success: false, error: 'Bid not found' });
        }
        if (!bid.evaluation) {
            return res.status(404).json({ success: false, error: 'No verification result found for this bid' });
        }
        return res.json({
            success: true,
            data: bid.evaluation,
            bid: {
                id: bid._id?.toString(),
                bidderName: bid.bidderName,
                tenderId: bid.tenderId,
                tenderNumber: bid.tenderNumber,
                status: bid.status,
                evaluation: bid.evaluation,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
