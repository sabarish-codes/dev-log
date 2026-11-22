import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as tagService from '../services/tags.js';

export const getTags: RequestHandler = asyncHandler(async (req, res) => {
  const tags = await tagService.getUserTags(req.user!.userId);
  res.status(200).json({ data: tags });
});
