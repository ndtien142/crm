/**
 * Auth: password login, refresh-token rotation, logout, and `me`. Access token
 * in the response body (client keeps it in memory); refresh token also in the
 * body (client persists it) and rotates on every `/refresh`.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { comparePassword } from '../lib/password';
import { requirePrincipal } from '../lib/principal';
import { ok } from '../lib/responses';
import type { TokenService } from '../lib/tokens';
import { loginSchema, refreshSchema } from '../schemas';

export function registerAuthRoutes(
  app: FastifyInstance,
  repos: RepositoryBundle,
  tokens: TokenService,
  refreshTtlDays: number,
): void {
  async function issueSession(userId: string) {
    const accessToken = await tokens.signAccessToken(userId);
    const refresh = tokens.newRefreshToken();
    const expiresAt = new Date(Date.now() + refreshTtlDays * 86_400_000).toISOString();
    await repos.auth.createSession({ userId, tokenHash: refresh.hash, expiresAt });
    return { accessToken, refreshToken: refresh.token };
  }

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const found = await repos.users.findAuthByEmail(email);
    // Verify a hash even when the user is missing to blunt timing/enumeration.
    const valid = found ? await comparePassword(password, found.passwordHash) : false;
    if (!found || !valid) throw AppError.of('INVALID_CREDENTIALS');
    if (!found.user.isActive) throw AppError.of('ACCOUNT_INACTIVE');
    const session = await issueSession(found.user.id);
    return ok(reply, { ...session, user: found.user });
  });

  app.post('/api/auth/refresh', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const session = await repos.auth.findSessionByHash(tokens.hashRefreshToken(refreshToken));
    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthenticated();
    }
    const user = await repos.users.findById(session.userId);
    if (!user || !user.isActive) throw AppError.unauthenticated();
    await repos.auth.revokeSession(session.id); // rotate: old token is now dead
    const next = await issueSession(user.id);
    return ok(reply, { ...next, user });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const session = await repos.auth.findSessionByHash(tokens.hashRefreshToken(refreshToken));
    if (session) await repos.auth.revokeSession(session.id);
    return ok(reply, { ok: true });
  });

  app.get('/api/auth/me', async (req, reply) => {
    const principal = requirePrincipal(req);
    const user = await repos.users.findById(principal.userId);
    if (!user) throw AppError.unauthenticated();
    return ok(reply, user);
  });
}
