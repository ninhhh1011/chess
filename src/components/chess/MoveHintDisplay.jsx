import { useChessGame } from '../../contexts/ChessGameContext';

const PIECE_LABELS = {
  p: 'Tốt',
  n: 'Mã',
  b: 'Tượng',
  r: 'Xe',
  q: 'Hậu',
  k: 'Vua',
};

function getPieceLabel(piece) {
  if (!piece) return 'Quân';
  return `${PIECE_LABELS[piece.type] || 'Quân'} ${piece.color === 'w' ? 'trắng' : 'đen'}`;
}

export default function MoveHintDisplay({ engineMove }) {
  const { activeGame, selectedSquare, getLegalMoves } = useChessGame();

  const selectedPiece = selectedSquare ? activeGame.get(selectedSquare) : null;
  const selectedLegalMoves = selectedSquare ? getLegalMoves(selectedSquare) : [];

  if (engineMove) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-slate-100">
        <p>
          <b className="text-emerald-300">Gợi ý:</b> {engineMove.pieceLabel} từ{' '}
          <b className="text-emerald-300">{engineMove.from}</b> đến <b className="text-emerald-300">{engineMove.to}</b>
          {engineMove.san && <span className="text-slate-400"> ({engineMove.san})</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/65 px-4 py-3 text-sm text-slate-400">
      {selectedPiece ? (
        <span>
          Đang chọn <b className="text-emerald-300">{getPieceLabel(selectedPiece)}</b> ở{' '}
          <b className="text-emerald-300">{selectedSquare}</b>. Chọn ô sáng để di chuyển.
        </span>
      ) : (
        <span>Chọn quân để xem nước hợp lệ. Bật gợi ý để thấy nước tốt nhất.</span>
      )}
    </div>
  );
}
