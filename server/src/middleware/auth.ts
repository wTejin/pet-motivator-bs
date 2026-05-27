import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: 'admin' | 'coach'
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' })
  }

  const payload = verifyToken(header.slice(7))
  if (!payload) {
    return res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }

  req.userId = payload.id
  req.userRole = payload.role
  next()
}

export function requireRole(role: 'admin' | 'coach') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role) {
      return res.status(403).json({ success: false, error: '权限不足' })
    }
    next()
  }
}
