/**
 * Token service. Access tokens are short-lived signed JWTs (HS256) carrying only
 * `sub` — role/branch are always re-read from the DB, never trusted from the
 * token. Refresh tokens are opaque random strings; only their SHA-256 hash is
 * stored, and they rotate on every use.
 */

import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export interface TokenService {
  signAccessToken(userId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<{ sub: string }>;
  newRefreshToken(): { token: string; hash: string };
  hashRefreshToken(token: string): string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createTokenService(
  secret: string,
  opts: { accessTtlSeconds: number },
): TokenService {
  const key = new TextEncoder().encode(secret);
  return {
    async signAccessToken(userId) {
      return new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${opts.accessTtlSeconds}s`)
        .sign(key);
    },
    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, key);
      if (!payload.sub) throw new Error('token missing sub');
      return { sub: payload.sub };
    },
    newRefreshToken() {
      const token = randomBytes(32).toString('hex');
      return { token, hash: hashToken(token) };
    },
    hashRefreshToken: hashToken,
  };
}
