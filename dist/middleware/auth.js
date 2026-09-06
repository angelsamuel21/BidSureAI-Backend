"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_1 = require("../services/auth");
/**
 * Middleware: Require authenticated user.
 * Checks cookie `gem_auth_token` or `Authorization: Bearer <token>` header.
 */
function requireAuth(req, res, next) {
    const token = req.cookies?.gem_auth_token ||
        req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ success: false, message: 'Authentication required', error: 'UNAUTHORIZED' });
        return;
    }
    const user = (0, auth_1.verifySessionToken)(token);
    if (!user) {
        res.status(401).json({ success: false, message: 'Invalid or expired token', error: 'UNAUTHORIZED' });
        return;
    }
    req.user = user;
    next();
}
/**
 * Middleware: Require one of the specified roles.
 * Must be used AFTER requireAuth.
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', error: 'UNAUTHORIZED' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`,
                error: 'FORBIDDEN',
            });
            return;
        }
        next();
    };
}
