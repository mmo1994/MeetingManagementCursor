import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header or cookie
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies?.accessToken;
    }
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.userId = payload.userId;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies?.accessToken;
    }
    
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
      req.userId = payload.userId;
    }
  } catch {
    // Token invalid - continue without auth
  }
  
  next();
}

