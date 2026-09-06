import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Existing route modules
import authRoutes from './routes/authRoutes';
import tenderRoutes from './routes/tenderRoutes';
import bidRoutes from './routes/bidRoutes';
import verificationRoutes from './routes/verificationRoutes';
import auditRoutes from './routes/auditRoutes';
import uploadRoutes from './routes/uploadRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

// New canonical route modules
import healthRoutes from './routes/healthRoutes';
import documentRoutes from './routes/documentRoutes';
import complianceRoutes from './routes/complianceRoutes';
import scoreRoutes from './routes/scoreRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import decisionRoutes from './routes/decisionRoutes';

const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS ALB) for correct protocol and IP detection
app.set('trust proxy', 1);

// Normalize duplicate slashes in request URLs (e.g. //api/auth/login -> /api/auth/login)
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// CORS with credentials support - dynamically support local dev origins, Vercel deployments, and FRONTEND_URL
const allowedOrigins = [
  'https://bid-sure-ai.vercel.app',
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
  const cleanFront = process.env.FRONTEND_URL.replace(/\/+$/, '');
  if (!allowedOrigins.includes(cleanFront)) {
    allowedOrigins.push(cleanFront);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)
    ) {
      return callback(null, origin);
    }
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());
app.use(cookieParser());

// ─── Health ─────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);

// ─── Auth ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
// Convenience aliases so /api/login and /api/me work directly
app.use('/api/login', authRoutes);
app.use('/api/me', authRoutes);

// ─── Tenders ────────────────────────────────────────────────────
app.use('/api/tenders', tenderRoutes);

// ─── Bids ───────────────────────────────────────────────────────
app.use('/api/bids', bidRoutes);

// ─── Documents (RESTful: /api/documents/:bidId) ─────────────────
app.use('/api/documents', documentRoutes);

// ─── Verifications ──────────────────────────────────────────────
app.use('/api/verifications', verificationRoutes);

// ─── Compliance ─────────────────────────────────────────────────
app.use('/api/compliance', complianceRoutes);

// ─── Scores ─────────────────────────────────────────────────────
app.use('/api/scores', scoreRoutes);

// ─── Recommendations ────────────────────────────────────────────
app.use('/api/recommendations', recommendationRoutes);

// ─── Decisions ──────────────────────────────────────────────────
app.use('/api/decisions', decisionRoutes);

// ─── Audit ──────────────────────────────────────────────────────
app.use('/api/audit', auditRoutes);

// ─── Legacy Routes (backward compatibility) ─────────────────────
// Keep old paths working alongside new canonical paths
app.use('/api/upload', uploadRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error', error: 'INTERNAL_ERROR' });
});

export default app;
