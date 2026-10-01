import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';
import { AppButton, AppCard, AppStatus } from '../../ui';

const sideLabel = { white: 'Cho Trắng', black: 'Cho Đen', both: 'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return (
    <AppCard className="flex flex-col justify-between p-5 hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-hover)]">
      <AppCard.Header className="p-0">
        <div className="flex flex-wrap gap-2">
          <AppStatus variant="teal" size="sm">
            {sideLabel[opening.side]}
          </AppStatus>
          <AppStatus variant="basic" size="sm">
            {opening.level}
          </AppStatus>
        </div>
        <AppCard.Title className="mt-3.5 text-xl font-bold text-[var(--app-foreground)]">{opening.name}</AppCard.Title>
        <p className="mt-0.5 text-sm font-semibold text-[var(--app-accent)]">{opening.vietnameseName}</p>
      </AppCard.Header>
      <AppCard.Content className="p-0 mt-2.5">
        <AppCard.Description className="line-clamp-3 text-xs leading-relaxed text-[var(--app-muted)]">{opening.description}</AppCard.Description>
      </AppCard.Content>
      <AppCard.Footer className="p-0 mt-5 flex-col items-stretch space-y-4">
        <OpeningProgress progress={progress} />
        <Link to={`/openings/${opening.id}`} className="block w-full">
          <AppButton variant="primary" className="w-full">
            Vào lò luyện
          </AppButton>
        </Link>
      </AppCard.Footer>
    </AppCard>
  );
}
