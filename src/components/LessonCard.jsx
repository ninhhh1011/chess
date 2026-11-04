import { AppCard } from '@/ui/AppCard';

export default function LessonCard({ lesson, onClick }) {
  return (
    <AppCard
      isInteractive
      onClick={onClick}
      className="p-6 text-left hover:shadow-[var(--shadow-floating)] hover:border-[var(--app-border-strong)] cursor-pointer group rounded-[24px] bg-white border border-[var(--app-border)] space-y-3"
    >
      <AppCard.Header className="p-0">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--app-tertiary)]/60 text-xl text-[var(--app-secondary)] transition-colors group-hover:bg-[var(--app-tertiary)]">
          ♟
        </div>
        <AppCard.Title className="font-serif text-base sm:text-lg font-bold text-[#030302]">
          {lesson.title}
        </AppCard.Title>
      </AppCard.Header>
      <AppCard.Content className="p-0">
        <AppCard.Description className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-[var(--app-muted)]">
          {lesson.content}
        </AppCard.Description>
      </AppCard.Content>
    </AppCard>
  );
}
