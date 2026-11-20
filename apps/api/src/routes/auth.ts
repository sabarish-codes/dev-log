import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.js';
import { validate } from '../middleware/validate.js';

export const authRouter: Router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(256),
  password: z.string().min(8).max(100),
});

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register,
);
