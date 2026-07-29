/**
 * HTTP-level tests via Fastify `inject` against a seeded in-memory bundle — no
 * DB, no network. Covers the security-critical behaviour: auth, DB-authoritative
 * identity, role guards, branch scoping, and import dedup.
 */

import { createMockRepositories } from '@firecare/core';
import type { Asset, Branch, Customer, ServiceOrder, Site, User } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { runInspectionSweep } from './lib/inspection-sweep';
import { runReserviceSweep } from './lib/reservice-sweep';
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

describe('inspections (P3)', () => {
  it('creates + completes an inspection and rolls the asset due date', async () => {
    const t = await token('staff@f.local');
    const site = JSON.parse(
      (
        await app.inject({
          method: 'POST',
          url: '/api/sites',
          headers: bearer(t),
          payload: { customerId: CUST_A, name: 'Site KT' },
        })
      ).body,
    ).data;
    const asset = JSON.parse(
      (
        await app.inject({
          method: 'POST',
          url: '/api/assets',
          headers: bearer(t),
          payload: { siteId: site.id, name: 'Bình KT', nextDueDate: '2026-01-01' },
        })
      ).body,
    ).data;

    const insp = JSON.parse(
      (
        await app.inject({
          method: 'POST',
          url: '/api/inspections',
          headers: bearer(t),
          payload: { siteId: site.id, assetId: asset.id, type: 'annual', priority: 'high' },
        })
      ).body,
    ).data;
    expect(insp.code).toMatch(/^KT-/);
    expect(insp.status).toBe('scheduled');

    const done = await app.inject({
      method: 'POST',
      url: `/api/inspections/${insp.id}/complete`,
      headers: bearer(t),
      payload: {
        status: 'passed',
        nextDueDate: '2027-01-01',
        result: [{ key: 'ap', label: 'Áp suất', pass: true }],
      },
    });
    expect(done.statusCode).toBe(200);
    expect(JSON.parse(done.body).data.status).toBe('passed');

    // The asset's due date + last-inspected roll forward.
    const a2 = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/assets/${asset.id}`, headers: bearer(t) })).body,
    ).data;
    expect(a2.nextDueDate).toBe('2027-01-01');
    expect(a2.lastInspectedAt).toBeTruthy();
  });
});

describe('inspection sweep (P3)', () => {
  it('auto-creates a scheduled inspection for a due asset (idempotent)', async () => {
    const ts = '2026-01-01T00:00:00.000Z';
    const site: Site = {
      id: 's1', branchId: BRANCH_A, customerId: CUST_A, name: 'S', code: null, type: 'building',
      address: null, ward: null, district: null, city: null, lat: null, lng: null, notes: null,
      createdById: null, createdAt: ts, updatedAt: ts,
    };
    const asset: Asset = {
      id: 'a1', branchId: BRANCH_A, siteId: 's1', customerId: CUST_A, category: 'extinguisher',
      name: 'Bình', serialNo: null, qrCode: 'FC-SWEEP1', manufacturer: null, capacity: null,
      manufactureDate: null, installedAt: null, lastInspectedAt: null, nextDueDate: '2020-01-01',
      status: 'active', locationNote: null, photoUrl: null, notes: null, createdById: null,
      createdAt: ts, updatedAt: ts,
    };
    const repos = createMockRepositories({ sites: [site], assets: [asset] });

    expect((await runInspectionSweep(repos, 30)).created).toBe(1);
    expect((await runInspectionSweep(repos, 30)).created).toBe(0); // idempotent — open inspection exists

    const list = await repos.inspections.list({ page: 1, pageSize: 10, scope: { allBranches: true } });
    expect(list.total).toBe(1);
    expect(list.items[0]!.status).toBe('scheduled');
    expect(list.items[0]!.priority).toBe('urgent'); // overdue
  });
});

describe('faults & repairs (P4)', () => {
  it('failing an inspection opens a fault + marks the asset faulty; resolving reactivates it', async () => {
    const t = await token('staff@f.local');
    const site = JSON.parse(
      (await app.inject({ method: 'POST', url: '/api/sites', headers: bearer(t), payload: { customerId: CUST_A, name: 'Site Fault' } })).body,
    ).data;
    const asset = JSON.parse(
      (await app.inject({ method: 'POST', url: '/api/assets', headers: bearer(t), payload: { siteId: site.id, name: 'Bình lỗi' } })).body,
    ).data;
    const insp = JSON.parse(
      (await app.inject({ method: 'POST', url: '/api/inspections', headers: bearer(t), payload: { siteId: site.id, assetId: asset.id, type: 'routine' } })).body,
    ).data;

    // Fail the inspection → a fault is opened automatically.
    await app.inject({
      method: 'POST',
      url: `/api/inspections/${insp.id}/complete`,
      headers: bearer(t),
      payload: { status: 'failed' },
    });

    const faults = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/faults?assetId=${asset.id}`, headers: bearer(t) })).body,
    );
    expect(faults.meta.total).toBe(1);
    expect(faults.data[0].status).toBe('open');
    expect(faults.data[0].inspectionId).toBe(insp.id);

    const faulty = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/assets/${asset.id}`, headers: bearer(t) })).body,
    ).data;
    expect(faulty.status).toBe('faulty');

    // Resolve the fault → asset returns to active.
    const resolved = await app.inject({
      method: 'POST',
      url: `/api/faults/${faults.data[0].id}/resolve`,
      headers: bearer(t),
      payload: { resolutionNote: 'Đã thay bình mới' },
    });
    expect(resolved.statusCode).toBe(200);
    expect(JSON.parse(resolved.body).data.status).toBe('resolved');

    const back = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/assets/${asset.id}`, headers: bearer(t) })).body,
    ).data;
    expect(back.status).toBe('active');
  });

  it('accountant cannot create a fault (403)', async () => {
    const acc = await token('acc@f.local');
    const r = await app.inject({
      method: 'POST',
      url: '/api/faults',
      headers: bearer(acc),
      payload: { assetId: '00000000-0000-0000-0000-000000000000', description: 'x' },
    });
    expect(r.statusCode).toBe(403);
  });
});

