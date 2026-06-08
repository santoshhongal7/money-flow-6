import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <WifiOff size={16} />
      <span>You're offline. Changes will not be saved.</span>
    </div>
  );
}
