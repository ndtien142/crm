import { ApiError } from '@firecare/api-client';
import type { ServiceCatalogItem } from '@firecare/types';
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
  FormDescription,
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SERVICE_CATEGORIES, formatVnd, serviceCategoryLabel } from '../lib/labels';
import {
  useCreateService,
  useDeleteService,
  useServiceCatalog,
  useUpdateService,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const schema = z.object({
  name: z.string().min(1, 'Nhập tên dịch vụ'),
  category: z.string(),
  unitPrice: z.coerce.number().min(0, 'Giá không hợp lệ'),
  unit: z.string().optional(),
  defaultCycleMonths: z.string().optional(),
  code: z.string().optional(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function ServiceDialog({
  item,
  trigger,
}: {
  item?: ServiceCatalogItem;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateService();
  const update = useUpdateService();
  const editing = Boolean(item);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      category: item?.category ?? 'refill_replace',
      unitPrice: item?.unitPrice ?? 0,
      unit: item?.unit ?? '',
      defaultCycleMonths: item?.defaultCycleMonths != null ? String(item.defaultCycleMonths) : '',
      code: item?.code ?? '',
      isActive: item?.isActive ?? true,
    },
  });

  async function onSubmit(v: Values) {
    const body = {
      name: v.name,
      category: v.category,
      unitPrice: v.unitPrice,
      unit: v.unit?.trim() || undefined,
      defaultCycleMonths: v.defaultCycleMonths?.trim() ? Number(v.defaultCycleMonths) : null,
      code: v.code?.trim() || undefined,
      isActive: v.isActive,
    };
    try {
      if (item) await update.mutateAsync({ id: item.id, body });
      else await create.mutateAsync(body);
      toast.success(editing ? 'Đã cập nhật dịch vụ' : 'Đã thêm dịch vụ');
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Lưu thất bại');
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</DialogTitle>
          <DialogDescription>
            Danh mục dùng chung toàn hệ thống — chu kỳ quyết định ngày tái dịch vụ trên phiếu.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên dịch vụ *</FormLabel>
                  <FormControl>
                    <Input placeholder="Đổi bình bột ABC 4kg…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhóm</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị</FormLabel>
                    <FormControl>
                      <Input placeholder="bình, lần, bộ…" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn giá (₫) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultCycleMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chu kỳ (tháng)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="12" {...field} />
                    </FormControl>
                    <FormDescription>Để trống nếu không tái dịch vụ.</FormDescription>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Đang kinh doanh</FormLabel>
                    <FormDescription>Tắt để ẩn khỏi phiếu mới.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceCatalogPage() {
  const isAdmin = useAuth((s) => s.user?.role === 'admin');
  const del = useDeleteService();
  const [category, setCategory] = useState('');
  const query = useServiceCatalog({
    category: category || undefined,
    includeInactive: true,
  });
  const items = query.data ?? [];

  async function onDelete(item: ServiceCatalogItem) {
    if (!confirm(`Xoá dịch vụ "${item.name}"?`)) return;
    try {
      await del.mutateAsync(item.id);
      toast.success('Đã xoá');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh mục dịch vụ</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} dịch vụ · giá &amp; chu kỳ tái dịch vụ dùng chung toàn hệ thống
          </p>
        </div>
        {isAdmin && (
          <ServiceDialog
            trigger={
              <Button>
                <Plus className="size-4" /> Thêm dịch vụ
              </Button>
            }
          />
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Nhóm dịch vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhóm</SelectItem>
            {SERVICE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dịch vụ</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead className="text-center">Chu kỳ</TableHead>
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
                  Chưa có dịch vụ nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id} className={cn(!s.isActive && 'opacity-55')}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Tags className="size-4 text-muted-foreground" />
                      {s.name}
                      {!s.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Ngừng
                        </Badge>
                      )}
                    </div>
                    {s.unit && <div className="text-xs text-muted-foreground">Đơn vị: {s.unit}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {serviceCategoryLabel(s.category)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatVnd(s.unitPrice)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {s.defaultCycleMonths ? `${s.defaultCycleMonths} tháng` : '—'}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        <ServiceDialog
                          item={s}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Sửa"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(s)}
                          aria-label="Xoá"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
