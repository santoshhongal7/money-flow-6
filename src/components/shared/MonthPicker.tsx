import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';

interface MonthPickerProps {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
  maxMonth?: string;
}

export default function MonthPicker({ value, onChange, maxMonth }: MonthPickerProps) {
  const date = parseISO(value + '-01');
  const max = maxMonth ? parseISO(maxMonth + '-01') : new Date();

  function prev() {
    onChange(format(subMonths(date, 1), 'yyyy-MM'));
  }

  function next() {
    const nextDate = addMonths(date, 1);
    if (nextDate <= max) onChange(format(nextDate, 'yyyy-MM'));
  }

  const canGoNext = addMonths(date, 1) <= max;

  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[120px] text-center text-sm font-semibold text-foreground">
        {format(date, 'MMMM yyyy')}
      </span>
      <button
        onClick={next}
        disabled={!canGoNext}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