describe('service orders (P5)', () => {
  it('creates a multi-line order (total computed), completes (rolls due), takes payment', async () => {
    const admin = await token('admin@f.local');
    const staff = await token('staff@f.local');

    const svc = JSON.parse(
      (await app.inject({
        method: 'POST',
        url: '/api/service-catalog',
        headers: bearer(admin),
        payload: { name: 'Đổi bình bột 4kg', category: 'refill_replace', unitPrice: 250000, defaultCycleMonths: 12 },
      })).body,
    ).data;
    expect(svc.id).toBeTruthy();

    const order = JSON.parse(
      (await app.inject({
        method: 'POST',
        url: '/api/service-orders',
        headers: bearer(staff),
        payload: {
          customerId: CUST_A,
          lines: [
            { serviceId: svc.id, description: 'Đổi bình bột', quantity: 2, unitPrice: 250000, cycleMonths: 12 },
            { description: 'Công lắp đặt', quantity: 1, unitPrice: 50000 },
          ],
        },
      })).body,
    ).data;
    expect(order.totalAmount).toBe(550000);
    expect(order.lines.length).toBe(2);
    expect(order.status).toBe('draft');

    const done = JSON.parse(
      (await app.inject({
        method: 'POST',
        url: `/api/service-orders/${order.id}/complete`,
        headers: bearer(staff),
        payload: { performedAt: '2026-07-29' },
      })).body,
    ).data;
    expect(done.status).toBe('done');
    expect(done.nextDueDate).toBe('2027-07-29'); // +12 months from performedAt

    // Payment is accountant-only.
    const staffPay = await app.inject({
      method: 'POST',
      url: `/api/service-orders/${order.id}/payment`,
      headers: bearer(staff),
      payload: { paymentStatus: 'paid', paidAmount: 550000 },
    });
    expect(staffPay.statusCode).toBe(403);

    const acc = await token('acc@f.local');
    const pay = await app.inject({
      method: 'POST',
      url: `/api/service-orders/${order.id}/payment`,
      headers: bearer(acc),
      payload: { paymentStatus: 'paid', paidAmount: 550000 },
    });
    expect(pay.statusCode).toBe(200);
    expect(JSON.parse(pay.body).data.paymentStatus).toBe('paid');
  });

  it('accountant cannot create an order (403)', async () => {
    const acc = await token('acc@f.local');
    const r = await app.inject({
      method: 'POST',
      url: '/api/service-orders',
      headers: bearer(acc),
      payload: { customerId: CUST_A, lines: [{ description: 'x', quantity: 1, unitPrice: 1 }] },
    });
    expect(r.statusCode).toBe(403);
  });
});

