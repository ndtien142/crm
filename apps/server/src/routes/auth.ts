/**
 * Auth: password login, refresh-token rotation, logout, `me`. The access token
 * is returned in the body (the client holds it in memory only). The refresh
 * token is set as an httpOnly cookie — never exposed to JS (XSS-safe) — and
 * rotates on every `/refresh`.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { AppError } from '../lib/errors';
import { comparePassword } from '../lib/password';
import { requirePrincipal } from '../lib/principal';
import { ok } from '../lib/responses';
import type { TokenService } from '../lib/tokens';
import { loginSchema } from '../schemas';

const REFRESH_COOKIE = 'fc_refresh';
const COOKIE_PATH = '/api/auth';

export function registerAuthRoutes(
  app: FastifyInstance,
  repos: RepositoryBundle,
  tokens: TokenService,
  opts: { refreshTtlDays: number; isProduction: boolean },
): void {
  function setRefreshCookie(reply: FastifyReply, token: string) {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: opts.isProduction,
      path: COOKIE_PATH,
      maxAge: opts.refreshTtlDays * 86_400,
    });
  }

  /** Issue an access token + a rotating refresh cookie for a user. */
  async function issueSession(userId: string, reply: FastifyReply): Promise<string> {
    const accessToken = await tokens.signAccessToken(userId);
    const refresh = tokens.newRefreshToken();
    const expiresAt = new Date(Date.now() + opts.refreshTtlDays * 86_400_000).toISOString();
    await repos.auth.createSession({ userId, tokenHash: refresh.hash, expiresAt });
    setRefreshCookie(reply, refresh.token);
    return accessToken;
  }

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const found = await repos.users.findAuthByEmail(email);
    // Verify a hash even when the user is missing to blunt timing/enumeration.
    const valid = found ? await comparePassword(password, found.passwordHash) : false;
    if (!found || !valid) throw AppError.of('INVALID_CREDENTIALS');
    if (!found.user.isActive) throw AppError.of('ACCOUNT_INACTIVE');
    const accessToken = await issueSession(found.user.id, reply);
    return ok(reply, { accessToken, user: found.user });
  });

  app.post('/api/auth/refresh', async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) throw AppError.unauthenticated();
    const session = await repos.auth.findSessionByHash(tokens.hashRefreshToken(token));
    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthenticated();
    }
    const user = await repos.users.findById(session.userId);
    if (!user || !user.isActive) throw AppError.unauthenticated();
    await repos.auth.revokeSession(session.id); // rotate: the old cookie is now dead
    const accessToken = await issueSession(user.id, reply);
    return ok(reply, { accessToken, user });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) {
      const session = await repos.auth.findSessionByHash(tokens.hashRefreshToken(token));
      if (session) await repos.auth.revokeSession(session.id);
    }
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
    return ok(reply, { ok: true });
  });

  app.get('/api/auth/me', async (req, reply) => {
    const principal = requirePrincipal(req);
    const user = await repos.users.findById(principal.userId);
    if (!user) throw AppError.unauthenticated();
    return ok(reply, user);
  });
}
