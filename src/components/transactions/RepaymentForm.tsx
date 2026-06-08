import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Transaction, Repayment } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  onSubmit: (data: Omit<Repayment, 'id' | 'userId' | 'createdAt'>) => Promise<Repayment | undefined>;
}

export default function RepaymentForm({ open, onClose, transaction, onSubmit }: Props) {
  const schema = z.object({
    amount: z.coerce.number().positive().max(transaction.currentPrincipal, `Max ${transaction.currentPrincipal}`),
    date: z.string().min(1, 'Select a date'),
    notes: z.string().optional(),
  });
  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') },
  });

  async function onFormSubmit(data: FormData) {
    try {
      await onSubmit({
        transactionId: transaction.id,
        personId: transaction.personId,
        amount: data.amount,
        date: new Date(data.date + 'T00:00:00'),
        notes: data.notes,
      });
      toast.success('Repayment added');
      reset();
      onClose();
    } catch {
      toast.error('Failed to add repayment');
    }
  }

  if (!open) return null;

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="relative z-10 flex flex-col w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Repayment</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Principal info */}
        <div className="shrink-0 px-4 py-2 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Current principal:{' '}
            <span className="font-semibold text-foreground">
              ₹{transaction.currentPrincipal.toLocaleString('en-IN')}
            </span>
          </p>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Amount (₹)</label>
            <input
              {...register('amount')}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="2000"
              className={inputCls}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
            <input
              {...register('date')}
              type="date"
              max={format(new Date(), 'yyyy-MM-dd')}
              className={inputCls}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
            <input {...register('notes')} placeholder="Optional" className={inputCls} />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border px-4 py-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Add Repayment
          </button>
        </div>
      </form>
    </div>
  );
}