describe('customer care (P6)', () => {
  it('staff creates a care task (branch derived from customer); accountant cannot', async () => {
    const staff = await token('staff@f.local');
    const res = await app.inject({
      method: 'POST',
      url: '/api/care-tasks',
      headers: bearer(staff),
      payload: { customerId: CUST_A, title: 'Gọi lại khách', type: 'followup' },
    });
    expect(res.statusCode).toBe(201);
    const task = JSON.parse(res.body).data;
    expect(task.branchId).toBe(BRANCH_A);
    expect(task.status).toBe('todo');
    expect(task.assigneeId).toBeNull();

    const acc = await token('acc@f.local');
    const denied = await app.inject({
      method: 'POST',
      url: '/api/care-tasks',
      headers: bearer(acc),
      payload: { customerId: CUST_A, title: 'x', type: 'followup' },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('claim is atomic: first claimer wins, a second claim gets 409', async () => {
    const admin = await token('admin@f.local');
    const created = JSON.parse(
      (
        await app.inject({
          method: 'POST',
          url: '/api/care-tasks',
          headers: bearer(admin),
          payload: { customerId: CUST_A, title: 'Thẻ pool', type: 'new_lead' },
        })
      ).body,
    ).data;

    const staff = await token('staff@f.local');
    const first = await app.inject({
      method: 'POST',
      url: `/api/care-tasks/${created.id}/claim`,
      headers: bearer(staff),
    });
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body).data.assigneeId).toBe('u-staff');

    const second = await app.inject({
      method: 'POST',
      url: `/api/care-tasks/${created.id}/claim`,
      headers: bearer(admin),
    });
    expect(second.statusCode).toBe(409);
  });

  it('logging a refusal marks the linked task lost (churn signal)', async () => {
    const staff = await token('staff@f.local');
    const task = JSON.parse(
      (
        await app.inject({
          method: 'POST',
          url: '/api/care-tasks',
          headers: bearer(staff),
          payload: { customerId: CUST_A, title: 'Chào lại', type: 're_service_due' },
        })
      ).body,
    ).data;

    const logged = await app.inject({
      method: 'POST',
      url: '/api/care-interactions',
      headers: bearer(staff),
      payload: { customerId: CUST_A, careTaskId: task.id, channel: 'call', disposition: 'refused', summary: 'Khách từ chối' },
    });
    expect(logged.statusCode).toBe(201);

    const after = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/care-tasks/${task.id}`, headers: bearer(staff) })).body,
    ).data;
    expect(after.status).toBe('lost');
  });

  it('staff only sees their own branch on the board', async () => {
    const admin = await token('admin@f.local');
    // Admin can create against BRANCH_B via CUST_B.
    await app.inject({
      method: 'POST',
      url: '/api/care-tasks',
      headers: bearer(admin),
      payload: { customerId: CUST_B, title: 'Thẻ chi nhánh B', type: 'followup' },
    });
    const staff = await token('staff@f.local');
    const list = JSON.parse(
      (await app.inject({ method: 'GET', url: '/api/care-tasks?pageSize=100', headers: bearer(staff) })).body,
    );
    expect(list.data.every((t: { branchId: string }) => t.branchId === BRANCH_A)).toBe(true);
  });

  it('re-service sweep creates one urgent task for an overdue order and is idempotent', async () => {
    const ts = '2026-01-01T00:00:00.000Z';
    const order: ServiceOrder = {
      id: 'order-due-1',
      branchId: BRANCH_A,
      customerId: CUST_A,
      siteId: null,
      code: 'PDV-OVERDUE',
      status: 'done',
      scheduledAt: null,
      performedAt: '2025-01-01',
      performedById: null,
      totalAmount: 250000,
      paymentStatus: 'paid',
      paidAmount: 250000,
      nextDueDate: '2026-01-01', // in the past → overdue
      notes: null,
      createdById: null,
      createdAt: ts,
      updatedAt: ts,
    };
    const repos = createMockRepositories({
      branches: [branch(BRANCH_A, 'CN1', 'Chi nhánh A')],
      customers: [customer(CUST_A, BRANCH_A, 'Khách A', '0900000001')],
      serviceOrders: [order],
    });

    const scope = { allBranches: true as const };
    const first = await runReserviceSweep(repos, 30);
    expect(first.created).toBe(1);
    const afterFirst = await repos.careTasks.list({ page: 1, pageSize: 100, scope });
    expect(afterFirst.total).toBe(1);
    expect(afterFirst.items[0]!.type).toBe('re_service_due');
    expect(afterFirst.items[0]!.priority).toBe('urgent');
    expect(afterFirst.items[0]!.relatedOrderId).toBe('order-due-1');

    // Second pass must not duplicate the still-open reminder.
    const second = await runReserviceSweep(repos, 30);
    expect(second.created).toBe(0);
    const afterSecond = await repos.careTasks.list({ page: 1, pageSize: 100, scope });
    expect(afterSecond.total).toBe(1);
  });
});
