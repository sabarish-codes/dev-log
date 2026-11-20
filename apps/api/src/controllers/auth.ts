import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.js';
import { AppError } from '../errors/AppError.js';

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(
    req.body,
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    data: { user, accessToken },
  });
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body,
  );
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({
    data: { user, accessToken },
  });
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  res.status(200).json({ data: { user } });
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new AppError('Refresh token required', 401);
  }

  const { accessToken, refreshToken } =
    await authService.rotateRefreshToken(token);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ data: { accessToken } });
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.cookies?.refreshToken);
  res.clearCookie('refreshToken');
  res.status(200).json({ data: { message: 'Logged out successfully' } });
});
