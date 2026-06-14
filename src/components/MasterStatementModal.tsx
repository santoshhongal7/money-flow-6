import { useState } from 'react';
import { X, FileText, Loader2, Calendar } from 'lucide-react';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { usePersonsStore } from '../stores/personsStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useInterestStore } from '../stores/interestStore';
import { useAuthStore } from '../stores/authStore';
import { generatePDFMasterStatement } from '../lib/pdf/masterStatement';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

type QuickRange = 'current-year' | 'last-year' | 'custom';

const today = new Date();

function getRange(q: QuickRange): { from: string; to: string } {
  if (q === 'current-year') {
    return {
      from: format(startOfYear(today), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    };
  }
  if (q === 'last-year') {
    const ly = subYears(today, 1);
    return {
      from: format(startOfYear(ly), 'yyyy-MM-dd'),
      to: format(endOfYear(ly), 'yyyy-MM-dd'),
    };
  }
  return {
    from: format(startOfYear(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
}

export default function MasterStatementModal({ open, onClose }: Props) {
  const [quickRange, setQuickRange] = useState<QuickRange>('current-year');
  const [customFrom, setCustomFrom] = useState(format(startOfYear(today), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(today, 'yyyy-MM-dd'));
  const [generating, setGenerating] = useState(false);

  const { persons } = usePersonsStore();
  const { transactions, repayments } = useTransactionsStore();
  const { records } = useInterestStore();
  const { profile } = useAuthStore();

  if (!open) return null;

  const resolved = quickRange === 'custom'
    ? { from: customFrom, to: customTo }
    : getRange(quickRange);

  async function handleGenerate() {
    const fromDate = new Date(resolved.from + 'T00:00:00');
    const toDate = new Date(resolved.to + 'T23:59:59');

    if (fromDate > toDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setGenerating(true);
    try {
      await generatePDFMasterStatement({
        fromDate,
        toDate,
        persons,
        transactions,
        repayments,
        interestRecords: records,
        userName: profile?.displayName ?? 'User',
        userEmail: profile?.email,
      });
      toast.success('Master Statement downloaded');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate statement');
    } finally {
      setGenerating(false);
    }
  }

  const quickOptions: { value: QuickRange; label: string; sub: string }[] = [
    { value: 'current-year', label: `Current Year (${today.getFullYear()})`, sub: `Jan 1 – ${format(today, 'dd MMM yyyy')}` },
    { value: 'last-year', label: `Last Year (${today.getFullYear() - 1})`, sub: `Jan 1 – Dec 31, ${today.getFullYear() - 1}` },
    { value: 'custom', label: 'Custom Range', sub: 'Pick start and end dates' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-background border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Master Statement</p>
              <p className="text-xs text-muted-foreground">Full summary of all transactions</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Quick range selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Select Period</p>
            <div className="space-y-2">
              {quickOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQuickRange(opt.value)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    quickRange === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${quickRange === opt.value ? 'text-primary' : 'text-foreground'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                    quickRange === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Custom date pickers */}
          {quickRange === 'custom' && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Custom Date Range</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={format(today, 'yyyy-MM-dd')}
                    onChange={e => setCustomTo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* What's included note */}
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Includes <span className="font-medium text-foreground">all transactions</span> active during the period,
              month-by-month interest records, repayment history, and a chronological activity log —
              with individual sections per person.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText size={15} />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}