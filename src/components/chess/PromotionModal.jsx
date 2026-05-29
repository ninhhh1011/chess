import { useChessGame } from '../../contexts/ChessGameContext';

const PIECE_LABELS = {
  q: 'Hậu',
  r: 'Xe',
  b: 'Tượng',
  n: 'Mã',
};

const PIECE_SYMBOLS = {
  q: '♕',
  r: '♖',
  b: '♗',
  n: '♘',
};

export default function PromotionModal() {
  const { pendingPromotion, setPendingPromotion, makeMove } = useChessGame();

  if (!pendingPromotion) return null;

  const { from, to, color } = pendingPromotion;
  const pieces = ['q', 'r', 'b', 'n'];

  function handleSelect(piece) {
    makeMove(from, to, piece);
    setPendingPromotion(null);
  }

  function handleCancel() {
    setPendingPromotion(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="max-w-sm rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-6 shadow-glow">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-black text-emerald-300">Phong cấp</h2>
          <p className="mt-2 text-sm text-slate-300">Chọn quân để phong cấp tốt</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {pieces.map((piece) => (
            <button
              key={piece}
              onClick={() => handleSelect(piece)}
              className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-emerald-400/60 hover:bg-slate-700"
            >
              <div className="text-center">
                <div className="mb-2 text-6xl">{PIECE_SYMBOLS[piece]}</div>
                <p className="text-sm font-bold text-slate-200">{PIECE_LABELS[piece]}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCancel}
          className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-emerald-400/60 hover:bg-slate-700"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
