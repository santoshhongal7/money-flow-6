import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransactions } from '../../hooks/useTransactions';
import { usePersonsStore } from '../../stores/personsStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const schema = z.object({
  personId: z.string().min(1, 'Select a person'),
  type: z.enum(['borrow', 'lend']),
  originalAmount: z.coerce.number().positive('Amount must be > 0'),
  interestRate: z.coerce.number().positive('Rate must be > 0').max(100),
  startDate: z.string().min(1, 'Select a start date'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPersonId?: string;
}

export default function AddTransactionModal({ open, onClose, defaultPersonId }: Props) {
  const { persons } = usePersonsStore();
  const { addTransaction } = useTransactions();
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      type: 'borrow',
      personId: defaultPersonId ?? '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const type = watch('type');

  async function onSubmit(data: FormData) {
    if (!user) return;
    try {
      const startDate = new Date(data.startDate + 'T00:00:00');
      await addTransaction({
        personId: data.personId,
        type: data.type,
        originalAmount: data.originalAmount,
        currentPrincipal: data.originalAmount,
        interestRate: data.interestRate,
        startDate,
        status: 'active',
        notes: data.notes,
      });
      toast.success('Transaction added');
      reset();
      onClose();
    } catch (e) {
      toast.error('Failed to add transaction');
    }
  }

  if (!open) return null;

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Transaction</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          {/* Type toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['borrow', 'lend'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'borrow' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t === 'borrow' ? 'Borrow' : 'Lend'}
                </button>
              ))}
            </div>
          </div>

          {/* Person */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Person</label>
            <select {...register('personId')} className={inputCls}>
              <option value="">Select person…</option>
              {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.personId && <p className="mt-1 text-xs text-red-500">{errors.personId.message}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Amount (₹)</label>
            <input {...register('originalAmount')} type="number" step="0.01" placeholder="10000" className={inputCls} />
            {errors.originalAmount && <p className="mt-1 text-xs text-red-500">{errors.originalAmount.message}</p>}
          </div>

          {/* Rate */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Interest Rate (%/month)</label>
            <input {...register('interestRate')} type="number" step="0.01" placeholder="2" className={inputCls} />
            {errors.interestRate && <p className="mt-1 text-xs text-red-500">{errors.interestRate.message}</p>}
          </div>

          {/* Start Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Start Date</label>
            <input {...register('startDate')} type="date" max={format(new Date(), 'yyyy-MM-dd')} className={inputCls} />
            {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea {...register('notes')} rows={2} placeholder="Any notes…" className={inputCls + ' resize-none'} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
