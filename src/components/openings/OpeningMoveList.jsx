export default function OpeningMoveList({ moves, currentIndex }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] p-3">
      {moves.map((move, index) => (
        <div
          key={`${move.san}-${index}`}
          className={`mb-2 rounded-md px-3 py-2 text-xs transition-colors ${
            index === currentIndex
              ? 'bg-[var(--app-accent-soft)] border border-[var(--app-accent)]/30 text-[var(--app-accent-hover)] font-semibold'
              : 'bg-[var(--app-surface)] text-[var(--app-muted)]'
          }`}
        >
          <div className="font-mono text-xs text-[var(--app-foreground)]">
            {index + 1}. {move.san}
          </div>
          <p className="mt-1 text-[11px] text-[var(--app-subtle)]">{move.explanation}</p>
        </div>
      ))}
    </div>
  );
}
