/** Checklist templates (mẫu kiểm tra) — company-wide; admin manages, all read. */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok } from '../lib/responses';
import {
  checklistTemplateQuerySchema,
  createChecklistTemplateSchema,
  updateChecklistTemplateSchema,
} from '../schemas';

export function registerChecklistTemplateRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/checklist-templates', async (req, reply) => {
    requirePrincipal(req);
    const q = checklistTemplateQuerySchema.parse(req.query);
    return ok(reply, await repos.checklistTemplates.list(q));
  });

  app.post('/api/checklist-templates', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const body = createChecklistTemplateSchema.parse(req.body);
    const template = await repos.checklistTemplates.create(body);
    return created(reply, template, `/api/checklist-templates/${template.id}`);
  });

  app.patch('/api/checklist-templates/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    const template = await repos.checklistTemplates.update(
      id,
      updateChecklistTemplateSchema.parse(req.body),
    );
    if (!template) throw AppError.notFound();
    return ok(reply, template);
  });

  app.delete('/api/checklist-templates/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.checklistTemplates.delete(id))) throw AppError.notFound();
    return noContent(reply);
  });
}
