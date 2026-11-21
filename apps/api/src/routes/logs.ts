import { Router } from 'express';
import { z } from 'zod';
import * as logController from '../controllers/logs.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const logsRouter: Router = Router();

const createLogSchema = z.object({
  title: z.string().trim().min(1).max(256),
  type: z.enum(['bug', 'error', 'config', 'discovery']),
  errorMsg: z.string().trim().optional().nullable(),
  whatHappened: z.string().trim().optional().nullable(),
  fixTakeaway: z.string().trim().min(1),
  link: z.string().trim().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timespentMinutes: z.coerce.number().int().positive(),
  project: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

logsRouter.post(
  '/',
  requireAuth,
  validate({ body: createLogSchema }),
  logController.createLog,
);
