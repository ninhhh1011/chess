import { useChessGame } from '../../contexts/ChessGameContext';
import StatusBadge from '../StatusBadge';
import { getChessStatus, getTurnLabel } from '../../utils/chessStatus';

export default function GameStatusBanner() {
  const { activeGame, isBotThinking } = useChessGame();
  const status = getChessStatus(activeGame);
  const turnLabel = getTurnLabel(activeGame);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge label={status.label} tone={status.tone} />
      <StatusBadge label={isBotThinking ? 'Bot đang nghĩ...' : turnLabel} tone="muted" />
    </div>
  );
}
