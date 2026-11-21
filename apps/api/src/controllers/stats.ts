import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as statsService from '../services/stats.js';
export const getStats: RequestHandler = asyncHandler(async (req, res) => {
  const stats = await statsService.getUserStats(req.user!.userId);
  res.status(200).json({ data: { stats } });
});
