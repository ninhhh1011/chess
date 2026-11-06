import { useSyncExternalStore } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSyncStatus, subscribeSyncStatus } from '../services/syncService';

const SYNC_STATUS = {
  local_only: { label: 'Local only', color: 'text-slate-100/50', bg: 'bg-slate-950/40' },
  syncing: { label: 'Đang đồng bộ', color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
  synced: { label: 'Đã đồng bộ', color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
  conflict: { label: 'Cần xử lý xung đột', color: 'text-amber-300', bg: 'bg-amber-400/20' },
  error: { label: 'Lỗi đồng bộ', color: 'text-red-400', bg: 'bg-red-400/20' },
};

export default function SyncStatusBadge() {
  const { user } = useAuth();
  const currentStatus = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
  const status = user ? (SYNC_STATUS[currentStatus] || SYNC_STATUS.local_only) : SYNC_STATUS.local_only;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${status.bg} ${status.color}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status.label}
    </span>
  );
}
