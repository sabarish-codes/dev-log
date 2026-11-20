import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken, type TokenPayload } from '../utils/token.js';

// Extend Express Request to include req.user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.slice(7).trim();
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return next(new AppError('Invalid or expired token', 401));
  }

  req.user = payload;
  next();
};
