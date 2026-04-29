import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setShowWelcome(false);
    }, 3600);

    return () => window.clearTimeout(timerId);
  }, []);

  return <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
    {showWelcome && <div className="fixed left-1/2 top-24 z-50 max-w-[90vw] -translate-x-1/2 animate-[notice-pop_3.6s_ease-in-out_forwards] rounded-[2rem] border border-gold/40 bg-ink/90 px-6 py-4 text-center text-lg font-black text-gold shadow-glow backdrop-blur-xl md:text-xl">
      ♔ Chào mừng đến với Vua Cờ của Ninh Chim Bé
    </div>}
    <section>
      <p className="mb-4 inline-flex rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-bold text-gold">Ứng dụng học cờ vua cho người mới</p>
      <h1 className="text-6xl font-black tracking-tight md:text-8xl">Vua Cờ</h1>
      <p className="mt-6 max-w-2xl text-xl leading-9 text-cream/75">Học cờ vua, luyện chiến thuật và chơi ngay trên trình duyệt.</p>
      <div className="mt-9 flex flex-wrap gap-4">
        <Link className="btn-primary" to="/learn">Bắt đầu học</Link>
        <Link className="btn-secondary" to="/play">Chơi ngay</Link>
        <Link className="btn-secondary" to="/exercises">Luyện bài tập</Link>
      </div>
      <p className="mt-8 max-w-3xl leading-8 text-cream/65">Vua Cờ giúp bạn nắm luật cơ bản, thực hành nước đi hợp lệ với chess.js và giải các bài chiến thuật ngắn. Không cần tài khoản, không cần backend — mở trình duyệt là học và chơi.</p>
    </section>
    <section className="relative rounded-[2.5rem] border border-white/10 bg-white/[.08] p-8 shadow-glow backdrop-blur">
      <div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-gold/30">
        {Array.from({length:64}).map((_,i)=><div key={i} className={`aspect-square ${(Math.floor(i/8)+i)%2 ? 'bg-board' : 'bg-cream'} grid place-items-center text-3xl text-ink`}>{[0,7,56,63].includes(i)?'♜':[27,28,35,36].includes(i)?'♞':''}</div>)}
      </div>
    </section>
  </div>;
}
