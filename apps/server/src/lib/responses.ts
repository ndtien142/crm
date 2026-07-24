/** Success-response helpers — uniform `{ data }` / `{ data, meta }` envelopes. */

import type { PageMeta } from '@firecare/types';
import type { FastifyReply } from 'fastify';

export function ok<T>(reply: FastifyReply, data: T): FastifyReply {
  return reply.code(200).send({ data });
}

export function created<T>(reply: FastifyReply, data: T, location?: string): FastifyReply {
  if (location) reply.header('Location', location);
  return reply.code(201).send({ data });
}

export function noContent(reply: FastifyReply): FastifyReply {
  return reply.code(204).send();
}

export function paginated<T>(reply: FastifyReply, items: T[], meta: PageMeta): FastifyReply {
  return reply.code(200).send({ data: items, meta });
}
