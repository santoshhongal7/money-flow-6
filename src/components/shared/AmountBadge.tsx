import { formatINR } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface AmountBadgeProps {
  amount: number;
  type?: 'borrow' | 'lend' | 'neutral';
  className?: string;
}

export default function AmountBadge({ amount, type = 'neutral', className }: AmountBadgeProps) {
  return (
    <span className={cn(
      'font-semibold',
      type === 'borrow' && 'text-red-500',
      type === 'lend' && 'text-green-600',
      type === 'neutral' && 'text-foreground',
      className
    )}>
      {formatINR(amount)}
    </span>
  );
}
