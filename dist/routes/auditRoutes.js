"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const logs = await audit_1.auditService.getAllLogs();
        const chainIntegrity = await audit_1.auditService.verifyChain();
        return res.json({
            success: true,
            logs: [...logs].reverse(), // Newest first
            chainIntegrity,
            totalEntries: logs.length,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/', async (req, res) => {
    try {
        const deletedCount = await audit_1.auditService.clearAllLogs();
        return res.json({
            success: true,
            message: `Successfully cleared all audit trail records (${deletedCount} records removed).`,
            deletedCount,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/clear', async (req, res) => {
    try {
        const deletedCount = await audit_1.auditService.clearAllLogs();
        return res.json({
            success: true,
            message: `Successfully cleared all audit trail records (${deletedCount} records removed).`,
            deletedCount,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
