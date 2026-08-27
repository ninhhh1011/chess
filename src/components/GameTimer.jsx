import { useGameTimer } from '../hooks/useGameTimer';

/**
 * GameTimer - Shows elapsed time since game started
 */
export default function GameTimer({ isPlaying }) {
  const { formatted, elapsed } = useGameTimer(isPlaying);

  if (elapsed < 5) return null; // Don't show for very short sessions

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-bg-surface px-3 py-1.5">
      <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm font-medium text-text-secondary">
        {formatted}
      </span>
    </div>
  );
}
