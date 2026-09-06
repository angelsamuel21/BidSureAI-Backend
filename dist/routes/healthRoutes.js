"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const adapters_1 = require("../adapters");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    let dbStatus = 'disconnected';
    try {
        const state = mongoose_1.default.connection.readyState;
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (state === 1) {
            dbStatus = 'connected';
        }
        else if (state === 2) {
            dbStatus = 'connecting';
        }
        else if (state === 3) {
            dbStatus = 'disconnecting';
        }
    }
    catch {
        dbStatus = 'error';
    }
    const mlHealth = await adapters_1.mlServiceAdapter.checkHealth();
    const isDbHealthy = dbStatus === 'connected';
    const isHealthy = isDbHealthy && mlHealth.isHealthy;
    res.status(isHealthy ? 200 : (isDbHealthy ? 200 : 503)).json({
        success: isHealthy,
        status: isHealthy ? 'ok' : 'degraded',
        service: 'BIDSHIELD AI Backend',
        database: dbStatus,
        mlService: {
            status: mlHealth.isHealthy ? 'connected' : 'offline',
            models: mlHealth.models,
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
