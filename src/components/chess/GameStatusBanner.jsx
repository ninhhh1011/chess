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
      <StatusBadge
        label={turnLabel}
        tone="muted"
        extra={isBotThinking ? <BotThinkingDot /> : null}
      />
    </div>
  );
}

function BotThinkingDot() {
  return (
    <span
      className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400"
      title="Bot đang tính..."
    />
  );
}
