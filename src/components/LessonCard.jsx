import { AppCard } from '@/ui/AppCard';

export default function LessonCard({ lesson, onClick }) {
  return (
    <AppCard
      isInteractive
      onClick={onClick}
      className="p-5 text-left hover:border-[var(--app-accent)]/50 hover:bg-[var(--app-surface-hover)] cursor-pointer group"
    >
      <AppCard.Header className="p-0">
        <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--app-surface)] border border-[var(--app-border)] text-xl text-[var(--app-accent)] transition-colors group-hover:bg-[var(--app-accent-soft)]">
          ♟
        </div>
        <AppCard.Title className="text-sm font-bold text-[var(--app-foreground)]">{lesson.title}</AppCard.Title>
      </AppCard.Header>
      <AppCard.Content className="p-0 mt-1.5">
        <AppCard.Description className="line-clamp-2 text-xs leading-relaxed text-[var(--app-muted)]">{lesson.content}</AppCard.Description>
      </AppCard.Content>
    </AppCard>
  );
}
