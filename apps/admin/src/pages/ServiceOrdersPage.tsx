import { ApiError } from '@firecare/api-client';
import type { ServiceCatalogItem, ServiceOrder } from '@firecare/types';
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
import {
  BadgeDollarSign,
  CheckCircle2,
  Eye,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUSES,
  SERVICE_ORDER_STATUS_BADGE,
  SERVICE_ORDER_STATUSES,
  formatVnd,
  paymentStatusLabel,
  serviceOrderStatusLabel,
} from '../lib/labels';
import {
  useCompleteServiceOrder,
  useCreateServiceOrder,
  useCustomers,
  useDeleteServiceOrder,
  usePayServiceOrder,
  useServiceCatalog,
  useServiceOrder,
  useServiceOrders,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const PAGE_SIZE = 20;
const today = () => new Date().toISOString().slice(0, 10);

// ── Create (multi-line) ──────────────────────────────────────────────────────

const lineSchema = z.object({
  serviceId: z.string().optional(),
  description: z.string().min(1, 'Nhập mô tả dịch vụ'),
  quantity: z.coerce.number().min(0, 'SL ≥ 0'),
  unitPrice: z.coerce.number().min(0, 'Giá ≥ 0'),
  cycleMonths: z.string().optional(),
});
const createSchema = z.object({
  customerId: z.string().uuid('Chọn khách hàng'),
  status: z.string(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Thêm ít nhất một dòng dịch vụ'),
});
type CreateValues = z.infer<typeof createSchema>;

const emptyLine = { serviceId: '', description: '', quantity: 1, unitPrice: 0, cycleMonths: '' };

function CreateOrderDialog({
  customers,
  catalog,
}: {
  customers: { id: string; name: string }[];
  catalog: ServiceCatalogItem[];
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateServiceOrder();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { customerId: '', status: 'draft', scheduledAt: '', notes: '', lines: [emptyLine] },
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'lines' });

  const lines = form.watch('lines');
  const total = useMemo(
    () => (lines ?? []).reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    [lines],
  );

  // Picking a catalog service prefills description / price / cycle for that row.
  function applyService(index: number, serviceId: string) {
    const svc = catalog.find((c) => c.id === serviceId);
    if (!svc) return;
    update(index, {
      serviceId,
      description: svc.name,
      quantity: form.getValues(`lines.${index}.quantity`) || 1,
      unitPrice: svc.unitPrice,
      cycleMonths: svc.defaultCycleMonths != null ? String(svc.defaultCycleMonths) : '',
    });
  }

  async function onSubmit(v: CreateValues) {
    const body = {
      customerId: v.customerId,
      status: v.status,
      scheduledAt: v.scheduledAt?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
      lines: v.lines.map((l) => ({
        serviceId: l.serviceId || null,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        cycleMonths: l.cycleMonths?.trim() ? Number(l.cycleMonths) : null,
      })),
    };
    try {
      await create.mutateAsync(body);
      toast.success('Đã tạo phiếu dịch vụ');
      form.reset({ customerId: '', status: 'draft', scheduledAt: '', notes: '', lines: [emptyLine] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo phiếu thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={customers.length === 0}>
          <Plus className="size-4" /> Tạo phiếu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu dịch vụ</DialogTitle>
          <DialogDescription>
            Chọn khách và thêm các dòng dịch vụ. Chi nhánh lấy theo khách; ngày tái dịch vụ tính khi
            hoàn tất phiếu.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="scheduledAt"
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Dòng dịch vụ *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...emptyLine })}
                >
                  <Plus className="size-4" /> Thêm dòng
                </Button>
              </div>
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <div key={f.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Select
                        value={form.watch(`lines.${i}.serviceId`) || 'custom'}
                        onValueChange={(v) =>
                          v === 'custom'
                            ? update(i, { ...form.getValues(`lines.${i}`), serviceId: '' })
                            : applyService(i, v)
                        }
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="Chọn từ danh mục…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">— Tự nhập —</SelectItem>
                          {catalog.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} · {formatVnd(c.unitPrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(i)}
                          aria-label="Xoá dòng"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name={`lines.${i}.description`}
                      render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormControl>
                            <Input placeholder="Mô tả dịch vụ" className="h-8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`lines.${i}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">SL</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} className="h-8" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${i}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Đơn giá</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={1000} className="h-8" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${i}.cycleMonths`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Chu kỳ (th)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} placeholder="—" className="h-8" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-2 text-right text-xs text-muted-foreground">
                      Thành tiền:{' '}
                      <span className="font-medium text-foreground">
                        {formatVnd((Number(lines[i]?.quantity) || 0) * (Number(lines[i]?.unitPrice) || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.lines?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.lines.message}</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Ghi chú thêm…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm font-medium">Tổng cộng</span>
              <span className="text-lg font-bold tabular-nums">{formatVnd(total)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Đang lưu…' : 'Tạo phiếu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Complete ─────────────────────────────────────────────────────────────────

function CompleteDialog({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  const complete = useCompleteServiceOrder();
  const [performedAt, setPerformedAt] = useState(today());

  async function submit() {
    try {
      await complete.mutateAsync({ id: order.id, body: { performedAt } });
      toast.success('Đã hoàn tất — ngày tái dịch vụ đã được tính');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không hoàn tất được');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hoàn tất phiếu {order.code}</DialogTitle>
          <DialogDescription>
            Ngày thực hiện dùng để tính hạn tái dịch vụ cho từng dòng (theo chu kỳ).
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="mb-1.5 text-sm font-medium">Ngày thực hiện</div>
          <Input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
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

// ── Payment (accountant/admin) ───────────────────────────────────────────────

function PaymentDialog({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  const pay = usePayServiceOrder();
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [paidAmount, setPaidAmount] = useState(
    order.paymentStatus === 'paid' ? order.totalAmount : order.paidAmount,
  );

  async function submit() {
    try {
      await pay.mutateAsync({
        id: order.id,
        body: {
          paymentStatus,
          paidAmount: paymentStatus === 'paid' ? order.totalAmount : paidAmount,
        },
      });
      toast.success('Đã cập nhật thanh toán');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không cập nhật được');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thanh toán phiếu {order.code}</DialogTitle>
          <DialogDescription>Tổng phiếu: {formatVnd(order.totalAmount)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-sm font-medium">Trạng thái</div>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {paymentStatus === 'partial' && (
            <div>
              <div className="mb-1.5 text-sm font-medium">Số tiền đã thu</div>
              <Input
                type="number"
                min={0}
                max={order.totalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pay.isPending}>
            {pay.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail (lines) ───────────────────────────────────────────────────────────

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useServiceOrder(id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Phiếu {data?.code ?? '…'}</DialogTitle>
          <DialogDescription>
            {data?.nextDueDate ? `Tái dịch vụ kế tiếp: ${data.nextDueDate}` : 'Chưa có hạn tái dịch vụ'}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-2">
            {(data.lines ?? []).map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{l.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.quantity} × {formatVnd(l.unitPrice)}
                    {l.cycleMonths ? ` · chu kỳ ${l.cycleMonths} th` : ''}
                    {l.lineDueDate ? ` · hạn ${l.lineDueDate}` : ''}
                  </div>
                </div>
                <div className="shrink-0 font-medium tabular-nums">{formatVnd(l.lineAmount)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Tổng cộng</span>
              <span className="tabular-nums">{formatVnd(data.totalAmount)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceOrdersPage() {
  const role = useAuth((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'staff';
  const canPay = role === 'admin' || role === 'accountant';
  const canDelete = role === 'admin';

  const customers = useCustomers({ page: 1, pageSize: 100 });
  const catalog = useServiceCatalog();
  const del = useDeleteServiceOrder();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [completing, setCompleting] = useState<ServiceOrder | null>(null);
  const [paying, setPaying] = useState<ServiceOrder | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const query = useServiceOrders({ page, pageSize: PAGE_SIZE, status, paymentStatus, sort: 'recent' });
  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const customerName = useMemo(() => {
    const map = new Map((customers.data?.items ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [customers.data]);

  const activeCatalog = (catalog.data ?? []).filter((c) => c.isActive);

  async function onDelete(o: ServiceOrder) {
    if (!confirm(`Xoá phiếu ${o.code}?`)) return;
    try {
      await del.mutateAsync(o.id);
      toast.success('Đã xoá');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phiếu dịch vụ</h1>
          <p className="text-sm text-muted-foreground">
            {total} phiếu · hoàn tất phiếu để tính hạn tái dịch vụ
          </p>
        </div>
        {canWrite && (
          <CreateOrderDialog customers={customers.data?.items ?? []} catalog={activeCatalog} />
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {SERVICE_ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentStatus || 'all'}
          onValueChange={(v) => {
            setPaymentStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Thanh toán" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thanh toán</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
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
              <TableHead>Phiếu / Khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tái DV</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Chưa có phiếu dịch vụ nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Receipt className="size-4 text-muted-foreground" />
                      {o.code}
                    </div>
                    <div className="text-xs text-muted-foreground">{customerName(o.customerId)}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatVnd(o.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('border-transparent', PAYMENT_STATUS_BADGE[o.paymentStatus])}
                    >
                      {paymentStatusLabel(o.paymentStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('border-transparent', SERVICE_ORDER_STATUS_BADGE[o.status])}
                    >
                      {serviceOrderStatusLabel(o.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.nextDueDate ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setViewing(o.id)}
                        aria-label="Chi tiết"
                        title="Xem chi tiết"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canWrite && o.status !== 'done' && o.status !== 'canceled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-emerald-600"
                          onClick={() => setCompleting(o)}
                          aria-label="Hoàn tất"
                          title="Hoàn tất"
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                      )}
                      {canPay && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => setPaying(o)}
                          aria-label="Thanh toán"
                          title="Thanh toán"
                        >
                          <BadgeDollarSign className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(o)}
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
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      </div>

      {completing && <CompleteDialog order={completing} onClose={() => setCompleting(null)} />}
      {paying && <PaymentDialog order={paying} onClose={() => setPaying(null)} />}
      {viewing && <DetailDialog id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
