import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, FileText, Settings, LogOut, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/persons', icon: Users, label: 'Persons' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/statements', icon: FileText, label: 'Statements' },
];

export default function SideNav() {
  const { signOut, profile } = useAuthStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-border bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <TrendingUp size={22} className="text-primary" />
        <span className="text-lg font-semibold text-foreground">MoneyFlow</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: settings + signout */}
      <div className="border-t border-border p-4 space-y-1">
        <div className="mb-3 px-3 py-2">
          <p className="text-sm font-medium text-foreground truncate">{profile?.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
