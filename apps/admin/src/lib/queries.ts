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
