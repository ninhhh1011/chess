import { useMemo, useState } from 'react';
import OpeningCard from '../components/openings/OpeningCard';
import { openings } from '../data/openings';
import { getOpeningProgress } from '../services/openingProgressService';

const filters = [
  { id:'all', label:'Tất cả' }, { id:'white', label:'Cho Trắng' }, { id:'black', label:'Cho Đen' },
  { id:'beginner', label:'Beginner' }, { id:'intermediate', label:'Intermediate' }, { id:'advanced', label:'Advanced' },
];

export default function Openings(){
  const [filter,setFilter] = useState('all');
  const progress = useMemo(() => getOpeningProgress(), []);
  const visible = openings.filter(o => filter === 'all' || o.side === filter || o.level === filter);
  return <section>
    <h1 className="text-4xl font-black md:text-5xl">Luyện khai cuộc</h1>
    <p className="mt-4 max-w-3xl text-cream/70">Học ý tưởng khai cuộc và luyện các nước đi đầu tiên.</p>
    <div className="mt-6 flex flex-wrap gap-2">{filters.map(f=><button key={f.id} className={filter===f.id?'btn-primary':'btn-secondary'} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map(opening => <OpeningCard key={opening.id} opening={opening} progress={progress[opening.id]} />)}</div>
  </section>;
}
