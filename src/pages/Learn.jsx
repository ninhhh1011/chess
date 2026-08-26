import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import LessonCard from '../components/LessonCard';
import { lessons } from '../data/lessons';
import { getUserProfile, markLessonCompleted } from '../services/userProfileService';

export default function Learn() {
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(() => getUserProfile());

  function completeLesson(lessonId) {
    setProfile(markLessonCompleted(lessonId));
  }

  if (selected) return <section>
    <button className="btn-secondary mb-6" onClick={() => setSelected(null)}>← Quay lại danh sách bài học</button>
    <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
      <article className="rounded-xl border border-border bg-bg-elevated p-8">
        <h1 className="text-4xl font-bold text-text-primary">{selected.title}</h1>
        <p className="mt-6 text-lg leading-9 text-text-secondary">{selected.content}</p>
        <h2 className="mt-8 text-2xl font-extrabold text-text-primary">Ví dụ minh họa</h2>
        <p className="mt-3 leading-8 text-text-secondary">{selected.example}</p>
        <button className="btn-primary mt-8" onClick={() => completeLesson(selected.id)}>
          {profile.lessonsCompleted.includes(selected.id) ? 'Đã học xong ✓' : 'Đánh dấu đã học xong'}
        </button>
      </article>
      <div className="mx-auto w-full max-w-[440px] rounded-xl border border-border bg-bg-elevated p-4 shadow-sm">
        <Chessboard options={{
          position: selected.fen,
          allowDragging: false,
          showNotation: true,
          darkSquareStyle: { backgroundColor: '#334155' },
          lightSquareStyle: { backgroundColor: '#94a3b8' },
        }} />
      </div>
    </div>
  </section>;
  return <section>
    <h1 className="text-4xl font-bold text-text-primary md:text-5xl">Học cờ</h1>
    <p className="mt-4 max-w-3xl text-text-secondary">Chọn một bài học ngắn, dễ hiểu để làm quen từng luật quan trọng của cờ vua.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{lessons.map(l => <LessonCard key={l.id} lesson={l} onClick={() => setSelected(l)} />)}</div>
  </section>;
}
