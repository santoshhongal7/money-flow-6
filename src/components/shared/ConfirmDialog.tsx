import { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  destructive?: boolean;
}

export default function ConfirmDialog({ title, description, onConfirm, children, destructive }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
            <p className="mb-6 text-sm text-muted-foreground">{description}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {loading ? 'Please wait…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
