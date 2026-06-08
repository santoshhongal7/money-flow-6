import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  className?: string;
}

export default function TopBar({ title, showBack, right, className }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className={cn('sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur', className)}>
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-foreground">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
