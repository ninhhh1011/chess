import { useState } from 'react';
import { getUserProfile } from '../../services/userProfileService';
import { AppDialog } from '@/ui/AppDialog';
import { AppButton } from '@/ui/AppButton';
import { AppStatus } from '@/ui/AppStatus';
import { History, Copy, Check, Eye, Swords, Calendar } from 'lucide-react';

export default function MatchHistoryModal({ isOpen, onOpenChange, onSelectGameForAnalysis }) {
  const profile = getUserProfile();
  const playedGames = profile?.playedGames || [];
  const [copiedId, setCopiedId] = useState(null);

  function copyGamePgn(game) {
    if (!game?.pgn) return;
    navigator.clipboard.writeText(game.pgn).then(() => {
      setCopiedId(game.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function formatDate(isoString) {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString || 'Gần đây';
    }
  }

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#030302]" />
          <span className="font-serif text-xl font-bold text-[#030302]">Lịch sử ván đấu</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--app-muted-surface)] text-[var(--app-muted)] border border-[var(--app-border)]">
            {playedGames.length} ván
          </span>
        </div>
      }
      description="Xem lại các ván cờ đã đấu với Bot, sao chép PGN hoặc đưa vào phòng phân tích."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {playedGames.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Swords className="h-8 w-8 mx-auto text-[var(--app-subtle)]" />
            <p className="text-sm font-medium text-[var(--app-muted)]">Chưa có ván đấu nào được lưu lại.</p>
            <p className="text-xs text-[var(--app-subtle)]">Hãy chơi một ván cờ với Bot để bắt đầu ghi lại lịch sử!</p>
          </div>
        ) : (
          playedGames.map((game, idx) => {
            const isWin = game.result === 'win';
            const isLose = game.result === 'lose';
            const isCopied = copiedId === game.id;

            return (
              <div
                key={game.id || idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[18px] bg-white border border-[var(--app-border)] hover:border-[var(--app-border-strong)] transition-all shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AppStatus
                      variant={isWin ? 'teal' : isLose ? 'danger' : 'basic'}
                      size="sm"
                    >
                      {isWin ? 'Thắng' : isLose ? 'Thua' : 'Hòa'}
                    </AppStatus>

                    <span className="text-xs font-bold text-[#030302]">
                      vs Ninh Bot (ELO {game.botElo || 1200})
                    </span>

                    <span className={`text-[11px] font-semibold px-2 py-0.2 rounded-full border ${
                      (game.eloDelta || 0) > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : (game.eloDelta || 0) < 0
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}>
                      {(game.eloDelta || 0) > 0 ? `+${game.eloDelta}` : game.eloDelta || 0} ELO
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[var(--app-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(game.playedAt)}
                    </span>
                    <span>·</span>
                    <span>{game.movesCount || 0} nước</span>
                    <span>·</span>
                    <span>Quân {game.playerColor === 'w' ? 'Trắng' : 'Đen'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {game.pgn && (
                    <AppButton
                      size="sm"
                      variant="outline"
                      onClick={() => copyGamePgn(game)}
                      leftIcon={isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      className="h-8 text-xs"
                    >
                      {isCopied ? 'Đã chép' : 'PGN'}
                    </AppButton>
                  )}

                  {onSelectGameForAnalysis && game.pgn && (
                    <AppButton
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectGameForAnalysis(game)}
                      leftIcon={<Eye className="h-3 w-3" />}
                      className="h-8 text-xs font-semibold"
                    >
                      Phân tích
                    </AppButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppDialog>
  );
}
