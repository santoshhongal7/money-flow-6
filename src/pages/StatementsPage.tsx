import { useEffect, useState } from 'react';
import { CheckCircle, Circle, FileText, Loader2, Download } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import MonthPicker from '../components/shared/MonthPicker';
import EmptyState from '../components/shared/EmptyState';
import { useInterestRecords } from '../hooks/useInterestRecords';
import { usePersonsStore } from '../stores/personsStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { formatINR, formatMonth } from '../lib/utils';
import { generatePDFMonthlyStatement } from '../lib/pdf/monthlyStatement';
import { toast } from 'sonner';

export default function StatementsPage() {
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const { records, isGenerating, generateForAll, togglePaid } = useInterestRecords();
  const { persons } = usePersonsStore();
  const { transactions, repayments } = useTransactionsStore();
  const { profile, user } = useAuthStore();
  const [tab, setTab] = useState<'pay' | 'receive'>('pay');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    generateForAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const monthRecords = records.filter(r => r.month === selectedMonth);
  const toPayRecords = monthRecords.filter(r => r.type === 'borrow');
  const toReceiveRecords = monthRecords.filter(r => r.type === 'lend');
  const displayed = tab === 'pay' ? toPayRecords : toReceiveRecords;

  const totalOut = toPayRecords.reduce((s, r) => s + r.interestAmount, 0);
  const totalIn = toReceiveRecords.reduce((s, r) => s + r.interestAmount, 0);

  function getTransactionInfo(transactionId: string) {
    return transactions.find(t => t.id === transactionId);
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      await generatePDFMonthlyStatement({
        month: selectedMonth,
        records: monthRecords,
        persons,
        transactions,
        repayments,
        userName: profile?.displayName ?? 'User',
        userEmail: user?.email ?? undefined,
      });
      toast.success(`Statement downloaded for ${formatMonth(selectedMonth)}`);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  // Group displayed records by person
  const byPerson = displayed.reduce<Record<string, typeof displayed>>((acc, r) => {
    acc[r.personId] = acc[r.personId] ?? [];
    acc[r.personId].push(r);
    return acc;
  }, {});

  return (
    <div>
      <TopBar title="Statements" />

      <div className="px-4 py-4 space-y-4">
        {/* Month picker */}
        <div className="flex justify-center">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">To Pay</p>
            <p className="text-lg font-bold text-red-500">{formatINR(totalOut)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">To Receive</p>
            <p className="text-lg font-bold text-green-600">{formatINR(totalIn)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setTab('pay')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'pay' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            To Pay ({toPayRecords.length})
          </button>
          <button
            onClick={() => setTab('receive')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'receive' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            To Receive ({toReceiveRecords.length})
          </button>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Generating interest records…
          </div>
        )}

        {/* Records by person */}
        {Object.keys(byPerson).length === 0 && !isGenerating ? (
          <EmptyState
            icon={FileText}
            title="No records for this month"
            description="No active transactions or interest records for this period."
          />
        ) : (
          <div className="space-y-3">
            {Object.entries(byPerson).map(([personId, personRecords]) => {
              const person = persons.find(p => p.id === personId);
              const totalInterest = personRecords.reduce((s, r) => s + r.interestAmount, 0);
              return (
                <div key={personId} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{person?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{formatINR(totalInterest)} this month</p>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {personRecords.map(r => {
                      const tx = getTransactionInfo(r.transactionId);
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 px-4 py-3 ${r.isPaid ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                        >
                          <button
                            onClick={() => togglePaid(r.id, !r.isPaid)}
                            className={`shrink-0 transition-transform hover:scale-110 ${r.isPaid ? 'text-green-500' : 'text-muted-foreground'}`}
                          >
                            {r.isPaid ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-foreground">
                                {formatINR(r.principalAtMonth)}
                              </p>
                              <span className="text-xs text-muted-foreground">@ {tx?.interestRate}%</span>
                              {r.isProRated && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                  Pro-rated
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatINR(r.interestAmount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Download PDF button — always visible if there are any transactions or records */}
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {downloading
            ? <Loader2 size={16} className="animate-spin" />
            : <Download size={16} />}
          {downloading
            ? 'Generating PDF…'
            : `Download Statement — ${formatMonth(selectedMonth)}`}
        </button>
      </div>
    </div>
  );
}
