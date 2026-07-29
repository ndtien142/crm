import { ApiError } from '@firecare/api-client';
import type { CareTask, CareTaskStatus } from '@firecare/types';
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
  Textarea,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { HandHelping, Phone, Plus, Trash2, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  CARE_CHANNELS,
  CARE_DISPOSITIONS,
  CARE_PRIORITIES,
  CARE_PRIORITY_ACCENT,
  CARE_PRIORITY_BADGE,
  CARE_TASK_STATUSES,
  CARE_TASK_TYPES,
  CARE_TYPE_BADGE,
  careChannelLabel,
  careDispositionLabel,
  carePriorityLabel,
  careTaskTypeLabel,
} from '../lib/labels';
import {
  useCareInteractions,
  useCareTasks,
  useClaimCareTask,
  useCreateCareInteraction,
  useCreateCareTask,
  useCustomers,
  useDeleteCareTask,
  useUpdateCareTask,
  useUsers,
} from '../lib/queries';
import { useAuth } from '../store/auth';

const today = () => new Date().toISOString().slice(0, 10);

// ── Create task dialog ───────────────────────────────────────────────────────

const createSchema = z.object({
  customerId: z.string().uuid('Chọn khách hàng'),
  title: z.string().min(1, 'Nhập tiêu đề'),
  type: z.string(),
  priority: z.string(),
  dueDate: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateTaskDialog({ customers }: { customers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateCareTask();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { customerId: '', title: '', type: 'followup', priority: 'normal', dueDate: '' },
  });

  async function onSubmit(v: CreateValues) {
    try {
      await create.mutateAsync({
        customerId: v.customerId,
        title: v.title,
        type: v.type,
        priority: v.priority,
        dueDate: v.dueDate?.trim() || undefined,
      });
      toast.success('Đã tạo thẻ chăm sóc');
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={customers.length === 0}>
          <Plus className="size-4" /> Tạo thẻ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo thẻ chăm sóc</DialogTitle>
          <DialogDescription>Thẻ chưa gán nằm ở "pool" chi nhánh để nhân viên nhận.</DialogDescription>
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
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề *</FormLabel>
                  <FormControl>
                    <Input placeholder="Gọi lại tư vấn đổi bình…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
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
                        {CARE_TASK_TYPES.map((t) => (
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
                        {CARE_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hạn xử lý</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Đang lưu…' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Task detail + interaction log ────────────────────────────────────────────

function TaskDetailDialog({
  task,
  customerName,
  userName,
  onClose,
}: {
  task: CareTask;
  customerName: string;
  userName: (id: string | null) => string;
  onClose: () => void;
}) {
  const role = useAuth((s) => s.user?.role);
  const canDelete = role === 'admin';
  const update = useUpdateCareTask();
  const del = useDeleteCareTask();
  const logMut = useCreateCareInteraction();
  const interactions = useCareInteractions({ careTaskId: task.id });

  const [channel, setChannel] = useState('call');
  const [disposition, setDisposition] = useState('connected');
  const [summary, setSummary] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  async function log() {
    if (!summary.trim()) {
      toast.error('Nhập tóm tắt trao đổi');
      return;
    }
    try {
      await logMut.mutateAsync({
        customerId: task.customerId,
        careTaskId: task.id,
        channel,
        disposition,
        summary,
        nextFollowUpAt: nextFollowUpAt || undefined,
      });
      toast.success('Đã ghi nhật ký');
      setSummary('');
      setNextFollowUpAt('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không ghi được');
    }
  }

  async function changeStatus(status: string) {
    try {
      await update.mutateAsync({ id: task.id, body: { status } });
    } catch {
      toast.error('Không đổi được trạng thái');
    }
  }

  async function onDelete() {
    if (!confirm('Xoá thẻ này?')) return;
    try {
      await del.mutateAsync(task.id);
      toast.success('Đã xoá');
      onClose();
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            <Badge variant="secondary" className={cn('border-transparent', CARE_TYPE_BADGE[task.type])}>
              {careTaskTypeLabel(task.type)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {customerName}
            {task.dueDate ? ` · hạn ${task.dueDate}` : ''} ·{' '}
            {task.assigneeId ? `phụ trách ${userName(task.assigneeId)}` : 'chưa nhận (pool)'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Select value={task.status} onValueChange={changeStatus}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARE_TASK_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Xoá"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        {/* Log a touch */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-medium">Ghi nhật ký chăm sóc</div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARE_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={disposition} onValueChange={setDisposition}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARE_DISPOSITIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            rows={2}
            placeholder="Nội dung trao đổi…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          {(disposition === 'callback' || disposition === 'no_answer') && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Hẹn liên hệ lại</div>
              <Input
                type="date"
                className="h-8"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
              />
            </div>
          )}
          <Button size="sm" className="w-full" onClick={log} disabled={logMut.isPending}>
            <Phone className="size-4" /> {logMut.isPending ? 'Đang lưu…' : 'Ghi nhật ký'}
          </Button>
        </div>

        {/* History */}
        <div className="max-h-52 space-y-2 overflow-auto">
          {interactions.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (interactions.data?.items ?? []).length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Chưa có nhật ký nào.</div>
          ) : (
            (interactions.data?.items ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border p-2 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{careChannelLabel(r.channel)}</span>·
                  <span>{careDispositionLabel(r.disposition)}</span>·
                  <span>{r.occurredAt.slice(0, 10)}</span>
                </div>
                <div>{r.summary}</div>
                {r.nextFollowUpAt && (
                  <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    Hẹn lại: {r.nextFollowUpAt}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Kanban card ──────────────────────────────────────────────────────────────

function TaskCard({
  task,
  customerName,
  meId,
  onOpen,
  onClaim,
  onDragStart,
}: {
  task: CareTask;
  customerName: string;
  meId: string | undefined;
  onOpen: () => void;
  onClaim: () => void;
  onDragStart: () => void;
}) {
  const overdue = task.dueDate != null && task.dueDate < today() && task.status !== 'done' && task.status !== 'lost';
  const mine = task.assigneeId && task.assigneeId === meId;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        'cursor-pointer rounded-lg border border-l-4 bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md',
        CARE_PRIORITY_ACCENT[task.priority],
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{task.title}</span>
        {(task.priority === 'high' || task.priority === 'urgent') && (
          <Badge
            variant="secondary"
            className={cn('shrink-0 border-transparent text-[10px]', CARE_PRIORITY_BADGE[task.priority])}
          >
            {carePriorityLabel(task.priority)}
          </Badge>
        )}
      </div>
      <div className="mb-2 truncate text-xs text-muted-foreground">{customerName}</div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className={cn('border-transparent text-[10px]', CARE_TYPE_BADGE[task.type])}>
          {careTaskTypeLabel(task.type)}
        </Badge>
        {task.dueDate && (
          <span className={cn('text-[11px]', overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {task.dueDate}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {task.assigneeId ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <UserCheck className="size-3" /> {mine ? 'Tôi' : 'Đã nhận'}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              onClaim();
            }}
          >
            <HandHelping className="size-3" /> Nhận
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CarePage() {
  const me = useAuth((s) => s.user);
  const customers = useCustomers({ page: 1, pageSize: 100 });
  const users = useUsers();
  const claim = useClaimCareTask();
  const update = useUpdateCareTask();

  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [view, setView] = useState<'all' | 'mine' | 'pool'>('all');
  const [selected, setSelected] = useState<CareTask | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const filters = {
    type,
    priority,
    assigneeId: view === 'mine' ? me?.id : undefined,
    unassignedOnly: view === 'pool',
  };
  const query = useCareTasks(filters);
  const tasks = query.data?.items ?? [];

  const customerName = useMemo(() => {
    const map = new Map((customers.data?.items ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [customers.data]);

  const userName = useMemo(() => {
    const map = new Map((users.data?.items ?? []).map((u) => [u.id, u.name]));
    return (id: string | null) => (id ? (map.get(id) ?? 'NV') : '—');
  }, [users.data]);

  const byStatus = useMemo(() => {
    const g: Record<string, CareTask[]> = {};
    for (const s of CARE_TASK_STATUSES) g[s.value] = [];
    for (const t of tasks) (g[t.status] ??= []).push(t);
    return g;
  }, [tasks]);

  async function onClaim(id: string) {
    try {
      await claim.mutateAsync(id);
      toast.success('Đã nhận thẻ');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không nhận được');
    }
  }

  async function onDrop(status: CareTaskStatus) {
    setDragOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    try {
      await update.mutateAsync({ id, body: { status } });
    } catch {
      toast.error('Không đổi được trạng thái');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chăm sóc khách hàng</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} thẻ · kéo-thả để đổi trạng thái · thẻ đến hạn tái dịch vụ tự xuất hiện
          </p>
        </div>
        <CreateTaskDialog customers={customers.data?.items ?? []} />
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex overflow-hidden rounded-md border">
          {(
            [
              { k: 'all', label: 'Tất cả' },
              { k: 'mine', label: 'Của tôi' },
              { k: 'pool', label: 'Chưa nhận' },
            ] as const
          ).map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors',
                view === v.k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {CARE_TASK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority || 'all'} onValueChange={(v) => setPriority(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi ưu tiên</SelectItem>
            {CARE_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {CARE_TASK_STATUSES.map((col) => {
          const items = byStatus[col.value] ?? [];
          return (
            <div
              key={col.value}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.value);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === col.value ? null : c))}
              onDrop={() => onDrop(col.value)}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors',
                dragOverCol === col.value && 'border-primary bg-primary/5',
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                <span>{col.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {query.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      customerName={customerName(t.customerId)}
                      meId={me?.id}
                      onOpen={() => setSelected(t)}
                      onClaim={() => onClaim(t.id)}
                      onDragStart={() => setDragId(t.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <TaskDetailDialog
          task={selected}
          customerName={customerName(selected.customerId)}
          userName={userName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
