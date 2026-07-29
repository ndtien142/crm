import type { Role, User } from '@firecare/types';
import {
  Badge,
  Button,
  cn,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@firecare/ui';
import { KeyRound } from 'lucide-react';
import { CreateUserDialog } from '../components/accounts/CreateUserDialog';
import { useBranches, useResetPassword, useUsers } from '../lib/queries';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị',
  accountant: 'Kế toán',
  staff: 'Nhân viên',
};

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  accountant: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  staff: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

export default function AccountsPage() {
  const users = useUsers();
  const branches = useBranches();
  const reset = useResetPassword();

  const branchName = (id: string | null) =>
    (branches.data?.items ?? []).find((b) => b.id === id)?.name ?? '—';

  async function onReset(u: User) {
    const pw = prompt(`Mật khẩu mới cho ${u.name}:`);
    if (!pw) return;
    try {
      await reset.mutateAsync({ id: u.id, password: pw });
      toast.success(`Đã đặt lại mật khẩu cho ${u.name}`);
    } catch {
      toast.error('Đặt lại mật khẩu thất bại');
    }
  }

  const rows = users.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tài khoản</h1>
        <CreateUserDialog branches={branches.data?.items ?? []} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.isFieldStaff && (
                      <span className="ml-2 text-xs text-muted-foreground">(shipper)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-transparent', ROLE_BADGE[u.role])}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{branchName(u.branchId)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-transparent',
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
                      )}
                    >
                      {u.isActive ? 'Hoạt động' : 'Khoá'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => onReset(u)}
                      aria-label="Đặt lại mật khẩu"
                    >
                      <KeyRound className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
