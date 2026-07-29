import type { Role } from '@firecare/types';
import {
  Avatar,
  AvatarFallback,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ModeToggle,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@firecare/ui';
import {
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Flame,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../store/auth';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
  { to: '/khach-hang', label: 'Khách hàng', icon: Users },
  { to: '/dia-diem', label: 'Địa điểm', icon: Building2 },
  { to: '/thiet-bi', label: 'Thiết bị', icon: Boxes },
  { to: '/kiem-tra', label: 'Kiểm tra', icon: ClipboardCheck },
  { to: '/cham-soc', label: 'Chăm sóc', icon: HeartHandshake },
  { to: '/lich', label: 'Lịch hẹn', icon: CalendarDays },
  { to: '/ban-do', label: 'Bản đồ điểm', icon: MapPin },
  { to: '/tai-khoan', label: 'Tài khoản', icon: ShieldCheck, roles: ['admin'] },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị',
  accountant: 'Kế toán',
  staff: 'Nhân viên',
};

function initials(name?: string): string {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-6 text-lg font-bold tracking-tight">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Flame className="size-5" />
        </div>
        FireCare
      </div>
      <div className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Tổng quan
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )
            }
          >
            <n.icon className="size-4.5" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-muted-foreground">FireCare · PCCC · v0.1</div>
    </div>
  );
}

function UserMenu({ compact }: { compact?: boolean }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-1.5 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">
                {user ? ROLE_LABEL[user.role] : ''}
              </div>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <LogOut className="size-4" /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30 text-foreground">
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Điều hướng</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="rounded-full bg-muted/60 pl-9"
              placeholder="Tìm kiếm nhanh…"
              aria-label="Tìm kiếm"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ModeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
