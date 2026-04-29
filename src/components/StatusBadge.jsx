export default function StatusBadge({ label, tone = 'success' }) {
  const tones = {
    success: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/25',
    warning: 'bg-amber-400/15 text-amber-100 ring-amber-300/30',
    danger: 'bg-rose-500/15 text-rose-100 ring-rose-300/30',
    muted: 'bg-slate-300/15 text-slate-100 ring-white/20',
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${tones[tone]}`}>{label}</span>;
}
