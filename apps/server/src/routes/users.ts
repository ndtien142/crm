/** User/account management — admin only (no self-signup). */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { hashPassword } from '../lib/password';
import { guard, requirePrincipal } from '../lib/principal';
import { created, ok, paginated } from '../lib/responses';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userQuerySchema,
} from '../schemas';

/** Non-admin roles must belong to a real branch; admin is branch-agnostic. */
async function resolveUserBranch(
  role: string,
  branchId: string | null | undefined,
  repos: RepositoryBundle,
): Promise<string | null> {
  if (role === 'admin') return null;
  if (!branchId) throw AppError.of('VALIDATION_ERROR', 'Vai trò này cần gắn chi nhánh');
  const branch = await repos.branches.findById(branchId);
  if (!branch) throw AppError.of('VALIDATION_ERROR', 'Chi nhánh không tồn tại');
  return branch.id;
}

export function registerUserRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/users', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { page, pageSize, role, branchId, q } = userQuerySchema.parse(req.query);
    const result = await repos.users.list({ page, pageSize, role, branchId, q });
    return paginated(reply, result.items, { page, pageSize, total: result.total });
  });

  app.post('/api/users', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const body = createUserSchema.parse(req.body);
    if (await repos.users.findByEmail(body.email)) {
      throw AppError.of('DUPLICATE_RESOURCE', 'Email đã được sử dụng');
    }
    const branchId = await resolveUserBranch(body.role, body.branchId, repos);
    const user = await repos.users.create({
      email: body.email,
      passwordHash: await hashPassword(body.password),
      name: body.name,
      role: body.role,
      branchId,
      phone: body.phone ?? null,
      isFieldStaff: body.isFieldStaff ?? false,
    });
    return created(reply, user, `/api/users/${user.id}`);
  });

  app.patch('/api/users/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    const body = updateUserSchema.parse(req.body);
    const target = await repos.users.findById(id);
    if (!target) throw AppError.notFound();

    // If role/branch changes, re-validate the branch pairing.
    if (body.role !== undefined || body.branchId !== undefined) {
      const nextRole = body.role ?? target.role;
      const nextBranch = body.branchId !== undefined ? body.branchId : target.branchId;
      body.branchId = await resolveUserBranch(nextRole, nextBranch, repos);
    }

    const { isActive, ...patch } = body;
    let user = await repos.users.update(id, patch);
    if (user && isActive !== undefined) user = await repos.users.setActive(id, isActive);
    if (!user) throw AppError.notFound();
    return ok(reply, user);
  });

  app.post('/api/users/:id/reset-password', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    const { password } = resetPasswordSchema.parse(req.body);
    if (!(await repos.users.findById(id))) throw AppError.notFound();
    await repos.users.updatePassword(id, await hashPassword(password));
    // Force re-login everywhere after a password reset.
    await repos.auth.revokeAllForUser(id);
    return ok(reply, { ok: true });
  });
}
