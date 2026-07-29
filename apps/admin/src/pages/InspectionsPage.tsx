import { ApiError } from '@firecare/api-client';
import type { Inspection } from '@firecare/types';
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
  Textarea,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  INSPECTION_PRIORITIES,
  INSPECTION_PRIORITY_BADGE,
  INSPECTION_STATUS_BADGE,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
  inspectionPriorityLabel,
  inspectionStatusLabel,
  inspectionTypeLabel,
} from '../lib/labels';
import {
  useAssets,
  useCompleteInspection,
  useCreateInspection,
  useDeleteInspection,
  useInspections,
  useSites,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const PAGE_SIZE = 20;

const createSchema = z.object({
  siteId: z.string().uuid('Chọn địa điểm'),
  assetId: z.string().optional(),
  type: z.string(),
  priority: z.string(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateInspectionDialog({ sites }: { sites: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateInspection();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { siteId: '', assetId: 'none', type: 'routine', priority: 'normal', scheduledDate: '', notes: '' },
  });
  const siteId = form.watch('siteId');
  const assets = useAssets({ page: 1, pageSize: 100, siteId: siteId || undefined });

  async function onSubmit(v: CreateValues) {
    try {
      await create.mutateAsync({
        siteId: v.siteId,
        assetId: v.assetId && v.assetId !== 'none' ? v.assetId : undefined,
        type: v.type,
        priority: v.priority,
        scheduledDate: v.scheduledDate || undefined,
        notes: v.notes || undefined,
      });
      toast.success('Đã tạo phiếu kiểm tra');
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
          <Plus className="size-4" /> Tạo phiếu kiểm tra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo phiếu kiểm tra</DialogTitle>
          <DialogDescription>Lên lịch kiểm tra cho địa điểm hoặc thiết bị.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('assetId', 'none');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— Chọn địa điểm —" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
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
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thiết bị (tuỳ chọn)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!siteId}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Cả địa điểm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Cả địa điểm (không gắn thiết bị)</SelectItem>
                      {(assets.data?.items ?? []).map((a) => (
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
            <div className="grid grid-cols-3 gap-3">
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
                        {INSPECTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ưu tiên</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INSPECTION_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày hẹn</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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

function CompleteInspectionDialog({
  inspection,
  onClose,
}: {
  inspection: Inspection;
  onClose: () => void;
}) {
  const complete = useCompleteInspection();
  const [status, setStatus] = useState<'passed' | 'failed'>('passed');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');

  async function submit() {
    try {
      await complete.mutateAsync({
        id: inspection.id,
        body: {
          status,
          nextDueDate: nextDueDate || undefined,
          notes: notes || undefined,
        },
      });
      toast.success('Đã ghi nhận kết quả — hạn thiết bị đã cập nhật');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không hoàn tất được');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hoàn tất kiểm tra · {inspection.code}</DialogTitle>
          <DialogDescription>
            Kết quả sẽ cập nhật hạn kiểm định kế tiếp của thiết bị.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-sm font-medium">Kết quả</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === 'passed' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setStatus('passed')}
              >
                Đạt
              </Button>
              <Button
                type="button"
                variant={status === 'failed' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setStatus('failed')}
              >
                Không đạt
              </Button>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Hạn kiểm định kế tiếp</div>
            <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Ghi chú</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={complete.isPending}>
            {complete.isPending ? 'Đang lưu…' : 'Hoàn tất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InspectionsPage() {
  const role = useAuth((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'staff';
  const canDelete = role === 'admin';

  const sites = useSites();
  const assets = useAssets({ page: 1, pageSize: 100 });
  const del = useDeleteInspection();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [siteId, setSiteId] = useState('');
  const [completing, setCompleting] = useState<Inspection | null>(null);

  const query = useInspections({ page, pageSize: PAGE_SIZE, status, type, priority, siteId, sort: 'scheduled' });
  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const siteName = useMemo(() => {
    const map = new Map((sites.data?.items ?? []).map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [sites.data]);
  const assetName = useMemo(() => {
    const map = new Map((assets.data?.items ?? []).map((a) => [a.id, a.name]));
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '— cả địa điểm —');
  }, [assets.data]);

  async function onDelete(i: Inspection) {
    if (!confirm(`Xoá phiếu kiểm tra "${i.code}"?`)) return;
    try {
      await del.mutateAsync(i.id);
      toast.success('Đã xoá');
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kiểm tra / Kiểm định</h1>
          <p className="text-sm text-muted-foreground">{total} phiếu · tự sinh khi thiết bị đến hạn</p>
        </div>
        {canWrite && <CreateInspectionDialog sites={sites.data?.items ?? []} />}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {INSPECTION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type || 'all'} onValueChange={(v) => { setType(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {INSPECTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority || 'all'} onValueChange={(v) => { setPriority(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ưu tiên</SelectItem>
            {INSPECTION_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={siteId || 'all'} onValueChange={(v) => { setSiteId(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Địa điểm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả địa điểm</SelectItem>
            {(sites.data?.items ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Địa điểm / Thiết bị</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Chưa có phiếu kiểm tra nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{i.code}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inspectionTypeLabel(i.type)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{siteName(i.siteId)}</div>
                    <div className="text-xs text-muted-foreground">{assetName(i.assetId)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-transparent', INSPECTION_STATUS_BADGE[i.status])}>
                      {inspectionStatusLabel(i.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-transparent', INSPECTION_PRIORITY_BADGE[i.priority])}>
                      {inspectionPriorityLabel(i.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {i.performedDate ?? i.scheduledDate ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canWrite && (i.status === 'scheduled' || i.status === 'in_progress') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-emerald-600"
                          onClick={() => setCompleting(i)}
                          aria-label="Hoàn tất"
                          title="Hoàn tất kiểm tra"
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(i)}
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

      {completing && (
        <CompleteInspectionDialog inspection={completing} onClose={() => setCompleting(null)} />
      )}
    </div>
  );
}
