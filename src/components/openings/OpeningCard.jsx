import { Link } from 'react-router-dom';
import OpeningProgress from './OpeningProgress';

const sideLabel = { white:'Cho Trắng', black:'Cho Đen', both:'Hai bên' };

export default function OpeningCard({ opening, progress }) {
  return <article className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-gold/40">
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-black uppercase text-gold">{sideLabel[opening.side]}</span>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-cream/70">{opening.level}</span>
    </div>
    <h2 className="mt-4 text-2xl font-black">{opening.name}</h2>
    <p className="mt-1 font-bold text-gold">{opening.vietnameseName}</p>
    <p className="mt-3 line-clamp-3 text-sm leading-6 text-cream/65">{opening.description}</p>
    <div className="mt-5"><OpeningProgress progress={progress} /></div>
    <Link to={`/openings/${opening.id}`} className="btn-primary mt-5 w-full">Học khai cuộc</Link>
  </article>;
}
