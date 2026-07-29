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
  ModeToggle,
} from '@firecare/ui';
import {
  CalendarDays,
  Flame,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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

export default function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-4 text-lg font-bold">
          <Flame className="size-6 text-primary" /> FireCare
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )
              }
            >
              <n.icon className="size-5" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto flex-1 justify-start gap-2 px-2 py-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {user ? ROLE_LABEL[user.role] : ''}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {user?.email}
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
          <ModeToggle />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
