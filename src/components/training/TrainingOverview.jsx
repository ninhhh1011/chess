import LevelBadge from './LevelBadge';

function StatCard({ label, value, helper }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-800 p-5 ">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-bold text-emerald-500">{value}</p>
    {helper && <p className="mt-2 text-sm text-slate-400">{helper}</p>}
  </div>;
}

export default function TrainingOverview({ profile }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <div className="rounded-xl border border-slate-800 bg-slate-800 p-5 ">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Level hiện tại</p>
      <div className="mt-4"><LevelBadge level={profile.currentLevel} /></div>
    </div>
    <StatCard label="Ván đã chơi" value={profile.gamesPlayed} />
    <StatCard label="Bài học xong" value={profile.lessonsCompleted.length} />
    <StatCard label="Bài tập đã làm" value={profile.exerciseStats.total} />
    <StatCard label="Accuracy" value={`${profile.exerciseStats.accuracy}%`} helper={`${profile.exerciseStats.correct} đúng / ${profile.exerciseStats.wrong} sai`} />
  </div>;
}
