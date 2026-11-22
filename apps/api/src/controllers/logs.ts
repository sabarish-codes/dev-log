import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as logService from '../services/logs.js';

export const createLog: RequestHandler = asyncHandler(async (req, res) => {
  const log = await logService.createLog(req.user!.userId, req.body);
  res.status(201).json({ data: { log } });
});

export const getLogs: RequestHandler = asyncHandler(async (req, res) => {
  const result = await logService.getLogs(
    req.user!.userId,
    req.query as unknown as logService.GetLogsParams,
  );
  res.status(200).json(result);
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

export const deleteLog: RequestHandler = asyncHandler(async (req, res) => {
  await logService.deleteLog(req.user!.userId, Number(req.params.id));
  res.status(200).json({ data: { message: 'Log deleted successfully' } });
});
