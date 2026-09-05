export default function OpeningCoachPanel({ opening }) {
  return (
    <article className="rounded-lg border border-[var(--app-accent)]/20 bg-[var(--app-accent-soft)]/40 p-4 text-xs leading-relaxed text-[var(--app-foreground)]">
      <h2 className="text-sm font-semibold text-[var(--app-accent)]">Coach ghi chú</h2>
      <p className="mt-2 text-[var(--app-muted)]">
        Với {opening.vietnameseName}, đừng chỉ nhớ nước đi. Hãy nhớ ý tưởng: {opening.mainIdeas.slice(0, 2).join(', ')}.
      </p>
      <p className="mt-1.5 text-[var(--app-subtle)]">
        Nếu đi sai, quay lại Learn Mode và đọc giải thích từng nước trước khi luyện lại.
      </p>
    </article>
  );
}
