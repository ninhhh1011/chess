import { useMemo, useState } from 'react';
import OpeningCard from '../components/openings/OpeningCard';
import { openings } from '../data/openings';
import { getOpeningProgress } from '../services/openingProgressService';
import { BRAND_NAMES } from '../config/brand';
import { AppButton } from '../ui';

const filters = [
  { id: 'all', label: 'Tất cả' },
  { id: 'white', label: 'Cho Trắng' },
  { id: 'black', label: 'Cho Đen' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export default function Openings() {
  const [filter, setFilter] = useState('all');
  const progress = useMemo(() => getOpeningProgress(), []);
  const visible = openings.filter(o => filter === 'all' || o.side === filter || o.level === filter);

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--app-foreground)] md:text-4xl">
        {BRAND_NAMES.openingTrainer}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--app-muted)]">
        Học ý tưởng khai cuộc và luyện các nước đầu tiên cho chắc tay.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map(f => (
          <AppButton
            key={f.id}
            size="sm"
            variant={filter === f.id ? 'primary' : 'secondary'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </AppButton>
        ))}
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(opening => (
          <OpeningCard key={opening.id} opening={opening} progress={progress[opening.id]} />
        ))}
      </div>
    </section>
  );
}
