import { cn } from '../../lib/utils';

interface StatusDotProps {
  status: 'paid' | 'unpaid' | 'active' | 'settled';
}

export default function StatusDot({ status }: StatusDotProps) {
  return (
    <span className={cn(
      'inline-block h-2 w-2 rounded-full',
      (status === 'paid' || status === 'settled') && 'bg-green-500',
      status === 'unpaid' && 'bg-red-500',
      status === 'active' && 'bg-blue-500',
    )} />
  );
}
