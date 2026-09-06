"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Existing route modules
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const tenderRoutes_1 = __importDefault(require("./routes/tenderRoutes"));
const bidRoutes_1 = __importDefault(require("./routes/bidRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const auditRoutes_1 = __importDefault(require("./routes/auditRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
// New canonical route modules
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const complianceRoutes_1 = __importDefault(require("./routes/complianceRoutes"));
const scoreRoutes_1 = __importDefault(require("./routes/scoreRoutes"));
const recommendationRoutes_1 = __importDefault(require("./routes/recommendationRoutes"));
const decisionRoutes_1 = __importDefault(require("./routes/decisionRoutes"));
const app = (0, express_1.default)();
// CORS with credentials support - dynamically support local dev origins (5173, 5174, etc.) and FRONTEND_URL
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps, curl, postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// ─── Health ─────────────────────────────────────────────────────
app.use('/api/health', healthRoutes_1.default);
// ─── Auth ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes_1.default);
// ─── Tenders ────────────────────────────────────────────────────
app.use('/api/tenders', tenderRoutes_1.default);
// ─── Bids ───────────────────────────────────────────────────────
app.use('/api/bids', bidRoutes_1.default);
// ─── Documents (RESTful: /api/documents/:bidId) ─────────────────
app.use('/api/documents', documentRoutes_1.default);
// ─── Verifications ──────────────────────────────────────────────
app.use('/api/verifications', verificationRoutes_1.default);
// ─── Compliance ─────────────────────────────────────────────────
app.use('/api/compliance', complianceRoutes_1.default);
// ─── Scores ─────────────────────────────────────────────────────
app.use('/api/scores', scoreRoutes_1.default);
// ─── Recommendations ────────────────────────────────────────────
app.use('/api/recommendations', recommendationRoutes_1.default);
// ─── Decisions ──────────────────────────────────────────────────
app.use('/api/decisions', decisionRoutes_1.default);
// ─── Audit ──────────────────────────────────────────────────────
app.use('/api/audit', auditRoutes_1.default);
// ─── Legacy Routes (backward compatibility) ─────────────────────
// Keep old paths working alongside new canonical paths
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/verify', verificationRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error', error: 'INTERNAL_ERROR' });
});
exports.default = app;
