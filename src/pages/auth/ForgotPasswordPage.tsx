import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { humanizeFirebaseError } from '../../lib/utils';
import { toast } from 'sonner';
import { TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await sendPasswordResetEmail(auth, data.email);
      setSent(true);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      toast.error(humanizeFirebaseError(code));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <TrendingUp size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground">We'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <h2 className="font-semibold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">Password reset instructions have been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Send Reset Link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
