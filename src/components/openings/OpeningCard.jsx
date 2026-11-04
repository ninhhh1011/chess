import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';
import { AppButton, AppCard, AppStatus } from '../../ui';

const sideLabel = { white: 'Cho Trắng', black: 'Cho Đen', both: 'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return (
    <AppCard className="flex flex-col justify-between p-7 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-floating)] hover:border-[var(--app-border-strong)] transition-all space-y-4">
      <AppCard.Header className="p-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <AppStatus variant="teal" size="sm">
            {sideLabel[opening.side]}
          </AppStatus>
          <AppStatus variant="basic" size="sm">
            {opening.level}
          </AppStatus>
        </div>
        <AppCard.Title className="font-serif text-2xl font-bold text-[#030302] pt-1">
          {opening.name}
        </AppCard.Title>
        <p className="text-sm font-medium text-[var(--app-secondary)]">{opening.vietnameseName}</p>
      </AppCard.Header>
      <AppCard.Content className="p-0">
        <AppCard.Description className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-[var(--app-muted)]">
          {opening.description}
        </AppCard.Description>
      </AppCard.Content>
      <AppCard.Footer className="p-0 pt-4 flex-col items-stretch space-y-4">
        <OpeningProgress progress={progress} />
        <Link to={`/openings/${opening.id}`} className="block w-full">
          <AppButton variant="primary" size="md" className="w-full">
            Vào lò luyện
          </AppButton>
        </Link>
      </AppCard.Footer>
    </AppCard>
  );
}
