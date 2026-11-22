import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as tagController from '../controllers/tags.js';

export const tagsRouter: Router = Router();

tagsRouter.get('/', requireAuth, tagController.getTags);
