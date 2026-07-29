/**
 * HTTP-level tests via Fastify `inject` against a seeded in-memory bundle — no
 * DB, no network. Covers the security-critical behaviour: auth, DB-authoritative
 * identity, role guards, branch scoping, and import dedup.
 */

import { createMockRepositories } from '@firecare/core';
import type { Branch, Customer, User } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import type { AppConfig } from './config';
import { hashPassword } from './lib/password';

const PASSWORD = 'pw123456';

const CONFIG: AppConfig = {
  nodeEnv: 'test',
  isProduction: false,
  port: 0,
  host: '127.0.0.1',
  corsOrigins: ['*'],
  databaseUrl: '',
  jwt: { secret: 'test-secret', accessTtlSeconds: 3600, refreshTtlDays: 30 },
  logLevel: 'silent',
};

const BRANCH_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const BRANCH_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const CUST_A = 'cccccccc-0000-0000-0000-000000000001';
const CUST_B = 'cccccccc-0000-0000-0000-000000000002';

function branch(id: string, code: string, name: string): Branch {
  const ts = '2026-01-01T00:00:00.000Z';
  return {
    id,
    code,
    name,
    address: null,
    ward: null,
    district: null,
    city: null,
    lat: null,
    lng: null,
    phone: null,
    email: null,
    googleLocationId: null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

function customer(id: string, branchId: string, name: string, phone: string): Customer {
  const ts = '2026-01-01T00:00:00.000Z';
  return {
    id,
    branchId,
    code: null,
    type: 'individual',
    name,
    phone,
    altPhone: null,
    email: null,
    taxCode: null,
    address: null,
    ward: null,
    district: null,
    city: null,
    lat: null,
    lng: null,
    source: 'manual',
    tags: [],
    assignedStaffId: null,
    status: 'active',
    notes: null,
    createdById: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

let app: FastifyInstance;

beforeAll(async () => {
  const passwordHash = await hashPassword(PASSWORD);
  const mk = (
    id: string,
    email: string,
    role: User['role'],
    branchId: string | null,
  ): User & { passwordHash: string } => ({
    id,
    email,
    passwordHash,
    name: email,
    role,
    branchId,
    phone: null,
    isFieldStaff: false,
    avatarUrl: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const repos = createMockRepositories({
    branches: [branch(BRANCH_A, 'CN1', 'Chi nhánh A'), branch(BRANCH_B, 'CN2', 'Chi nhánh B')],
    users: [
      mk('u-admin', 'admin@f.local', 'admin', null),
      mk('u-acc', 'acc@f.local', 'accountant', BRANCH_A),
      mk('u-staff', 'staff@f.local', 'staff', BRANCH_A),
    ],
    customers: [
      customer(CUST_A, BRANCH_A, 'Khách A', '0900000001'),
      customer(CUST_B, BRANCH_B, 'Khách B', '0900000002'),
    ],
  });
  app = await buildApp(CONFIG, { repos });
});

afterAll(async () => {
  await app.close();
});

async function token(email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: PASSWORD },
  });
  return JSON.parse(res.body).data.accessToken;
}

const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

describe('auth', () => {
  it('logs in and returns an access token + user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@f.local', password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.accessToken).toBeTruthy();
    expect(body.user.role).toBe('admin');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@f.local', password: 'nope' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('resolves the role from the DB in /me', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: bearer(await token('staff@f.local')),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.role).toBe('staff');
  });

  it('refreshes the access token via the httpOnly cookie (and rotates it)', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@f.local', password: PASSWORD },
    });
    const cookie = login.cookies.find((c) => c.name === 'fc_refresh');
    expect(cookie?.value).toBeTruthy();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { fc_refresh: cookie!.value },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(JSON.parse(refreshed.body).data.accessToken).toBeTruthy();

    // Rotation: the original cookie is now revoked.
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { fc_refresh: cookie!.value },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it('rejects refresh with no cookie (401)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });
});

describe('authorization + branch scoping', () => {
  it('blocks unauthenticated access with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/customers' });
    expect(res.statusCode).toBe(401);
  });

  it('scopes staff reads to their own branch', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: bearer(await token('staff@f.local')),
    });
    const body = JSON.parse(res.body);
    expect(body.meta.total).toBe(1);
    expect(body.data[0].branchId).toBe(BRANCH_A);
  });

  it('lets admin see all branches', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: bearer(await token('admin@f.local')),
    });
    expect(JSON.parse(res.body).meta.total).toBe(2);
  });

  it('hides other-branch records from staff (404, not 403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/customers/${CUST_B}`,
      headers: bearer(await token('staff@f.local')),
    });
    expect(res.statusCode).toBe(404);
  });

  it('forbids accountant from creating customers (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customers',
      headers: bearer(await token('acc@f.local')),
      payload: { name: 'X', branchId: BRANCH_A },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows accountant to read customers (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: bearer(await token('acc@f.local')),
    });
    expect(res.statusCode).toBe(200);
  });

  it('auto-fills the branch for a staff create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customers',
      headers: bearer(await token('staff@f.local')),
      payload: { name: 'Khách mới', phone: '0911111111', type: 'restaurant' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.branchId).toBe(BRANCH_A);
  });

  it('requires admin to name a branch on create', async () => {
    const t = await token('admin@f.local');
    const missing = await app.inject({
      method: 'POST',
      url: '/api/customers',
      headers: bearer(t),
      payload: { name: 'No branch' },
    });
    expect(missing.statusCode).toBe(400);
    const ok = await app.inject({
      method: 'POST',
      url: '/api/customers',
      headers: bearer(t),
      payload: { name: 'Có chi nhánh', branchId: BRANCH_B },
    });
    expect(ok.statusCode).toBe(201);
  });
});

