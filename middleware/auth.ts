import { Request, Response, NextFunction } from 'express'
import { verifySessionToken } from '../services/auth'
import { AuthUser } from '../services/auth/types'

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Middleware: Require authenticated user.
 * Checks cookie `gem_auth_token` or `Authorization: Bearer <token>` header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.gem_auth_token ||
    req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required', error: 'UNAUTHORIZED' })
    return
  }

  const user = verifySessionToken(token)
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: 'UNAUTHORIZED' })
    return
  }

  req.user = user
  next()
}

/**
 * Middleware: Require one of the specified roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required', error: 'UNAUTHORIZED' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        error: 'FORBIDDEN',
      })
      return
    }

    next()
  }
}
