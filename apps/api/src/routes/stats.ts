import { Router } from 'express';
import * as statsController from '../controllers/stats.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter: Router = Router();

statsRouter.get('/', requireAuth, statsController.getStats);
