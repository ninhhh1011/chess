import { useChessGame } from '../../contexts/ChessGameContext';

export default function CheckWarning() {
  const { activeGame, isCheck } = useChessGame();

  if (!isCheck) return null;

  const checkedColorLabel = activeGame.turn() === 'w' ? 'trắng' : 'đen';

  return (
    <div className="mx-auto w-full rounded-xl border border-red-500/45 bg-red-950/35 px-4 py-3 text-sm font-bold text-red-100">
      Vua {checkedColorLabel} đang bị chiếu. Phải cứu vua trước, các nước khác sẽ không hợp lệ.
    </div>
  );
}
