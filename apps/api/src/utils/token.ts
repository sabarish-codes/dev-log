import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

const secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface TokenPayload {
  userId: number;
  email: string;
}

// 1. Access Token (JWT)
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secretKey);
}

export async function verifyAccessToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// 2. Refresh Token (Opaque UUID in Redis)
export async function createRefreshToken(userId: number): Promise<string> {
  const token = randomUUID();
  const ttlSeconds = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  await redis.set(`refresh:${token}`, userId.toString(), { EX: ttlSeconds });
  return token;
}

export async function verifyRefreshToken(
  token: string,
): Promise<number | null> {
  const userId = await redis.get(`refresh:${token}`);
  return userId ? Number(userId) : null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await redis.del(`refresh:${token}`);
}
