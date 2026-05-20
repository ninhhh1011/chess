import { useChessGame } from '../../contexts/ChessGameContext';

export default function GameControls() {
  const { newGame, undoMove } = useChessGame();

  return (
    <div className="grid grid-cols-2 gap-3">
      <button className="btn-primary w-full justify-center" onClick={newGame}>
        Ván mới
      </button>
      <button className="btn-secondary w-full justify-center" onClick={undoMove}>
        Hoàn tác
      </button>
    </div>
  );
}
