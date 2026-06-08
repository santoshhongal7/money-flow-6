import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  max?: string; // HTML date string YYYY-MM-DD
  min?: string;
}

export default function DatePicker({ value, onChange, label, max, min }: DatePickerProps) {
  return (
    <div className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <input
          type="date"
          value={value ? format(value, 'yyyy-MM-dd') : ''}
          max={max ?? format(new Date(), 'yyyy-MM-dd')}
          min={min}
          onChange={(e) => {
            if (e.target.value) onChange(new Date(e.target.value + 'T00:00:00'));
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <CalendarIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
