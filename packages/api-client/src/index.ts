/**
 * Typed REST client (native fetch — no axios). One `request` helper attaches the
 * bearer token from `getToken()` per call and unwraps the `{ data, meta }`
 * envelope; each method maps 1:1 to a server route.
 */

import type {
  Branch,
  Customer,
  CustomerType,
  ErrorCode,
  PageMeta,
  Role,
  User,
} from '@firecare/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | 'NETWORK',
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

type Query = Record<string, string | number | boolean | undefined>;

function toQuery(q?: Query): string {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createApiClient(opts: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      const headers: Record<string, string> = {};
      if (body !== undefined) headers['content-type'] = 'application/json';
      const token = opts.getToken();
      if (token) headers.authorization = `Bearer ${token}`;
      res = await fetch(opts.baseUrl + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError((e as Error).message || 'Không kết nối được máy chủ', 'NETWORK', 0);
    }
    if (res.status === 204) return undefined as T;
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = json?.error;
      throw new ApiError(err?.message ?? 'Lỗi không xác định', err?.code ?? 'NETWORK', res.status);
    }
    return json as T;
  }

  const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);
  const page = <T>(p: Promise<{ data: T[]; meta: PageMeta }>) =>
    p.then((r) => ({ items: r.data, meta: r.meta }));

  return {
    // ── auth ──
    login: (email: string, password: string) =>
      data<LoginResult>(request('POST', '/api/auth/login', { email, password })),
    refresh: (refreshToken: string) =>
      data<LoginResult>(request('POST', '/api/auth/refresh', { refreshToken })),
    logout: (refreshToken: string) => request('POST', '/api/auth/logout', { refreshToken }),
    me: () => data<User>(request('GET', '/api/auth/me')),

    // ── customers ──
    listCustomers: (q?: {
      page?: number;
      pageSize?: number;
      q?: string;
      type?: CustomerType;
      status?: string;
      tag?: string;
      assignedStaffId?: string;
      sort?: 'recent' | 'name';
    }) => page<Customer>(request('GET', '/api/customers' + toQuery(q))),
    getCustomer: (id: string) => data<Customer>(request('GET', `/api/customers/${id}`)),
    createCustomer: (body: Record<string, unknown>) =>
      data<Customer>(request('POST', '/api/customers', body)),
    updateCustomer: (id: string, body: Record<string, unknown>) =>
      data<Customer>(request('PATCH', `/api/customers/${id}`, body)),
    deleteCustomer: (id: string) => request('DELETE', `/api/customers/${id}`),
    importCustomers: (body: { branchId?: string; rows: Record<string, unknown>[] }) =>
      data<{ inserted: number; skipped: number; skippedPhones: string[] }>(
        request('POST', '/api/customers/import', body),
      ),

    // ── branches ──
    listBranches: (q?: { page?: number; pageSize?: number; q?: string; includeInactive?: boolean }) =>
      page<Branch>(request('GET', '/api/branches' + toQuery(q))),
    createBranch: (body: Record<string, unknown>) =>
      data<Branch>(request('POST', '/api/branches', body)),
    updateBranch: (id: string, body: Record<string, unknown>) =>
      data<Branch>(request('PATCH', `/api/branches/${id}`, body)),

    // ── users ──
    listUsers: (q?: { page?: number; pageSize?: number; role?: Role; branchId?: string; q?: string }) =>
      page<User>(request('GET', '/api/users' + toQuery(q))),
    createUser: (body: Record<string, unknown>) => data<User>(request('POST', '/api/users', body)),
    updateUser: (id: string, body: Record<string, unknown>) =>
      data<User>(request('PATCH', `/api/users/${id}`, body)),
    resetPassword: (id: string, password: string) =>
      request('POST', `/api/users/${id}/reset-password`, { password }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
