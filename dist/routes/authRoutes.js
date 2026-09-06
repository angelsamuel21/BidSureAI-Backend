"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongodb_1 = require("../db/mongodb");
const User_1 = require("../models/User");
const auth_1 = require("../services/auth");
const router = (0, express_1.Router)();
// ─── POST /api/auth/register ────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, username, password, role, department } = req.body;
        if (!name || !password) {
            return res.status(400).json({ success: false, message: 'Name and password are required', error: 'VALIDATION_ERROR' });
        }
        const loginEmail = email || (username ? `${username}@cpcl.gov.in` : null);
        if (!loginEmail) {
            return res.status(400).json({ success: false, message: 'Email or username is required', error: 'VALIDATION_ERROR' });
        }
        await (0, mongodb_1.connectToDatabase)();
        // Check for duplicate
        const existing = await User_1.User.findOne({
            $or: [{ email: loginEmail.toLowerCase().trim() }],
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'User already exists', error: 'DUPLICATE_USER' });
        }
        // Validate role
        const validRoles = ['PROCUREMENT_OFFICER', 'VIGILANCE_AUDITOR', 'SYSTEM_ADMIN'];
        const assignedRole = role && validRoles.includes(role) ? role : 'PROCUREMENT_OFFICER';
        // Hash password with bcrypt
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.User.create({
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
            role: user.role,
            department: user.department,
        };
        const token = (0, auth_1.createSessionToken)(authUser);
        res.cookie('gem_auth_token', token, {
            httpOnly: true,
            path: '/',
            maxAge: 86400 * 1000,
            sameSite: 'lax',
        });
        // Never return password hash
        res.status(201).json({
            success: true,
            data: authUser,
            token,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message, error: 'REGISTRATION_FAILED' });
    }
});
// ─── POST /api/auth/login ───────────────────────────────────────
// Also handles POST /api/auth (legacy)
const loginHandler = async (req, res) => {
    try {
        const { username, password } = req.body;
        const loginId = username || req.body.email;
        if (!loginId || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required', error: 'VALIDATION_ERROR' });
        }
        const authResult = await (0, auth_1.authenticateUser)(loginId, password);
        if (!authResult) {
            return res.status(401).json({ success: false, message: 'Invalid username or password', error: 'INVALID_CREDENTIALS' });
        }
        const { user, token } = authResult;
        res.cookie('gem_auth_token', token, {
            httpOnly: true,
            path: '/',
            maxAge: 86400 * 1000,
            sameSite: 'lax',
        });
        res.json({
            success: true,
            user,
            token,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message, error: 'LOGIN_FAILED' });
    }
};
router.post('/login', loginHandler);
router.post('/', loginHandler); // Legacy path
// ─── GET /api/auth/me ───────────────────────────────────────────
// Also handles GET /api/auth (legacy)
const meHandler = async (req, res) => {
    try {
        const token = req.cookies?.gem_auth_token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' });
        }
        const user = (0, auth_1.verifySessionToken)(token);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token', error: 'UNAUTHORIZED' });
        }
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message, error: 'AUTH_CHECK_FAILED' });
    }
};
router.get('/me', meHandler);
router.get('/', meHandler); // Legacy path
// ─── DELETE /api/auth/logout ────────────────────────────────────
// Also handles DELETE /api/auth (legacy)
const logoutHandler = (_req, res) => {
    res.cookie('gem_auth_token', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
    });
    res.json({ success: true, message: 'Logged out' });
};
router.delete('/logout', logoutHandler);
router.delete('/', logoutHandler); // Legacy path
router.post('/logout', logoutHandler); // Also support POST for logout
exports.default = router;
