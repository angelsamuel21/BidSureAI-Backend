"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../db/mongodb");
const Bid_1 = require("../models/Bid");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// POST /api/decisions/:bidId — Record officer decision
router.post('/:bidId', auth_1.requireAuth, (0, auth_1.requireRole)('PROCUREMENT_OFFICER', 'SYSTEM_ADMIN'), async (req, res) => {
    try {
        const bidId = req.params.bidId;
        const { decision, reason, justification } = req.body;
        // Validate decision
        const validDecisions = ['QUALIFIED', 'DISQUALIFIED', 'CLARIFICATION_REQUIRED'];
        if (!decision || !validDecisions.includes(decision)) {
            return res.status(400).json({
                success: false,
                message: `Invalid decision. Must be one of: ${validDecisions.join(', ')}`,
                error: 'INVALID_DECISION',
            });
        }
        await (0, mongodb_1.connectToDatabase)();
        const bid = await Bid_1.Bid.findById(bidId);
        if (!bid) {
            return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' });
        }
        const officerName = req.user.name;
        const officerRole = req.user.role;
        const decisionReason = reason || justification || `${officerName} recorded ${decision}`;
        // Map canonical decision to internal action types
        let actionType;
        let bidStatus;
        if (decision === 'QUALIFIED') {
            actionType = 'APPROVE';
            bidStatus = 'QUALIFIED';
        }
        else if (decision === 'DISQUALIFIED') {
            actionType = 'REJECT';
            bidStatus = 'DISQUALIFIED';
        }
        else {
            actionType = 'REQUEST_CLARIFICATION';
            bidStatus = 'CLARIFICATION_REQUESTED';
        }
        bid.officerDecision = {
            decision: actionType,
            justification: decisionReason,
            officerName,
            officerRole,
            timestamp: new Date(),
        };
        bid.status = bidStatus;
        bid.decision = actionType;
        bid.decisionReason = decisionReason;
        bid.officerName = officerName;
        bid.officerRole = officerRole;
        bid.decisionTime = new Date();
        await bid.save();
        await audit_1.auditService.log({
            actor: officerName,
            role: officerRole,
            action: 'DECISION_RECORDED',
            bidId,
            details: `Officer decision: ${decision} for bid ${bidId}. Reason: ${decisionReason}. Officer: ${officerName} (${officerRole}).`,
        });
        return res.json({
            success: true,
            data: {
                bidId,
                decision,
                officer: officerName,
                role: officerRole,
                reason: decisionReason,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: 'DECISION_FAILED' });
    }
});
exports.default = router;
