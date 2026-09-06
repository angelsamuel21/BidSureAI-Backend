import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../db/mongodb';
import { User } from '../models/User';
import {
  authenticateUser,
  createSessionToken,
  verifySessionToken,
  hashPassword,
  DEMO_USERS,
} from '../services/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Helper to compute cookie options compatible with cross-site deployments (e.g. Vercel <-> Render)
 */
export function getAuthCookieOptions(req: Request): express.CookieOptions {
  const origin = req.headers.origin || '';
  const isVercelOrigin = origin.includes('vercel.app');
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    isVercelOrigin ||
    Boolean(process.env.FRONTEND_URL?.startsWith('https://'));

  return {
    httpOnly: true,
    path: '/',
    maxAge: 86400 * 1000, // 24 hours
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
  };
}

// ─── POST /api/auth/register ────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, username, password, role, department } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password are required', error: 'VALIDATION_ERROR' });
    }

    const loginEmail = email || (username ? `${username}@cpcl.gov.in` : null);
    if (!loginEmail) {
      return res.status(400).json({ success: false, message: 'Email or username is required', error: 'VALIDATION_ERROR' });
    }

    await connectToDatabase();

    // Check for duplicate
    const existing = await User.findOne({
      $or: [{ email: loginEmail.toLowerCase().trim() }],
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists', error: 'DUPLICATE_USER' });
    }

    // Validate role
    const validRoles = ['PROCUREMENT_OFFICER', 'VIGILANCE_AUDITOR', 'SYSTEM_ADMIN'];
    const assignedRole = role && validRoles.includes(role) ? role : 'PROCUREMENT_OFFICER';

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: loginEmail.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      department: department || 'CPCL',
    });

    const authUser = {
      id: user.id || user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role as any,
      department: user.department,
    };

    const token = createSessionToken(authUser);

    res.cookie('gem_auth_token', token, getAuthCookieOptions(req));

    // Never return password hash
    res.status(201).json({
      success: true,
      data: authUser,
      user: authUser,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: 'REGISTRATION_FAILED' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────
// Also handles POST /api/auth (legacy)
const loginHandler = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const loginId = username || req.body.email;
    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required', error: 'VALIDATION_ERROR' });
    }

    const authResult = await authenticateUser(loginId, password);
    if (!authResult) {
      return res.status(401).json({ success: false, message: 'Invalid username or password', error: 'INVALID_CREDENTIALS' });
    }

    const { user, token } = authResult;

    res.cookie('gem_auth_token', token, getAuthCookieOptions(req));

    res.json({
      success: true,
      user,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: 'LOGIN_FAILED' });
  }
};

router.post('/login', loginHandler);
router.post('/', loginHandler); // Legacy path

// ─── GET /api/auth/me ───────────────────────────────────────────
// Also handles GET /api/auth (legacy)
const meHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
    const token = req.cookies?.gem_auth_token || bearerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' });
    }

    const user = verifySessionToken(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token', error: 'UNAUTHORIZED' });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: 'AUTH_CHECK_FAILED' });
  }
};

router.get('/me', meHandler);
router.get('/', meHandler); // Legacy path

// ─── DELETE /api/auth/logout ────────────────────────────────────
// Also handles DELETE /api/auth (legacy) and POST /api/auth/logout
const logoutHandler = (req: Request, res: Response) => {
  const cookieOpts = getAuthCookieOptions(req);
  res.cookie('gem_auth_token', '', {
    ...cookieOpts,
    maxAge: 0,
  });
  res.json({ success: true, message: 'Logged out' });
};

router.delete('/logout', logoutHandler);
router.delete('/', logoutHandler); // Legacy path
router.post('/logout', logoutHandler); // Also support POST for logout

export default router;
