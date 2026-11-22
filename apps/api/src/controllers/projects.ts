import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as projectService from '../services/projects.js';

export const getProjects: RequestHandler = asyncHandler(async (req, res) => {
  const projects = await projectService.getUserProjects(req.user!.userId);
  res.status(200).json({ data: projects });
});
