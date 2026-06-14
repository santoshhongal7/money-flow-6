import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Loader2 } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import { useTransactionsStore } from '../stores/transactionsStore';
import { usePersonsStore } from '../stores/personsStore';
import { useInterestStore } from '../stores/interestStore';
import { useAuthStore } from '../stores/authStore';
import { useTransactions } from '../hooks/useTransactions';
import { formatINR, formatDate, formatMonth } from '../lib/utils';
import { generatePDFFullSettlement } from '../lib/pdf/fullSettlement';
import { generateMissingInterestRecords } from '../lib/interest/generator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { SettlementStatement } from '../types';

export default function SettlementPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [settlementDate, setSettlementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [settling, setSettling] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { transactions, repayments } = useTransactionsStore();
  const { persons } = usePersonsStore();
  const { records } = useInterestStore();
  const { user, profile } = useAuthStore();
  const { editTransaction } = useTransactions();
  const interestStore = useInterestStore();

  const txMaybe = transactions.find(t => t.id === transactionId);
  if (!txMaybe) return <div className="p-8 text-center text-muted-foreground">Transaction not found</div>;
  const tx = txMaybe;

  const person = persons.find(p => p.id === tx.personId);
  const txRepayments = repayments.filter(r => r.transactionId === tx.id);
  const txInterest = records.filter(r => r.transactionId === tx.id).sort((a, b) => a.month.localeCompare(b.month));

  const totalInterestAccrued = txInterest.reduce((s, r) => s + r.interestAmount, 0);
  const totalInterestPaid = txInterest.filter(r => r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const totalInterestUnpaid = txInterest.filter(r => !r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const outstandingPrincipal = tx.currentPrincipal;
  const totalToSettle = outstandingPrincipal + totalInterestUnpaid;

  async function handleGenerateAll() {
    if (!user) return;
    setGenerating(true);
    try {
      const existing = records.filter(r => r.transactionId === tx.id);
      const clearing = new Date(settlementDate + 'T00:00:00');
      const newRecords = await generateMissingInterestRecords(user.uid, tx, txRepayments, existing, clearing);
      if (newRecords.length > 0) interestStore.addRecords(newRecords);
      toast.success('Records generated');
    } catch {
      toast.error('Failed to generate records');
    } finally {
      setGenerating(false);
    }
  }

  function buildStatement(): SettlementStatement {
    return {
      transaction: tx,
      person: person!,
      repayments: txRepayments,
      interestRecords: txInterest,
      outstandingPrincipal,
      totalInterestAccrued,
      totalInterestPaid,
      totalInterestUnpaid,
      totalAmountToSettle: totalToSettle,
      settlementDate: new Date(settlementDate + 'T00:00:00'),
    };
  }

  async function handleDownloadPDF() {
    if (!person) return;
    await generatePDFFullSettlement(buildStatement(), profile?.displayName ?? 'User');
  }

  async function handleSettle() {
    if (!user || !person) return;
    setSettling(true);
    try {
      const sDate = new Date(settlementDate + 'T00:00:00');
      await editTransaction(tx.id, {
        status: 'settled',
        settledDate: sDate,
        settledAmount: totalToSettle,
        notes,
      });
      toast.success('Transaction marked as settled');
      navigate(`/transactions/${tx.id}`);
    } catch {
      toast.error('Failed to settle transaction');
    } finally {
      setSettling(false);
    }
  }

  return (
    <div>
      <TopBar title="Full Settlement" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-bold text-foreground">{person?.name}</p>
              <p className="text-xs text-muted-foreground">{tx.type === 'borrow' ? 'Borrowed' : 'Lent'} {formatINR(tx.originalAmount)} @ {tx.interestRate}%/mo</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tx.type === 'borrow' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
              {tx.type.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Started: {formatDate(tx.startDate)}</p>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerateAll}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : null}
          {generating ? 'Generating…' : 'Generate All Interest Records Up To Today'}
        </button>

        {/* Interest table */}
        {txInterest.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Interest Records ({txInterest.length} months)</h3>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {txInterest.map(r => (
                <div key={r.id} className={`flex items-center justify-between px-4 py-2.5 ${r.isPaid ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatMonth(r.month)}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(r.principalAtMonth)} {r.isProRated ? '(Pro-rated)' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatINR(r.interestAmount)}</p>
                    <p className={`text-xs ${r.isPaid ? 'text-green-500' : 'text-red-500'}`}>{r.isPaid ? 'Paid' : 'Unpaid'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repayments */}
        {txRepayments.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Repayments</h3>
            </div>
            <div className="divide-y divide-border">
              {txRepayments.map(r => (
                <div key={r.id} className="flex justify-between px-4 py-2.5">
                  <p className="text-sm text-foreground">{formatDate(r.date)}</p>
                  <p className="text-sm font-semibold text-foreground">{formatINR(r.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">Settlement Summary</h3>
          {[
            ['Original Amount', formatINR(tx.originalAmount)],
            ['Total Principal Repaid', formatINR(tx.originalAmount - outstandingPrincipal)],
            ['Outstanding Principal', formatINR(outstandingPrincipal)],
            ['---', ''],
            ['Total Interest Accrued', formatINR(totalInterestAccrued)],
            ['Total Interest Paid', formatINR(totalInterestPaid)],
            ['Total Interest Unpaid', formatINR(totalInterestUnpaid)],
          ].map(([k, v]) => k === '---' ? (
            <div key="divider" className="border-t border-border my-2" />
          ) : (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-foreground">{v}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-base font-bold text-foreground">TOTAL TO SETTLE</span>
            <span className="text-base font-bold text-primary">{formatINR(totalToSettle)}</span>
          </div>
        </div>

        {/* Settlement date + notes */}
        {tx.status === 'active' && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Settlement Date</label>
              <input
                type="date"
                value={settlementDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setSettlementDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <FileText size={16} />
            Download PDF
          </button>
          {tx.status === 'active' && (
            <button
              onClick={handleSettle}
              disabled={settling}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {settling ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Mark Settled
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
