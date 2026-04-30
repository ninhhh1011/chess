import LevelBadge from './LevelBadge';

function StatCard({ label, value, helper }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[.08] p-5 backdrop-blur">
    <p className="text-sm font-black uppercase tracking-[0.2em] text-cream/45">{label}</p>
    <p className="mt-3 text-3xl font-black text-gold">{value}</p>
    {helper && <p className="mt-2 text-sm text-cream/55">{helper}</p>}
  </div>;
}

export default function TrainingOverview({ profile }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[.08] p-5 backdrop-blur">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-cream/45">Level hiện tại</p>
      <div className="mt-4"><LevelBadge level={profile.currentLevel} /></div>
    </div>
    <StatCard label="Ván đã chơi" value={profile.gamesPlayed} />
    <StatCard label="Bài học xong" value={profile.lessonsCompleted.length} />
    <StatCard label="Bài tập đã làm" value={profile.exerciseStats.total} />
    <StatCard label="Accuracy" value={`${profile.exerciseStats.accuracy}%`} helper={`${profile.exerciseStats.correct} đúng / ${profile.exerciseStats.wrong} sai`} />
  </div>;
}
