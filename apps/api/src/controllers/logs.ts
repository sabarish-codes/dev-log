import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as logService from '../services/logs.js';

export const createLog: RequestHandler = asyncHandler(async (req, res) => {
  const log = await logService.createLog(req.user!.userId, req.body);
  res.status(201).json({ data: { log } });
});
