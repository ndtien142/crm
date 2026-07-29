import { ApiError } from '@firecare/api-client';
import type { AssetCategory, Site } from '@firecare/types';
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
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { parseCsv } from '../lib/csv';
import {
  ASSET_CATEGORIES,
  ASSET_STATUS_BADGE,
  ASSET_STATUSES,
  assetCategoryLabel,
  assetStatusLabel,
} from '../lib/labels';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useImportAssets,
  useSites,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const PAGE_SIZE = 20;

const schema = z.object({
  siteId: z.string().uuid('Chọn địa điểm'),
  name: z.string().min(1, 'Nhập tên thiết bị'),
  category: z.string(),
  serialNo: z.string().optional(),
  nextDueDate: z.string().optional(),
  locationNote: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function CreateAssetDialog({ sites, defaultSiteId }: { sites: Site[]; defaultSiteId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateAsset();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: defaultSiteId,
      name: '',
      category: 'extinguisher',
      serialNo: '',
      nextDueDate: '',
      locationNote: '',
    },
  });

  async function onSubmit(v: Values) {
    try {
      await create.mutateAsync({
        siteId: v.siteId,
        name: v.name,
        category: v.category,
        serialNo: v.serialNo || undefined,
        nextDueDate: v.nextDueDate || undefined,
        locationNote: v.locationNote || undefined,
      });
      toast.success('Đã thêm thiết bị (QR tự tạo)');
      form.reset({ ...form.getValues(), name: '', serialNo: '', nextDueDate: '', locationNote: '' });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : setOpen(false))}>
      <DialogTrigger asChild>
        <Button disabled={sites.length === 0}>
          <Plus className="size-4" /> Thêm thiết bị
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm thiết bị</DialogTitle>
          <DialogDescription>Mã QR sẽ được tạo tự động.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bình bột ABC 4kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
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
                        {ASSET_CATEGORIES.map((t) => (
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="serialNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số serial</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn kế tiếp</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="locationNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vị trí (mô tả)</FormLabel>
                  <FormControl>
                    <Input placeholder="Tầng 1, gần cầu thang" {...field} />
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

export default function AssetsPage() {
  const role = useAuth((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'staff';
  const canDelete = role === 'admin';

  const sites = useSites();
  const del = useDeleteAsset();
  const importMut = useImportAssets();
  const fileRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [siteId, setSiteId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'recent' | 'due'>('recent');

  const query = useAssets({ page, pageSize: PAGE_SIZE, q, siteId, category, status, sort });
  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const siteName = useMemo(() => {
    const map = new Map((sites.data?.items ?? []).map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [sites.data]);

  async function onImport(file: File) {
    if (!siteId) {
      toast.error('Chọn địa điểm để nhập thiết bị.');
      return;
    }
    try {
      const { rows } = parseCsv(await file.text());
      const mapped = rows
        .map((r) => ({
          name: r.name ?? r['tên'] ?? '',
          serialNo: r.serial ?? r.serialno ?? r['serial'] ?? undefined,
          category: (r.category as AssetCategory) || undefined,
          manufacturer: r.manufacturer ?? undefined,
          nextDueDate: r.nextduedate ?? r['han'] ?? r['hạn'] ?? undefined,
          locationNote: r.location ?? r['vitri'] ?? r['vị trí'] ?? undefined,
        }))
        .filter((r) => r.name);
      if (!mapped.length) {
        toast.error('Không đọc được dòng nào (cần cột "name").');
        return;
      }
      const res = await importMut.mutateAsync({ siteId, rows: mapped });
      toast.success(`Đã nhập ${res.inserted}, bỏ qua ${res.skipped} (trùng serial).`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Nhập thất bại');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Xoá thiết bị "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Đã xoá thiết bị');
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  const siteOptions = sites.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thiết bị PCCC</h1>
          <p className="text-sm text-muted-foreground">{total} thiết bị</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
              <Upload className="size-4" /> Nhập CSV
            </Button>
            <CreateAssetDialog sites={siteOptions} defaultSiteId={siteId} />
          </div>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm tên, serial, QR…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </form>
        <Select value={siteId || 'all'} onValueChange={(v) => { setSiteId(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Địa điểm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả địa điểm</SelectItem>
            {siteOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category || 'all'} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {ASSET_CATEGORIES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as 'recent' | 'due')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mới nhất</SelectItem>
            <SelectItem value="due">Sắp đến hạn</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thiết bị</TableHead>
              <TableHead>QR</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn kế tiếp</TableHead>
              <TableHead>Địa điểm</TableHead>
              {canDelete && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canDelete ? 7 : 6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDelete ? 7 : 6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Chưa có thiết bị nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    {a.serialNo && (
                      <div className="text-xs text-muted-foreground">SN: {a.serialNo}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.qrCode}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assetCategoryLabel(a.category)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('border-transparent', ASSET_STATUS_BADGE[a.status])}
                    >
                      {assetStatusLabel(a.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.nextDueDate ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{siteName(a.siteId)}</TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(a.id, a.name)}
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
    </div>
  );
}
