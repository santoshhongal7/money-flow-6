import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon size={32} className="text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
