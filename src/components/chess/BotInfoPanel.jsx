import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES } from '../../config/brand';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppSurface } from '@/ui/AppSurface';

const BOT_NAME = BRAND_NAMES.bot;

export default function BotInfoPanel() {
  const { gameMode, playerColor, botElo, GAME_MODES, PLAYER_COLORS } = useChessGame();

  if (gameMode !== GAME_MODES.BOT) return null;

  const selectedBotLevel = BOT_ELO_LEVELS.find((level) => level.elo === botElo) || BOT_ELO_LEVELS[2];
  const playerColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';
  const botColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'đen' : 'trắng';

  return (
    <AppSurface className="flex flex-wrap items-center justify-between gap-3 p-3 border border-[var(--app-border)]">
      <div className="flex min-w-0 items-center gap-3">
        <AppAvatar
          src={coachAvatar}
          alt={`Avatar ${BOT_NAME}`}
          size="lg"
          className="rounded-[8px] border border-[var(--app-accent)]/40"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">Đối thủ</p>
          <h2 className="mt-0.5 truncate text-base font-bold text-[var(--app-foreground)]">{BOT_NAME}</h2>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            Bạn {playerColorLabel}. Bot {botColorLabel}.
          </p>
        </div>
      </div>
      <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2 text-right">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-subtle)]">ELO đang đấu</p>
        <p className="text-xl font-bold text-[var(--app-accent)]">{selectedBotLevel.elo}</p>
        <p className="text-xs text-[var(--app-muted)]">{selectedBotLevel.description}</p>
      </div>
    </AppSurface>
  );
}
