export default function LessonCard({ lesson, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 text-left shadow-xs transition-all duration-150 hover:border-[var(--app-accent)]/50 hover:bg-[var(--app-surface-hover)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
      style={{ borderRadius: '10px' }}
    >
      <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--app-surface)] border border-[var(--app-border)] text-xl text-[var(--app-accent)] transition-colors group-hover:bg-[var(--app-accent-soft)]">
        ♟
      </div>
      <h3 className="text-sm font-bold text-[var(--app-foreground)]">{lesson.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--app-muted)]">{lesson.content}</p>
    </button>
  );
}
