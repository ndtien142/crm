/**
 * Typed REST client built on axios. `withCredentials` sends the httpOnly refresh
 * cookie; a request interceptor attaches the in-memory access token; a response
 * interceptor transparently refreshes the access token once on a 401 (single-
 * flight) and retries. Each method maps 1:1 to a server route and unwraps the
 * `{ data, meta }` envelope.
 */

import type {
  Asset,
  Branch,
  ChecklistTemplate,
  Customer,
  CustomerType,
  ErrorCode,
  Inspection,
  PageMeta,
  Role,
  Site,
  User,
} from '@firecare/types';
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, isAxiosError } from 'axios';

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
  /** Called by the 401 interceptor after a successful silent refresh. */
  setToken: (token: string | null) => void;
}

/** Auth response: access token in the body, refresh token in an httpOnly cookie. */
export interface AuthResult {
  accessToken: string;
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

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export function createApiClient(opts: ApiClientOptions) {
  const http: AxiosInstance = axios.create({ baseURL: opts.baseUrl, withCredentials: true });

  http.interceptors.request.use((config) => {
    const token = opts.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Single-flight silent refresh: many concurrent 401s share one refresh call.
  let refreshing: Promise<string | null> | null = null;
  async function refreshAccessToken(): Promise<string | null> {
    try {
      const res = await axios.post(`${opts.baseUrl}/api/auth/refresh`, {}, { withCredentials: true });
      const token = (res.data?.data?.accessToken as string | undefined) ?? null;
      opts.setToken(token);
      return token;
    } catch {
      opts.setToken(null);
      return null;
    }
  }

  http.interceptors.response.use(
    (r) => r,
    async (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        const original = error.config as RetriableConfig | undefined;
        const url = original?.url ?? '';
        if (original && !original._retried && !url.includes('/api/auth/')) {
          original._retried = true;
          refreshing = refreshing ?? refreshAccessToken();
          const token = await refreshing;
          refreshing = null;
          if (token) return http.request(original);
        }
      }
      throw error;
    },
  );

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      const res = await http.request<T>({ method, url: path, data: body });
      return res.data;
    } catch (e) {
      if (isAxiosError(e)) {
        const err = (e.response?.data as { error?: { code?: ErrorCode; message?: string } })?.error;
        if (e.response) {
          throw new ApiError(err?.message ?? 'Lỗi', err?.code ?? 'NETWORK', e.response.status);
        }
        throw new ApiError(e.message || 'Không kết nối được máy chủ', 'NETWORK', 0);
      }
      throw new ApiError('Lỗi không xác định', 'NETWORK', 0);
    }
  }

  const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);
  const page = <T>(p: Promise<{ data: T[]; meta: PageMeta }>) =>
    p.then((r) => ({ items: r.data, meta: r.meta }));

  return {
    // ── auth ── (refresh/logout rely on the httpOnly cookie — no args)
    login: (email: string, password: string) =>
      data<AuthResult>(request('POST', '/api/auth/login', { email, password })),
    refresh: () => data<AuthResult>(request('POST', '/api/auth/refresh', {})),
    logout: () => request('POST', '/api/auth/logout', {}),
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
    deleteCustomer: (id: string) => request<void>('DELETE', `/api/customers/${id}`),
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
      request<void>('POST', `/api/users/${id}/reset-password`, { password }),

    // ── sites ──
    listSites: (q?: {
      page?: number;
      pageSize?: number;
      q?: string;
      customerId?: string;
      type?: string;
    }) => page<Site>(request('GET', '/api/sites' + toQuery(q))),
    createSite: (body: Record<string, unknown>) => data<Site>(request('POST', '/api/sites', body)),
    updateSite: (id: string, body: Record<string, unknown>) =>
      data<Site>(request('PATCH', `/api/sites/${id}`, body)),
    deleteSite: (id: string) => request<void>('DELETE', `/api/sites/${id}`),

    // ── assets ──
    listAssets: (q?: {
      page?: number;
      pageSize?: number;
      q?: string;
      siteId?: string;
      customerId?: string;
      category?: string;
      status?: string;
      dueBefore?: string;
      sort?: 'recent' | 'due';
    }) => page<Asset>(request('GET', '/api/assets' + toQuery(q))),
    getAsset: (id: string) => data<Asset>(request('GET', `/api/assets/${id}`)),
    getAssetByQr: (code: string) => data<Asset>(request('GET', `/api/assets/qr/${code}`)),
    createAsset: (body: Record<string, unknown>) =>
      data<Asset>(request('POST', '/api/assets', body)),
    updateAsset: (id: string, body: Record<string, unknown>) =>
      data<Asset>(request('PATCH', `/api/assets/${id}`, body)),
    deleteAsset: (id: string) => request<void>('DELETE', `/api/assets/${id}`),
    importAssets: (body: { siteId: string; rows: Record<string, unknown>[] }) =>
      data<{ inserted: number; skipped: number; skippedRefs: string[] }>(
        request('POST', '/api/assets/import', body),
      ),

    // ── inspections ──
    listInspections: (q?: {
      page?: number;
      pageSize?: number;
      siteId?: string;
      assetId?: string;
      customerId?: string;
      type?: string;
      status?: string;
      inspectorId?: string;
      priority?: string;
      sort?: 'recent' | 'scheduled';
    }) => page<Inspection>(request('GET', '/api/inspections' + toQuery(q))),
    getInspection: (id: string) => data<Inspection>(request('GET', `/api/inspections/${id}`)),
    createInspection: (body: Record<string, unknown>) =>
      data<Inspection>(request('POST', '/api/inspections', body)),
    updateInspection: (id: string, body: Record<string, unknown>) =>
      data<Inspection>(request('PATCH', `/api/inspections/${id}`, body)),
    completeInspection: (id: string, body: Record<string, unknown>) =>
      data<Inspection>(request('POST', `/api/inspections/${id}/complete`, body)),
    deleteInspection: (id: string) => request<void>('DELETE', `/api/inspections/${id}`),

    // ── checklist templates ──
    listChecklistTemplates: (q?: {
      inspectionType?: string;
      assetCategory?: string;
      includeInactive?: boolean;
    }) => data<ChecklistTemplate[]>(request('GET', '/api/checklist-templates' + toQuery(q))),
    createChecklistTemplate: (body: Record<string, unknown>) =>
      data<ChecklistTemplate>(request('POST', '/api/checklist-templates', body)),
    updateChecklistTemplate: (id: string, body: Record<string, unknown>) =>
      data<ChecklistTemplate>(request('PATCH', `/api/checklist-templates/${id}`, body)),
    deleteChecklistTemplate: (id: string) =>
      request<void>('DELETE', `/api/checklist-templates/${id}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
