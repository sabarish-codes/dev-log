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

export const getLogById: RequestHandler = asyncHandler(async (req, res) => {
  const log = await logService.getLogById(
    req.user!.userId,
    Number(req.params.id),
  );
  res.status(200).json({ data: { log } });
});

export const updateLog: RequestHandler = asyncHandler(async (req, res) => {
  const log = await logService.updateLog(
    req.user!.userId,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ data: { log } });
});