describe('users management', () => {
  it('forbids non-admin from listing users (403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: bearer(await token('staff@f.local')),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('CSV import dedup', () => {
  it('skips phones that already exist and duplicates within the file', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customers/import',
      headers: bearer(await token('staff@f.local')),
      payload: {
        rows: [
          { name: 'Trùng DB', phone: '0900000001' }, // already exists in branch A
          { name: 'Mới', phone: '0955555555' },
          { name: 'Trùng file', phone: '0955555555' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.body).data;
    expect(report.inserted).toBe(1);
    expect(report.skipped).toBe(2);
  });
});

describe('sites & assets (P2)', () => {
  it('staff creates a site under a branch customer, then an asset with an auto QR', async () => {
    const t = await token('staff@f.local');

    const siteRes = await app.inject({
      method: 'POST',
      url: '/api/sites',
      headers: bearer(t),
      payload: { customerId: CUST_A, name: 'Tòa nhà A1', type: 'building' },
    });
    expect(siteRes.statusCode).toBe(201);
    const site = JSON.parse(siteRes.body).data;
    expect(site.branchId).toBe(BRANCH_A);

    const assetRes = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: bearer(t),
      payload: {
        siteId: site.id,
        name: 'Bình bột 4kg',
        category: 'extinguisher',
        nextDueDate: '2026-01-01',
      },
    });
    expect(assetRes.statusCode).toBe(201);
    const asset = JSON.parse(assetRes.body).data;
    expect(asset.qrCode).toMatch(/^FC-/); // auto-generated
    expect(asset.siteId).toBe(site.id);
    expect(asset.customerId).toBe(CUST_A); // derived from the site

    // QR lookup resolves the device.
    const qr = await app.inject({
      method: 'GET',
      url: `/api/assets/qr/${asset.qrCode}`,
      headers: bearer(t),
    });
    expect(qr.statusCode).toBe(200);

    // Due filter surfaces it (nextDueDate <= dueBefore).
    const due = await app.inject({
      method: 'GET',
      url: '/api/assets?dueBefore=2026-06-01',
      headers: bearer(t),
    });
    expect(JSON.parse(due.body).meta.total).toBeGreaterThanOrEqual(1);

    // Bulk import de-dups by serial within the site.
    const imp = await app.inject({
      method: 'POST',
      url: '/api/assets/import',
      headers: bearer(t),
      payload: {
        siteId: site.id,
        rows: [
          { name: 'B1', serialNo: 'SN-1' },
          { name: 'B2', serialNo: 'SN-2' },
          { name: 'B3', serialNo: 'SN-2' },
        ],
      },
    });
    const report = JSON.parse(imp.body).data;
    expect(report.inserted).toBe(2);
    expect(report.skipped).toBe(1);
  });

  it('sites are branch-scoped and accountant is read-only', async () => {
    const acc = await token('acc@f.local');
    expect((await app.inject({ method: 'GET', url: '/api/sites', headers: bearer(acc) })).statusCode).toBe(200);
    const create = await app.inject({
      method: 'POST',
      url: '/api/sites',
      headers: bearer(acc),
      payload: { customerId: CUST_A, name: 'X' },
    });
    expect(create.statusCode).toBe(403);
  });
});
