import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, TrendingDown, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useTransactionsStore } from '../stores/transactionsStore';
import { usePersonsStore } from '../stores/personsStore';
import { formatINR, formatDate } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PersonAvatar from '../components/shared/PersonAvatar';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
}

function StatCard({ label, value, icon, colorClass }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const stats = useDashboardStats();
  const { transactions } = useTransactionsStore();
  const { persons } = usePersonsStore();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  const recent = transactions.slice(0, 5);

  function getPersonName(personId: string) {
    return persons.find(p => p.id === personId)?.name ?? 'Unknown';
  }

  return (
    <div>
      <TopBar
        title="Dashboard"
        right={
          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white text-sm font-semibold cursor-pointer" onClick={() => navigate('/settings')}>
            {persons.length > 0 ? persons[0].name[0] : 'U'}
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Overdue alert */}
        {stats.overdueCount > 0 && (
          <div
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 cursor-pointer"
            onClick={() => navigate('/statements')}
          >
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-semibold">{stats.overdueCount} unpaid interest months</span> — View Statements →
            </p>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Borrowed"
            value={formatINR(stats.totalBorrowed)}
            icon={<TrendingDown size={16} className="text-red-500" />}
            colorClass="bg-red-100 dark:bg-red-950/50"
          />
          <StatCard
            label="Total Lent"
            value={formatINR(stats.totalLent)}
            icon={<TrendingUp size={16} className="text-green-600" />}
            colorClass="bg-green-100 dark:bg-green-950/50"
          />
          <StatCard
            label="Interest Out (this month)"
            value={formatINR(stats.monthlyInterestOut)}
            icon={<ArrowUpRight size={16} className="text-amber-500" />}
            colorClass="bg-amber-100 dark:bg-amber-950/50"
          />
          <StatCard
            label="Interest In (this month)"
            value={formatINR(stats.monthlyInterestIn)}
            icon={<ArrowDownLeft size={16} className="text-teal-600" />}
            colorClass="bg-teal-100 dark:bg-teal-950/50"
          />
        </div>

        {/* Trend chart */}
        {stats.trendData.some(d => d.interestIn > 0 || d.interestOut > 0) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">6-Month Interest Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={stats.trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={45} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="interestOut" stroke="#f59e0b" strokeWidth={2} dot={false} name="Interest Out" />
                <Line type="monotone" dataKey="interestIn" stroke="#0d9488" strokeWidth={2} dot={false} name="Interest In" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent activity */}
        {recent.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
              <button onClick={() => navigate('/transactions')} className="text-xs text-primary hover:underline">See all</button>
            </div>
            <div className="divide-y divide-border">
              {recent.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <PersonAvatar name={getPersonName(tx.personId)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{getPersonName(tx.personId)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.startDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'borrow' ? 'text-red-500' : 'text-green-600'}`}>
                      {formatINR(tx.originalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg text-white hover:bg-primary/90 transition-colors lg:bottom-6"
      >
        <Plus size={24} />
      </button>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
