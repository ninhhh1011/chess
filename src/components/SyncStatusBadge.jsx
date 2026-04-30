import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSyncStatus, setSyncStatus } from '../services/syncService';

const SYNC_STATUS = {
  LOCAL_ONLY: { label: 'Local only', color: 'text-cream/50', bg: 'bg-ink/40' },
  SYNCING: { label: 'Đang đồng bộ', color: 'text-amber-400', bg: 'bg-amber-400/20' },
  SYNCED: { label: 'Đã đồng bộ', color: 'text-gold', bg: 'bg-gold/20' },
  ERROR: { label: 'Lỗi đồng bộ', color: 'text-red-400', bg: 'bg-red-400/20' },
};

export default function SyncStatusBadge() {
  const { user } = useAuth();
  const [status, setStatus] = useState(SYNC_STATUS.LOCAL_ONLY);

  useEffect(() => {
    if (!user) {
      setStatus(SYNC_STATUS.LOCAL_ONLY);
      return;
    }

    const current = getSyncStatus();
    setStatus(SYNC_STATUS[current] || SYNC_STATUS.LOCAL_ONLY);
  }, [user]);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${status.bg} ${status.color}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status.label}
    </span>
  );
}
