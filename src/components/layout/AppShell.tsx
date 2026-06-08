import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import OfflineBanner from './OfflineBanner';
import { usePersons } from '../../hooks/usePersons';
import { useTransactions } from '../../hooks/useTransactions';
import { useInterestRecords } from '../../hooks/useInterestRecords';

function DataLoader() {
  usePersons();
  useTransactions();
  useInterestRecords();
  return null;
}

export default function AppShell() {
  const { user, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading MoneyFlow…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <DataLoader />
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <SideNav />
        {/* Main content */}
        <div className="flex flex-1 flex-col lg:pl-64">
          <OfflineBanner />
          <main className="flex-1 pb-20 lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <BottomNav />
    </>
  );
}
