/**
 * React Query hooks — the single place server state is read/mutated. Components
 * call these instead of touching the api client directly; mutations invalidate
 * the relevant query keys so lists stay fresh.
 */

import type { CustomerType } from '@firecare/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface CustomerFilters {
  page: number;
  pageSize: number;
  q?: string;
  type?: string;
  status?: string;
}

const keys = {
  customers: (f: CustomerFilters) => ['customers', f] as const,
  branches: ['branches'] as const,
  users: ['users'] as const,
};

// ── customers ──
export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: keys.customers(filters),
    queryFn: () =>
      api.listCustomers({
        page: filters.page,
        pageSize: filters.pageSize,
        q: filters.q || undefined,
        type: (filters.type as CustomerType) || undefined,
        status: filters.status || undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createCustomer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useImportCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { branchId?: string; rows: Record<string, unknown>[] }) =>
      api.importCustomers(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ── branches ──
export function useBranches() {
  return useQuery({ queryKey: keys.branches, queryFn: () => api.listBranches({ pageSize: 100 }) });
}

// ── users ──
export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: () => api.listUsers({ pageSize: 100 }) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createUser(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (v: { id: string; password: string }) => api.resetPassword(v.id, v.password),
  });
}

// ── sites ──
export function useSites(filter?: { q?: string; customerId?: string }) {
  return useQuery({
    queryKey: ['sites', filter],
    queryFn: () => api.listSites({ pageSize: 100, ...filter }),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createSite(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// ── assets ──
export interface AssetFilters {
  page: number;
  pageSize: number;
  q?: string;
  siteId?: string;
  category?: string;
  status?: string;
  sort?: 'recent' | 'due';
}

export function useAssets(filters: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () =>
      api.listAssets({
        page: filters.page,
        pageSize: filters.pageSize,
        q: filters.q || undefined,
        siteId: filters.siteId || undefined,
        category: filters.category || undefined,
        status: filters.status || undefined,
        sort: filters.sort,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createAsset(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useImportAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { siteId: string; rows: Record<string, unknown>[] }) =>
      api.importAssets(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

// ── inspections ──
export interface InspectionFilters {
  page: number;
  pageSize: number;
  siteId?: string;
  status?: string;
  type?: string;
  priority?: string;
  sort?: 'recent' | 'scheduled';
}

export function useInspections(filters: InspectionFilters) {
  return useQuery({
    queryKey: ['inspections', filters],
    queryFn: () =>
      api.listInspections({
        page: filters.page,
        pageSize: filters.pageSize,
        siteId: filters.siteId || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        priority: filters.priority || undefined,
        sort: filters.sort,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createInspection(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.completeInspection(v.id, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDeleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInspection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

// ── faults ──
export interface FaultFilters {
  page: number;
  pageSize: number;
  status?: string;
  severity?: string;
  assetId?: string;
}

export function useFaults(filters: FaultFilters) {
  return useQuery({
    queryKey: ['faults', filters],
    queryFn: () =>
      api.listFaults({
        page: filters.page,
        pageSize: filters.pageSize,
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        assetId: filters.assetId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateFault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createFault(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faults'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useResolveFault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.resolveFault(v.id, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faults'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDeleteFault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faults'] }),
  });
}

// ── service catalog (danh mục dịch vụ) ──
export function useServiceCatalog(opts?: { category?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['service-catalog', opts ?? {}],
    queryFn: () => api.listServiceCatalog(opts),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createService(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-catalog'] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.updateService(v.id, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-catalog'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-catalog'] }),
  });
}

// ── service orders (phiếu dịch vụ) ──
export interface ServiceOrderFilters {
  page: number;
  pageSize: number;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  sort?: 'recent' | 'due';
}

export function useServiceOrders(filters: ServiceOrderFilters) {
  return useQuery({
    queryKey: ['service-orders', filters],
    queryFn: () =>
      api.listServiceOrders({
        page: filters.page,
        pageSize: filters.pageSize,
        customerId: filters.customerId || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        sort: filters.sort,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useServiceOrder(id: string | null) {
  return useQuery({
    queryKey: ['service-order', id],
    queryFn: () => api.getServiceOrder(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createServiceOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });
}

export function useCompleteServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.completeServiceOrder(v.id, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });
}

export function usePayServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.payServiceOrder(v.id, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteServiceOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  });
}
