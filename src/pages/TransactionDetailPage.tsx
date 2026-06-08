import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Plus, CreditCard, FileText } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import { useTransactionsStore } from '../stores/transactionsStore';
import { usePersonsStore } from '../stores/personsStore';
import { useInterestStore } from '../stores/interestStore';
import { useAuthStore } from '../stores/authStore';
import { useTransactions } from '../hooks/useTransactions';
import { useInterestRecords } from '../hooks/useInterestRecords';
import { formatINR, formatDate, formatMonth } from '../lib/utils';
import { toast } from 'sonner';
import RepaymentForm from '../components/transactions/RepaymentForm';
import { generateMissingInterestRecords } from '../lib/interest/generator';

export default function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [repayOpen, setRepayOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { transactions, repayments } = useTransactionsStore();
  const { persons } = usePersonsStore();
  const { records } = useInterestStore();
  const { user } = useAuthStore();
  const { addRepayment } = useTransactions();
  const { togglePaid } = useInterestRecords();
  const interestStore = useInterestStore();

  const txMaybe = transactions.find(t => t.id === transactionId);
  if (!txMaybe) return <div className="p-8 text-center text-muted-foreground">Transaction not found</div>;
  const tx = txMaybe;

  const person = persons.find(p => p.id === tx.personId);
  const txRepayments = repayments.filter(r => r.transactionId === tx.id).sort((a, b) => a.date.getTime() - b.date.getTime());
  const txInterest = records.filter(r => r.transactionId === tx.id).sort((a, b) => a.month.localeCompare(b.month));

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    try {
      const existing = records.filter(r => r.transactionId === tx.id);
      const newRecords = await generateMissingInterestRecords(user.uid, tx, txRepayments, existing);
      if (newRecords.length > 0) {
        interestStore.addRecords(newRecords);
        toast.success(`Generated ${newRecords.length} interest record(s)`);
      } else {
        toast.info('All records are up to date');
      }
    } catch {
      toast.error('Failed to generate interest records');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <TopBar title="Transaction Details" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Summary card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-foreground">{person?.name ?? 'Unknown'}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tx.type === 'borrow' ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'}`}>
                {tx.type === 'borrow' ? 'BORROW' : 'LEND'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">{formatINR(tx.originalAmount)}</p>
              <p className="text-xs text-muted-foreground">original</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div><p className="text-xs text-muted-foreground">Current Principal</p><p className="text-sm font-semibold text-foreground">{formatINR(tx.currentPrincipal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Rate</p><p className="text-sm font-semibold text-foreground">{tx.interestRate}%/month</p></div>
            <div><p className="text-xs text-muted-foreground">Start Date</p><p className="text-sm font-semibold text-foreground">{formatDate(tx.startDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><p className={`text-sm font-semibold capitalize ${tx.status === 'active' ? 'text-blue-500' : 'text-muted-foreground'}`}>{tx.status}</p></div>
          </div>
          {tx.status === 'settled' && tx.settledDate && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Settled on {formatDate(tx.settledDate)} for {tx.settledAmount ? formatINR(tx.settledAmount) : 'N/A'}</p>
            </div>
          )}
        </div>

        {/* Repayments */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Repayments</h3>
            {tx.status === 'active' && (
              <button onClick={() => setRepayOpen(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus size={12} />Add
              </button>
            )}
          </div>
          {txRepayments.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No repayments yet</p>
          ) : (
            <div className="divide-y divide-border">
              {txRepayments.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatDate(r.date)}</p>
                    {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatINR(r.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interest records */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Interest Records</h3>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {txInterest.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No interest records. Click Generate.</p>
          ) : (
            <div className="divide-y divide-border">
              {txInterest.map(r => (
                <div key={r.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${r.isPaid ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                  <button
                    onClick={() => togglePaid(r.id, !r.isPaid)}
                    className={`shrink-0 transition-transform hover:scale-110 ${r.isPaid ? 'text-green-500' : 'text-muted-foreground'}`}
                  >
                    {r.isPaid ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{formatMonth(r.month)}</p>
                      {r.isProRated && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Pro-rated</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">Principal: {formatINR(r.principalAtMonth)}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatINR(r.interestAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {tx.status === 'active' && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/transactions/${tx.id}/settle`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <FileText size={16} />
              Settlement PDF
            </button>
            <button
              onClick={() => navigate(`/transactions/${tx.id}/settle`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              <CreditCard size={16} />
              Mark Settled
            </button>
          </div>
        )}
      </div>

      <RepaymentForm
        open={repayOpen}
        onClose={() => setRepayOpen(false)}
        transaction={tx}
        onSubmit={addRepayment}
      />
    </div>
  );
}
