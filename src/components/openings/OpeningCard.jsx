import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';

const sideLabel = { white:'Cho Trắng', black:'Cho Đen', both:'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return <article className="rounded-xl border border-slate-800 bg-slate-800 p-6  transition hover:border-slate-600 hover:bg-slate-800/80 hover:border-emerald-500/40">
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase text-emerald-500">{sideLabel[opening.side]}</span>
      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-slate-300">{opening.level}</span>
    </div>
    <h2 className="mt-4 text-2xl font-bold">{opening.name}</h2>
    <p className="mt-1 font-bold text-emerald-500">{opening.vietnameseName}</p>
    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{opening.description}</p>
    <div className="mt-5"><OpeningProgress progress={progress} /></div>
    <Link to={`/openings/${opening.id}`} className="btn-primary mt-5 w-full">Vào lò luyện</Link>
  </article>;
}
