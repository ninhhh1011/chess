import { useMemo, useState } from 'react';
import OpeningCard from '../components/openings/OpeningCard';
import { openings } from '../data/openings';
import { getOpeningProgress } from '../services/openingProgressService';
import { BRAND_NAMES } from '../config/brand';
import { AppTabs } from '@/ui/AppTabs';

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
    <section className="mx-auto max-w-6xl space-y-8 py-2 sm:py-4">
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-widest font-semibold text-[var(--app-secondary)]">Kho tàng</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#030302]">
          {BRAND_NAMES.openingTrainer}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--app-muted)] max-w-xl leading-relaxed">
          Nắm bắt ý tưởng chiến lược và luyện tập các nước đi chuẩn xác đầu tiên cho từng thế cờ.
        </p>
      </div>

      <div>
        <AppTabs
          tabs={filters}
          selectedId={filter}
          onSelectionChange={(id) => setFilter(id)}
          variant="pill"
          ariaLabel="Lọc danh sách khai cuộc"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {visible.map(opening => (
          <OpeningCard key={opening.id} opening={opening} progress={progress[opening.id]} />
        ))}
      </div>
    </section>
  );
}
