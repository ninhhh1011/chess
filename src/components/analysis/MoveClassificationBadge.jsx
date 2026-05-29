const styles = {
  good: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
  best: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
  inaccuracy: 'bg-yellow-400/15 text-yellow-100 border-yellow-300/30',
  mistake: 'bg-orange-400/15 text-orange-100 border-orange-300/30',
  blunder: 'bg-rose-400/15 text-rose-100 border-rose-300/30',
};

export default function MoveClassificationBadge({ type = 'good', label }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${styles[type] || styles.good}`}>{label || type}</span>;
}
