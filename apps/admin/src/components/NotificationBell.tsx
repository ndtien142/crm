import { Button, Popover, PopoverContent, PopoverTrigger } from '@firecare/ui';
import { useQuery } from '@tanstack/react-query';
import { Bell, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { customerTypeLabel } from '../lib/labels';

/**
 * Notification panel. Today it surfaces recently-added customers as activity;
 * the same list will carry re-service-due reminders, complaints and task
 * assignments once P2/P3 land (each just another item source).
 */
export function NotificationBell() {
  const recent = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.listCustomers({ pageSize: 6, sort: 'recent' }),
    staleTime: 60_000,
  });

  const items = recent.data?.items ?? [];
  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Thông báo">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold">Thông báo</span>
          {count > 0 && <span className="text-xs text-muted-foreground">{count} mục</span>}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recent.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Đang tải…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="size-8 text-muted-foreground/40" />
              <p>Chưa có thông báo mới.</p>
              <p className="text-xs">
                Nhắc tái dịch vụ, khiếu nại và phân công sẽ hiển thị ở đây (P2/P3).
              </p>
            </div>
          ) : (
            items.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/50"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Khách hàng mới: {c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {customerTypeLabel(c.type)}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Link
          to="/khach-hang"
          className="block border-t px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50"
        >
          Xem tất cả khách hàng
        </Link>
      </PopoverContent>
    </Popover>
  );
}
