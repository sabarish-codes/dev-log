import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: env.NODE_ENV === 'development' ? 1000 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
