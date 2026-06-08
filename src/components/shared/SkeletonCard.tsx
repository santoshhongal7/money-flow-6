interface SkeletonCardProps {
  count?: number;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function SkeletonCard({ count = 3 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </>
  );
}
