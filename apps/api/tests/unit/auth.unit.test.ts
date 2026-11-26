import { SignJWT } from 'jose';
import { env } from '../../src/config/env.js';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import { signAccessToken, verifyAccessToken } from '../../src/utils/token.js';

describe('Password helpers', () => {
  it('hashes a password and verifies the matching plaintext', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(hash).not.toBe('SuperSecret123!');
    expect(await verifyPassword('SuperSecret123!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(await verifyPassword('WrongPassword!', hash)).toBe(false);
  });

  it('produces different hashes for the same password (unique salt)', async () => {
    const hash1 = await hashPassword('SamePassword1!');
    const hash2 = await hashPassword('SamePassword1!');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Token helpers (JWT)', () => {
  it('signs and verifies a valid access token', async () => {
    const token = await signAccessToken({
      userId: 42,
      email: 'dev@example.com',
    });

    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({
      userId: 42,
      email: 'dev@example.com',
    });
  });

  it('returns null for a tampered or malformed token', async () => {
    const token = await signAccessToken({ userId: 1, email: 'a@b.com' });
    const tampered = `${token.slice(0, -4)}xxxx`;

    expect(await verifyAccessToken(tampered)).toBeNull();
    expect(await verifyAccessToken('not-a-jwt')).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
    const expiredToken = await new SignJWT({ userId: 7, email: 'exp@test.dev' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secretKey);

    expect(await verifyAccessToken(expiredToken)).toBeNull();
  });
});
