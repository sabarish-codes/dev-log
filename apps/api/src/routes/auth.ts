import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

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

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login,
);

authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
