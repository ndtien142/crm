import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useSession } from './lib/session';
import { Spinner } from './lib/ui';
import AccountsPage from './pages/AccountsPage';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (status === 'anon') return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/khach-hang" element={<CustomersPage />} />
        <Route
          path="/cham-soc"
          element={
            <PlaceholderPage
              title="Chăm sóc khách hàng"
              note="Kanban chăm sóc, nhật ký tương tác và nhắc tái dịch vụ tự động (giai đoạn P3)."
            />
          }
        />
        <Route
          path="/lich"
          element={<PlaceholderPage title="Lịch hẹn" note="Calendar đặt lịch dịch vụ (giai đoạn P3)." />}
        />
        <Route
          path="/ban-do"
          element={
            <PlaceholderPage title="Bản đồ điểm" note="Registry điểm Google Maps (giai đoạn P4)." />
          }
        />
        <Route path="/tai-khoan" element={<AccountsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
