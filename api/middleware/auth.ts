import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'social-security-transfer-secret-key';

export interface AuthRequest extends Request {
  user?: Omit<User, 'password'>;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未提供认证令牌', data: null });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Omit<User, 'password'>;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ code: 401, message: '认证令牌无效或已过期', data: null });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ code: 403, message: '需要管理员权限', data: null });
    return;
  }
  next();
};

export const generateToken = (user: Omit<User, 'password'>): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
