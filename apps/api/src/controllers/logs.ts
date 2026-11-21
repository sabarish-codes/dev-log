import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as logService from '../services/logs.js';

export const createLog: RequestHandler = asyncHandler(async (req, res) => {
  const log = await logService.createLog(req.user!.userId, req.body);
  res.status(201).json({ data: { log } });
});

export const getLogs: RequestHandler = asyncHandler(async (req, res) => {
  const logs = await logService.getLogs(req.user!.userId);
  res.status(200).json({ data: { logs } });
});
