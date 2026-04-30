import { getLevelConfig } from '../../data/levelConfig';

export default function LevelBadge({ level }) {
  const config = getLevelConfig(level);
  return <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-black ${config.badgeClass}`}>
    {config.label}
  </span>;
}
