import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import LessonCard from '../components/LessonCard';
import { lessons } from '../data/lessons';

export default function Learn() {
  const [selected, setSelected] = useState(null);
  if (selected) return <section>
    <button className="btn-secondary mb-6" onClick={() => setSelected(null)}>← Quay lại danh sách bài học</button>
    <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
      <article className="rounded-[2rem] border border-white/10 bg-white/[.08] p-8 backdrop-blur">
        <h1 className="text-4xl font-black">{selected.title}</h1>
        <p className="mt-6 text-lg leading-9 text-cream/75">{selected.content}</p>
        <h2 className="mt-8 text-2xl font-extrabold">Ví dụ minh họa</h2>
        <p className="mt-3 leading-8 text-cream/70">{selected.example}</p>
      </article>
      <div className="mx-auto w-full max-w-[440px] rounded-[2rem] border border-white/10 bg-white/[.08] p-4 shadow-glow backdrop-blur">
        <Chessboard options={{
          position: selected.fen,
          allowDragging: false,
          darkSquareStyle: { backgroundColor: '#8a5a32' },
          lightSquareStyle: { backgroundColor: '#f4ddb5' },
        }} />
      </div>
    </div>
  </section>;
  return <section>
    <h1 className="text-4xl font-black md:text-5xl">Học cờ</h1>
    <p className="mt-4 max-w-3xl text-cream/70">Chọn một bài học ngắn, dễ hiểu để làm quen từng luật quan trọng của cờ vua.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{lessons.map(l => <LessonCard key={l.id} lesson={l} onClick={() => setSelected(l)} />)}</div>
  </section>;
}
