import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PersonsPage from './pages/PersonsPage';
import PersonDetailPage from './pages/PersonDetailPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import SettlementPage from './pages/SettlementPage';
import StatementsPage from './pages/StatementsPage';
import SettingsPage from './pages/SettingsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'persons', element: <PersonsPage /> },
      { path: 'persons/:personId', element: <PersonDetailPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'transactions/:transactionId', element: <TransactionDetailPage /> },
      { path: 'transactions/:transactionId/settle', element: <SettlementPage /> },
      { path: 'statements', element: <StatementsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
