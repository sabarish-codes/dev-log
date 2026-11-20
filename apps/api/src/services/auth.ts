import { sql, eq } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { users } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  createRefreshToken,
  signAccessToken,
  revokeRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${input.email})`)
    .limit(1);

  if (existing.length > 0) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const [newUser] = await db
    .insert(users)
    .values({
      username: input.username,
      email: input.email.toLowerCase(),
      passwordHash,
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    });

  const accessToken = await signAccessToken({
    userId: newUser.id,
    email: newUser.email,
  });
  const refreshToken = await createRefreshToken(newUser.id);

  return { user: newUser, accessToken, refreshToken };
}

interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${input.email})`)
    .limit(1);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }
  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }
  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
  });
  const refreshToken = await createRefreshToken(user.id);
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function getCurrentUser(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
}
export async function rotateRefreshToken(token: string) {
  const userId = await verifyRefreshToken(token);
  if (!userId) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    await revokeRefreshToken(token);
    throw new AppError('User not found', 401);
  }
  // Token rotation: revoke previous, create new
  await revokeRefreshToken(token);
  const newRefreshToken = await createRefreshToken(user.id);
  const newAccessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
  });
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
export async function logoutUser(token?: string) {
  if (token) {
    await revokeRefreshToken(token);
  }
}
