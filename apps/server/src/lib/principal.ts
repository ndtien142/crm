/**
 * Identity + RBAC. The principal is resolved from the DB on every request (the
 * access token only carries `sub`), so role/branch/active-state can never be
 * spoofed via token claims. Routes stay role-agnostic by using `guard` +
 * `branchScopeFor` instead of per-role route trees.
 */

import type { BranchScope, RepositoryBundle, Role } from '@firecare/types';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from './errors';
import type { TokenService } from './tokens';

export interface Principal {
  userId: string;
  role: Role;
  /** `null` for admin (all branches); the home branch for accountant/staff. */
  branchId: string | null;
  isFieldStaff: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}

/**
 * Attach `req.principal` when a valid Bearer access token is present. Does not
 * reject anonymous requests — `requirePrincipal`/`guard` enforce per-route.
 */
export function installPrincipal(
  app: FastifyInstance,
  repos: RepositoryBundle,
  verifyAccessToken: TokenService['verifyAccessToken'],
): void {
  app.addHook('onRequest', async (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return;
    const payload = await verifyAccessToken(header.slice(7)).catch(() => null);
    if (!payload) return;
    const user = await repos.users.findById(payload.sub);
    if (!user || !user.isActive) return;
    req.principal = {
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
      isFieldStaff: user.isFieldStaff,
    };
  });
}

export function requirePrincipal(req: FastifyRequest): Principal {
  if (!req.principal) throw AppError.unauthenticated();
  return req.principal;
}

/** Throw 403 unless the principal holds one of `roles`. */
export function guard(principal: Principal, roles: Role[]): void {
  if (!roles.includes(principal.role)) throw AppError.roleNotAllowed();
}

/**
 * Row-visibility scope for reads. Admin and accountant see all branches; staff
 * are constrained to their home branch. Repositories inject this into WHERE.
 */
export function branchScopeFor(principal: Principal): BranchScope {
  if (principal.role === 'admin' || principal.role === 'accountant') {
    return { allBranches: true };
  }
  return { allBranches: false, branchId: principal.branchId ?? undefined };
}

/**
 * Resolve the branch a write must land in. Staff always write to their own
 * branch (a requested branch is ignored); admin must name an existing branch.
 */
export async function resolveWriteBranchId(
  principal: Principal,
  requestedBranchId: string | undefined,
  repos: RepositoryBundle,
): Promise<string> {
  if (principal.role === 'staff') {
    if (!principal.branchId) throw AppError.of('FORBIDDEN', 'Tài khoản chưa gắn chi nhánh');
    return principal.branchId;
  }
  // admin (accountant is not allowed to create these resources)
  if (!requestedBranchId) throw AppError.of('VALIDATION_ERROR', 'Thiếu chi nhánh (branchId)');
  const branch = await repos.branches.findById(requestedBranchId);
  if (!branch) throw AppError.of('VALIDATION_ERROR', 'Chi nhánh không tồn tại');
  return branch.id;
}
