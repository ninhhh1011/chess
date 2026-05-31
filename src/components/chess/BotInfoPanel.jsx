import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES } from '../../config/brand';

const BOT_NAME = BRAND_NAMES.bot;

export default function BotInfoPanel() {
  const { gameMode, playerColor, botElo, GAME_MODES, PLAYER_COLORS } = useChessGame();

  if (gameMode !== GAME_MODES.BOT) return null;

  const selectedBotLevel = BOT_ELO_LEVELS.find((level) => level.elo === botElo) || BOT_ELO_LEVELS[2];
  const playerColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';
  const botColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'đen' : 'trắng';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={coachAvatar}
          alt={`Avatar ${BOT_NAME}`}
          className="h-12 w-12 flex-none rounded-xl border border-emerald-400/40 object-cover shadow-sm"
        />
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-emerald-400/70">Đối thủ</p>
          <h2 className="mt-0.5 truncate text-lg font-bold text-slate-50">{BOT_NAME}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            Bạn {playerColorLabel}. Bot {botColorLabel}.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-right">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">ELO đang đấu</p>
        <p className="text-2xl font-bold text-emerald-300">{selectedBotLevel.elo}</p>
        <p className="text-sm font-bold text-slate-400">{selectedBotLevel.description}</p>
      </div>
    </div>
  );
}
