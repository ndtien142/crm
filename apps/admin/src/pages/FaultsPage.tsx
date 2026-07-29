import { ApiError } from '@firecare/api-client';
import type { Fault } from '@firecare/types';
import {
  Badge,
  Button,
  Card,
  cn,
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
  Textarea,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Plus, Trash2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  FAULT_SEVERITIES,
  FAULT_SEVERITY_BADGE,
  FAULT_STATUS_BADGE,
  FAULT_STATUSES,
  faultSeverityLabel,
  faultStatusLabel,
} from '../lib/labels';
import {
  useAssets,
  useCreateFault,
  useDeleteFault,
  useFaults,
  useResolveFault,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const PAGE_SIZE = 20;

const createSchema = z.object({
  assetId: z.string().uuid('Chọn thiết bị'),
  severity: z.string(),
  description: z.string().min(1, 'Mô tả sự cố'),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateFaultDialog({ assets }: { assets: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateFault();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { assetId: '', severity: 'medium', description: '' },
  });

  async function onSubmit(v: CreateValues) {
    try {
      await create.mutateAsync({ assetId: v.assetId, severity: v.severity, description: v.description });
      toast.success('Đã ghi nhận sự cố — thiết bị chuyển sang "lỗi"');
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={assets.length === 0}>
          <Plus className="size-4" /> Ghi nhận sự cố
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận sự cố</DialogTitle>
          <DialogDescription>Thiết bị sẽ được đánh dấu "lỗi" cho tới khi xử lý xong.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thiết bị *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— Chọn thiết bị —" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mức độ</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FAULT_SEVERITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Vòi rò rỉ, kim đồng hồ về vạch đỏ…" {...field} />
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

function ResolveFaultDialog({ fault, onClose }: { fault: Fault; onClose: () => void }) {
  const resolve = useResolveFault();
  const [note, setNote] = useState('');

  async function submit() {
    try {
      await resolve.mutateAsync({ id: fault.id, body: { resolutionNote: note || undefined } });
      toast.success('Đã xử lý sự cố');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không xử lý được');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xử lý sự cố</DialogTitle>
          <DialogDescription>
            Khi không còn sự cố nào, thiết bị sẽ trở lại "hoạt động".
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="mb-1.5 text-sm font-medium">Ghi chú xử lý</div>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Đã thay/sửa…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={resolve.isPending}>
            {resolve.isPending ? 'Đang lưu…' : 'Đánh dấu đã xử lý'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FaultsPage() {
  const role = useAuth((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'staff';
  const canDelete = role === 'admin';

  const assets = useAssets({ page: 1, pageSize: 100 });
  const del = useDeleteFault();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [resolving, setResolving] = useState<Fault | null>(null);

  const query = useFaults({ page, pageSize: PAGE_SIZE, status, severity });
  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const assetName = useMemo(() => {
    const map = new Map((assets.data?.items ?? []).map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [assets.data]);

  async function onDelete(f: Fault) {
    if (!confirm('Xoá sự cố này?')) return;
    try {
      await del.mutateAsync(f.id);
      toast.success('Đã xoá');
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sự cố & Sửa chữa</h1>
          <p className="text-sm text-muted-foreground">
            {total} sự cố · tự mở khi kiểm tra không đạt
          </p>
        </div>
        {canWrite && <CreateFaultDialog assets={assets.data?.items ?? []} />}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {FAULT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity || 'all'} onValueChange={(v) => { setSeverity(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            {FAULT_SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thiết bị / Mô tả</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phát hiện</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Không có sự cố nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Wrench className="size-4 text-muted-foreground" />
                      {assetName(f.assetId)}
                    </div>
                    <div className="text-xs text-muted-foreground">{f.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-transparent', FAULT_SEVERITY_BADGE[f.severity])}>
                      {faultSeverityLabel(f.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-transparent', FAULT_STATUS_BADGE[f.status])}>
                      {faultStatusLabel(f.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.foundAt}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canWrite && f.status !== 'resolved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-emerald-600"
                          onClick={() => setResolving(f)}
                          aria-label="Xử lý"
                          title="Đánh dấu đã xử lý"
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(f)}
                          aria-label="Xoá"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Trang {page}/{pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </div>
      </div>

      {resolving && <ResolveFaultDialog fault={resolving} onClose={() => setResolving(null)} />}
    </div>
  );
}
