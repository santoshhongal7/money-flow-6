import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, ArrowLeftRight } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import PersonAvatar from '../components/shared/PersonAvatar';
import EmptyState from '../components/shared/EmptyState';
import PersonForm from '../components/persons/PersonForm';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import { usePersonsStore } from '../stores/personsStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useInterestStore } from '../stores/interestStore';
import { formatINR, formatDate } from '../lib/utils';
import { format } from 'date-fns';

export default function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'settled'>('active');

  const { persons } = usePersonsStore();
  const { transactions } = useTransactionsStore();
  const { records } = useInterestStore();

  const person = persons.find(p => p.id === personId);
  const personTxs = transactions.filter(t => t.personId === personId);
  const filtered = personTxs.filter(t => t.status === tab);

  if (!person) return <div className="p-8 text-center text-muted-foreground">Person not found</div>;

  const activeTxs = personTxs.filter(t => t.status === 'active');
  const totalBorrowed = activeTxs.filter(t => t.type === 'borrow').reduce((s, t) => s + t.currentPrincipal, 0);
  const totalLent = activeTxs.filter(t => t.type === 'lend').reduce((s, t) => s + t.currentPrincipal, 0);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const personRecords = records.filter(r => r.personId === personId && r.month === currentMonth);
  const interestOut = personRecords.filter(r => r.type === 'borrow').reduce((s, r) => s + r.interestAmount, 0);
  const interestIn = personRecords.filter(r => r.type === 'lend').reduce((s, r) => s + r.interestAmount, 0);

  return (
    <div>
      <TopBar
        title={person.name}
        showBack
        right={
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <Edit2 size={12} />Edit
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Person header */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <PersonAvatar name={person.name} size="lg" />
          <div>
            <h2 className="text-base font-semibold text-foreground">{person.name}</h2>
            {person.phone && <p className="text-sm text-muted-foreground">{person.phone}</p>}
            {person.email && <p className="text-sm text-muted-foreground">{person.email}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total Borrowed</p>
            <p className="text-lg font-bold text-red-500">{formatINR(totalBorrowed)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total Lent</p>
            <p className="text-lg font-bold text-green-600">{formatINR(totalLent)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Interest Out (this month)</p>
            <p className="text-lg font-bold text-amber-500">{formatINR(interestOut)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Interest In (this month)</p>
            <p className="text-lg font-bold text-teal-600">{formatINR(interestIn)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['active', 'settled'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={`No ${tab} transactions`}
            description={`No ${tab} borrows or lends with ${person.name}.`}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => (
              <div
                key={tx.id}
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tx.type === 'borrow' ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'}`}>
                    {tx.type === 'borrow' ? 'BORROW' : 'LEND'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'active' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50' : 'bg-muted text-muted-foreground'}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-foreground">{formatINR(tx.originalAmount)}</p>
                    <p className="text-xs text-muted-foreground">{tx.interestRate}%/month · Started {formatDate(tx.startDate)}</p>
                  </div>
                  {tx.currentPrincipal !== tx.originalAmount && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatINR(tx.currentPrincipal)}</p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddTxOpen(true)}
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg text-white hover:bg-primary/90 transition-colors lg:bottom-6"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <Plus size={24} />
      </button>

      <PersonForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
      />
      <AddTransactionModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultPersonId={personId}
      />
    </div>
  );
}
