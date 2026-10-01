import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';
import { AppButton, AppCard, AppStatus } from '../../ui';

const sideLabel = { white: 'Cho Trắng', black: 'Cho Đen', both: 'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return (
    <AppCard className="flex flex-col justify-between p-5 hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-hover)]">
      <div>
        <div className="flex flex-wrap gap-2">
          <AppStatus variant="teal" size="sm">
            {sideLabel[opening.side]}
          </AppStatus>
          <AppStatus variant="basic" size="sm">
            {opening.level}
          </AppStatus>
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
    </AppCard>
  );
}
