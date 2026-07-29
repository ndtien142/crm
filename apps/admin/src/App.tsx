import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AccountsPage from './pages/AccountsPage';
import AssetsPage from './pages/AssetsPage';
import CarePage from './pages/CarePage';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import FaultsPage from './pages/FaultsPage';
import InspectionsPage from './pages/InspectionsPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ServiceCatalogPage from './pages/ServiceCatalogPage';
import ServiceOrdersPage from './pages/ServiceOrdersPage';
import SitesPage from './pages/SitesPage';
import { useAuth } from './store/auth';

export default function App() {
  const status = useAuth((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="grid h-screen place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === 'anon') return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/khach-hang" element={<CustomersPage />} />
        <Route path="/dia-diem" element={<SitesPage />} />
        <Route path="/thiet-bi" element={<AssetsPage />} />
        <Route path="/kiem-tra" element={<InspectionsPage />} />
        <Route path="/su-co" element={<FaultsPage />} />
        <Route path="/phieu" element={<ServiceOrdersPage />} />
        <Route path="/dich-vu" element={<ServiceCatalogPage />} />
        <Route path="/cham-soc" element={<CarePage />} />
        <Route
          path="/lich"
          element={<PlaceholderPage title="Lịch hẹn" note="Calendar đặt lịch dịch vụ (giai đoạn P3)." />}
        />
        <Route
          path="/ban-do"
          element={<PlaceholderPage title="Bản đồ điểm" note="Registry điểm Google Maps (giai đoạn P4)." />}
        />
        <Route path="/tai-khoan" element={<AccountsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
