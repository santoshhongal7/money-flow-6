import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeftRight } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import EmptyState from '../components/shared/EmptyState';
import SkeletonCard from '../components/shared/SkeletonCard';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import PersonAvatar from '../components/shared/PersonAvatar';
import { useTransactionsStore } from '../stores/transactionsStore';
import { usePersonsStore } from '../stores/personsStore';
import { formatINR, formatDate } from '../lib/utils';

type TypeFilter = 'all' | 'borrow' | 'lend';
type StatusFilter = 'all' | 'active' | 'settled';

export default function TransactionsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const { transactions, isLoading } = useTransactionsStore();
  const { persons } = usePersonsStore();
  const navigate = useNavigate();

  const filtered = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  function getPersonName(personId: string) {
    return persons.find(p => p.id === personId)?.name ?? 'Unknown';
  }

  return (
    <div>
      <TopBar title="Transactions" />

      <div className="px-4 py-4 space-y-3">
        {/* Type filter */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'borrow', 'lend'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${typeFilter === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'settled'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonCard count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions"
            description="Add your first transaction to start tracking."
            action={
              <button onClick={() => setAddOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                Add Transaction
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const name = getPersonName(tx.personId);
              return (
                <div
                  key={tx.id}
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <PersonAvatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tx.type === 'borrow' ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'}`}>
                        {tx.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tx.interestRate}%/mo · {formatDate(tx.startDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.type === 'borrow' ? 'text-red-500' : 'text-green-600'}`}>
                      {formatINR(tx.currentPrincipal)}
                    </p>
                    <span className={`text-xs ${tx.status === 'settled' ? 'text-muted-foreground' : 'text-blue-500'}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
