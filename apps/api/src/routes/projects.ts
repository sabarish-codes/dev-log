import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as projectController from '../controllers/projects.js';

export const projectsRouter: Router = Router();

projectsRouter.get('/', requireAuth, projectController.getProjects);
