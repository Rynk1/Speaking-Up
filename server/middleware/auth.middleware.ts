import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export type UserRole =
  | 'CITIZEN'
  | 'INSTITUTION_REP'
  | 'JOURNALIST'
  | 'MODERATOR'
  | 'ADMIN'
  | 'EXECUTIVE_OBSERVER';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: UserRole;
  institutionId?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  correlationId?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  CITIZEN: ['posts:create', 'posts:view', 'posts:confirm', 'posts:comment', 'posts:share', 'posts:follow', 'posts:evidence'],
  INSTITUTION_REP: ['posts:view', 'posts:acknowledge', 'posts:respond', 'posts:action', 'posts:assign', 'posts:clarify', 'institution:manage'],
  JOURNALIST: ['posts:view', 'story_pack:generate', 'clusters:view', 'analytics:view'],
  MODERATOR: ['posts:view', 'posts:moderate', 'abuse_reports:manage', 'analytics:view'],
  ADMIN: ['*'],
  EXECUTIVE_OBSERVER: ['posts:view', 'clusters:view', 'analytics:view', 'audit:view']
};

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Guest allowed where applicable
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(roles: (UserRole | string)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: insufficient privileges for this role' });
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    if (!permissions.includes('*') && !permissions.includes(permission)) {
      return res.status(403).json({ error: `Access denied: missing required permission [${permission}]` });
    }
    next();
  };
}
