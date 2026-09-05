import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { getSanFromUci } from '../../utils/chessMoveUtils';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

import ChessBoardPanel from './ChessBoardPanel';
import GameInfoBar from './GameInfoBar';
import PlayerBar from './PlayerBar';
import LiveEvaluationBar from './LiveEvaluationBar';
import MoveHintDisplay from './MoveHintDisplay';
import StartNotice from './StartNotice';
import PromotionModal from './PromotionModal';
import MoveHistory from './MoveHistory';
import BotSettings from './BotSettings';
import GameControls from './GameControls';
import PreGameLobby from './PreGameLobby';
import PostGameReview from './PostGameReview';
import ReviewNavigator from './ReviewNavigator';
import EngineAnalysisPanel from '../analysis/EngineAnalysisPanel';
import AICoachPanel from '../AICoachPanel';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES } from '../../config/brand';
import { AppPopover } from '@/ui/AppPopover';
import { AppTabs } from '@/ui/AppTabs';
import { Settings, History, Activity, Sparkles } from 'lucide-react';

/**
 * GameLayout - Option C layout
 *
 * Board is the visual centerpiece (~65% desktop width).
 * Sidebar has exactly 3 main tabs:
 * 1. Ván đấu (moves)
 * 2. Phân tích (analysis)
 * 3. Huấn luyện (coach)
 * Settings is cleanly tucked into an AppPopover.
 */
export default function GameLayout({
  liveAnalysis,
  liveEvalStatus,
  engineHint,
  setEngineHint,
  autoAnalyze,
  setAutoAnalyze,
  autoComment,
  review,
  isReviewing,
  reviewGameWithEngine,
  engineMove,
  showStartNotice,
  onRequestHint,
}) {
  const { currentFen, currentPgn, moveHistory, activeGame, isGameOver, isCheck, botElo, playState, resignGame } = useChessGame();
  const [activeTab, setActiveTab] = useState('moves');
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onHint: () => { setActiveTab('coach'); },
    onResign: () => setShowResignConfirm(true),
  });

  // Board keyboard navigation
  useKeyboardNavigation();

  const tabs = [
    { id: 'moves', label: 'Ván đấu', icon: <History className="h-3.5 w-3.5" /> },
    { id: 'analysis', label: 'Phân tích', icon: <Activity className="h-3.5 w-3.5" /> },
    { id: 'coach', label: 'Huấn luyện', icon: <Sparkles className="h-3.5 w-3.5 text-[var(--app-accent)]" /> },
  ];

  return (
    <>
      {/* Pre-Game Lobby */}
      {playState === 'lobby' && <PreGameLobby />}

      {/* Main Game Layout */}
      {playState !== 'lobby' && (
        <div className="relative">
          {/* Post-Game Review Modal */}
          {playState === 'review' && <PostGameReview />}

          {/* Resign Confirmation Modal */}
          {showResignConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl space-y-4">
                <h2 className="text-base font-bold text-[var(--app-foreground)]">Xác nhận đầu hàng?</h2>
                <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                  Bạn sẽ kết thúc ván cờ này với kết quả thua. Bạn có chắc không?
                </p>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--app-muted)] hover:text-[var(--app-foreground)] transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      resignGame();
                      setShowResignConfirm(false);
                    }}
                    className="rounded-[8px] bg-[var(--app-danger)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Đầu hàng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
          {showStartNotice && playState === 'playing' && <StartNotice />}
          <PromotionModal />

          {/* Main Layout Grid: Desktop board ~65%, sidebar ~340px */}
          <div className="mx-auto grid w-full max-w-[1340px] gap-3 py-2 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">

            {/* LEFT COLUMN: Board Area */}
            <section className="min-w-0 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 sm:p-3 space-y-2">
              {/* Game status bar */}
              <GameInfoBar botElo={botElo} />

              {/* Opponent strip - above board */}
              <PlayerBar position="top" />

              {/* Board with evaluation bar */}
              <div className="flex items-start justify-center gap-2 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)]/40 p-2 sm:p-3">
                <LiveEvaluationBar
                  analysis={liveAnalysis}
                  status={liveEvalStatus}
                  hidden={playState === 'playing' && !isReviewing}
                />
                <div className="flex min-w-0 flex-1 justify-center">
                  <ChessBoardPanel engineHint={engineHint} />
                </div>
              </div>

              {/* Player strip - below board */}
              <PlayerBar position="bottom" />

              {/* Move hint */}
              {engineMove && (
                <div className="mt-1">
                  <MoveHintDisplay engineMove={engineMove} />
                </div>
              )}
            </section>

            {/* RIGHT COLUMN: Sidebar (3 tabs + settings popover) */}
            <aside className="flex w-full flex-col gap-2.5 lg:sticky lg:top-20 lg:self-start">
              {/* Controls */}
              <GameControls
                onHint={() => { setActiveTab('coach'); }}
                requestHint={onRequestHint}
              />
              <ReviewNavigator />

              {/* Tab Box */}
              <div className="overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
                {/* Tab Header with 3 main tabs + settings popover */}
                <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-raised)] pr-2">
                  <div className="flex-1">
                    <AppTabs
                      tabs={tabs}
                      selectedId={activeTab}
                      onSelectionChange={(id) => setActiveTab(id)}
                    />
                  </div>

                  {/* Settings Popover */}
                  <AppPopover
                    title="Cài đặt ván đấu"
                    placement="bottom-end"
                    trigger={
                      <button
                        type="button"
                        aria-label="Cài đặt"
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] transition-colors cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    }
                  >
                    <div className="w-64 p-1">
                      <BotSettings />
                    </div>
                  </AppPopover>
                </div>

                {/* Tab Content Panel */}
                <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(100svh - 11rem)' }}>
                  {/* Tab 1: Ván đấu (Move History) */}
                  {activeTab === 'moves' && (
                    <div className="space-y-2">
                      <MoveHistory />
                    </div>
                  )}

                  {/* Tab 2: Phân tích (Engine Analysis) */}
                  {activeTab === 'analysis' && (
                    <EngineAnalysisPanel
                      fen={currentFen}
                      onBestMove={setEngineHint}
                      autoAnalyze={autoAnalyze}
                      onAutoAnalyzeChange={setAutoAnalyze}
                      autoComment={autoComment}
                      review={review}
                      isReviewing={isReviewing}
                      onReview={reviewGameWithEngine}
                    />
                  )}

                  {/* Tab 3: Huấn luyện (AI Coach) */}
                  {activeTab === 'coach' && (
                    <div className="space-y-3">
                      <AICoachPanel
                        fen={currentFen}
                        pgn={currentPgn}
                        history={moveHistory}
                        stockfish={
                          liveAnalysis
                            ? {
                                bestMove: liveAnalysis.bestMove,
                                bestMoveSan: liveAnalysis.bestMove
                                  ? (() => {
                                      try {
                                        return getSanFromUci(liveAnalysis.fen, liveAnalysis.bestMove);
                                      } catch {
                                        return null;
                                      }
                                    })()
                                  : null,
                                evaluation: liveAnalysis.evaluation,
                                pv: liveAnalysis.pv,
                              }
                            : null
                        }
                        turn={activeGame.turn()}
                        status={isGameOver ? 'Kết thúc' : isCheck ? 'Chiếu' : 'Đang chơi'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
