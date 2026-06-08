import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersons } from '../../hooks/usePersons';
import { X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Person } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  person?: Person | null;
  onDelete?: () => void | Promise<void>;
}

export default function PersonForm({ open, onClose, person, onDelete }: Props) {
  const { addPerson, editPerson } = usePersons();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (person) {
      reset({ name: person.name, phone: person.phone ?? '', email: person.email ?? '', notes: person.notes ?? '' });
    } else {
      reset({ name: '', phone: '', email: '', notes: '' });
    }
  }, [person, reset]);

  async function onSubmit(data: FormData) {
    try {
      const cleaned = {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
      };
      if (person) {
        await editPerson(person.id, cleaned);
        toast.success('Person updated');
      } else {
        await addPerson(cleaned);
        toast.success('Person added');
      }
      onClose();
    } catch {
      toast.error('Failed to save person');
    }
  }

  if (!open) return null;

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-base font-semibold text-foreground">{person ? 'Edit Person' : 'Add Person'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
            <input {...register('name')} placeholder="Ramesh Kumar" className={inputCls} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
            <input {...register('phone')} placeholder="9876543210" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input {...register('email')} type="email" placeholder="ramesh@example.com" className={inputCls} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any notes…" className={inputCls + ' resize-none'} />
          </div>

          <div className="flex gap-3">
            {person && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {person ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
