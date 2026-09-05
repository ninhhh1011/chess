import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';
import { AppButton } from '../../ui';

const sideLabel = { white: 'Cho Trắng', black: 'Cho Đen', both: 'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return (
    <article className="flex flex-col justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 transition-colors duration-150 hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-hover)]">
      <div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-[var(--app-accent-soft)] text-[var(--app-accent)] border border-[var(--app-accent)]/20">
            {sideLabel[opening.side]}
          </span>
          <span className="rounded px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider bg-[var(--app-surface-raised)] text-[var(--app-muted)] border border-[var(--app-border)]">
            {opening.level}
          </span>
        </div>
        <h2 className="mt-3.5 text-xl font-bold text-[var(--app-foreground)]">{opening.name}</h2>
        <p className="mt-0.5 text-sm font-semibold text-[var(--app-accent)]">{opening.vietnameseName}</p>
        <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[var(--app-muted)]">{opening.description}</p>
      </div>
      <div className="mt-5 space-y-4">
        <OpeningProgress progress={progress} />
        <Link to={`/openings/${opening.id}`} className="block">
          <AppButton variant="primary" className="w-full">
            Vào lò luyện
          </AppButton>
        </Link>
      </div>
    </article>
  );
}
