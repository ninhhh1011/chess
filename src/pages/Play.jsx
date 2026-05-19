import ChessGameBoard from '../components/ChessGameBoard';

export default function Play() {
  return (
    <section>
      <div className="mb-5 rounded-2xl border border-slate-700/80 bg-slate-800/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,.32)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400/75">Vua Cờ</p>
        <h1 className="mt-2 text-3xl font-black text-slate-50 md:text-4xl">Chơi cờ</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Mặc định là đấu với ninh lốp trưởng. Chọn màu quân, xem nước hợp lệ trên bàn và dùng panel phải để phân tích nhanh.
        </p>
      </div>
      <ChessGameBoard />
    </section>
  );
}
