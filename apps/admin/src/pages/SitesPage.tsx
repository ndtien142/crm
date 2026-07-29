import { ApiError } from '@firecare/api-client';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SITE_TYPES, siteTypeLabel } from '../lib/labels';
import { useCreateSite, useCustomers, useDeleteSite, useSites } from '../lib/queries';
import { useAuth } from '../store/auth';

const schema = z.object({
  customerId: z.string().uuid('Chọn khách hàng'),
  name: z.string().min(1, 'Nhập tên địa điểm'),
  type: z.string(),
  address: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function CreateSiteDialog({ customers }: { customers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateSite();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: '', name: '', type: 'building', address: '' },
  });

  async function onSubmit(v: Values) {
    try {
      await create.mutateAsync({
        customerId: v.customerId,
        name: v.name,
        type: v.type,
        address: v.address || undefined,
      });
      toast.success('Đã thêm địa điểm');
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Thêm địa điểm
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm địa điểm / tòa nhà</DialogTitle>
          <DialogDescription>Địa điểm thuộc về một khách hàng.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách hàng *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— Chọn khách hàng —" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SITE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SitesPage() {
  const role = useAuth((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'staff';
  const canDelete = role === 'admin';

  const sites = useSites();
  const customersQuery = useCustomers({ page: 1, pageSize: 100 });
  const del = useDeleteSite();

  const customerName = useMemo(() => {
    const map = new Map((customersQuery.data?.items ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [customersQuery.data]);

  const rows = sites.data?.items ?? [];

  async function onDelete(id: string, name: string) {
    if (!confirm(`Xoá địa điểm "${name}"? Thiết bị bên trong cũng sẽ bị xoá.`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Đã xoá địa điểm');
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Địa điểm / Tòa nhà</h1>
          <p className="text-sm text-muted-foreground">{sites.data?.meta.total ?? 0} địa điểm</p>
        </div>
        {canWrite && <CreateSiteDialog customers={customersQuery.data?.items ?? []} />}
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Địa chỉ</TableHead>
              {canDelete && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canDelete ? 5 : 4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDelete ? 5 : 4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Chưa có địa điểm nào.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Building2 className="size-4 text-muted-foreground" />
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customerName(s.customerId)}</TableCell>
                  <TableCell className="text-muted-foreground">{siteTypeLabel(s.type)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.address ?? '—'}</TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(s.id, s.name)}
                        aria-label="Xoá"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
