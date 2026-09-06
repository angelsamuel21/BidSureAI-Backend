"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../db/mongodb");
const Bid_1 = require("../models/Bid");
const router = (0, express_1.Router)();
router.get('/stats', async (req, res) => {
    try {
        let totalBids = 0;
        let verifiedBids = 0;
        let pendingBids = 0;
        let highRiskBids = 0;
        let criticalBids = 0;
        await (0, mongodb_1.connectToDatabase)();
        const bids = await Bid_1.Bid.find().lean();
        if (bids && bids.length > 0) {
            totalBids = bids.length;
            bids.forEach((b) => {
                if (b.status === 'QUALIFIED' || b.status === 'DISQUALIFIED' || b.evaluation) {
                    verifiedBids++;
                }
                if (b.status === 'PENDING') {
                    pendingBids++;
                }
                if (b.evaluation?.riskLevel === 'HIGH') {
                    highRiskBids++;
                }
                if (b.evaluation?.riskLevel === 'CRITICAL') {
                    criticalBids++;
                }
            });
        }
        return res.json({
            success: true,
            stats: {
                totalBids,
                verifiedBids,
                pendingBids,
                highRiskBids,
                criticalBids
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
