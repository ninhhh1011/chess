import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { getSanFromUci } from '../../utils/chessMoveUtils';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

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

/**
 * GameLayout - Production-quality chess app layout
 *
 * Optimized for 100% desktop zoom:
 * - Board is the visual centerpiece
 * - Compact player strips
 * - Sidebar with collapsible coach panel
 * - No wasted vertical space
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
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onHint: () => { setActiveTab('coach'); setCoachExpanded(true); },
    onResign: () => setShowResignConfirm(true),
  });

  const tabs = [
    { id: 'moves', label: BRAND_NAMES.moveHistory },
    { id: 'analysis', label: BRAND_NAMES.analysis },
    { id: 'coach', label: BRAND_NAMES.coach, iconType: 'avatar', iconSrc: coachAvatar },
    { id: 'settings', label: 'Cài đặt' },
  ];

  return (
    <>
      {/* Pre-Game Lobby */}
      {playState === 'lobby' && <PreGameLobby />}

      {/* Main Game Layout (Only visible if not lobby) */}
      {playState !== 'lobby' && (
        <div className="relative">
          {/* Post-Game Review Modal */}
          {playState === 'review' && <PostGameReview />}

          {/* Resign Confirmation Modal */}
          {showResignConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated p-6 shadow-xl">
                <h2 className="mb-2 text-lg font-bold text-text-primary">Xác nhận đầu hàng?</h2>
                <p className="mb-4 text-sm text-text-secondary">
                  Bạn sẽ thua ván cờ này. Bạn có chắc không?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="flex-1 rounded-md border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-base transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      resignGame();
                      setShowResignConfirm(false);
                    }}
                    className="flex-1 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors"
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

          {/* Main layout: board first, sidebar secondary */}
          <div className="mx-auto grid w-full max-w-[1320px] gap-3 py-2 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_348px]">

        {/* LEFT COLUMN: Board area */}
        <section className="min-w-0 rounded-lg border border-border bg-bg-base/35 p-2 sm:p-3">
          {/* Game status bar - compact */}
          <div className="mb-2">
            <GameInfoBar botElo={botElo} />
          </div>

          {/* Opponent strip - above board */}
          <div className="mb-2">
            <PlayerBar position="top" />
          </div>

          {/* Board with evaluation bar - hidden during gameplay, shown in review/analysis */}
          <div className="flex items-start justify-center gap-2 rounded-lg border border-border bg-bg-surface/45 p-2">
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
          <div className="mt-2">
            <PlayerBar position="bottom" />
          </div>

          {/* Move hint - compact */}
          {engineMove && (
            <div className="mt-2">
              <MoveHintDisplay engineMove={engineMove} />
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Sidebar */}
        <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <GameControls onHint={() => { setActiveTab('coach'); setCoachExpanded(true); }} requestHint={onRequestHint} />
          <ReviewNavigator />

          <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            {/* Tabs - compact */}
            <nav className="flex border-b border-border bg-bg-base">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-2 py-3 text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-primary-500 bg-bg-surface text-primary-300'
                      : 'text-text-tertiary hover:bg-bg-surface hover:text-text-secondary'
                  }`}
                >
                  {tab.iconType === 'avatar' ? (
                    <img
                      src={tab.iconSrc}
                      alt={tab.label}
                      className="mx-auto mb-1 h-5 w-5 rounded-md border border-border object-cover"
                    />
                  ) : tab.icon ? (
                    <span className="block text-sm mb-0.5">{tab.icon}</span>
                  ) : null}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab content - reduced padding */}
            <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(100svh - 10rem)' }}>
              {activeTab === 'moves' && <MoveHistory />}

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

              {activeTab === 'coach' && (
                <div className="space-y-3">
                  {/* Coach header with collapse button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">{BRAND_NAMES.coach}</h3>
                    <button
                      onClick={() => setCoachExpanded(!coachExpanded)}
                      className="text-xs text-text-tertiary hover:text-text-secondary"
                    >
                      {coachExpanded ? 'Thu gọn' : 'Mở rộng'}
                    </button>
                  </div>

                  {/* Collapsed view - just avatar and brief hint */}
                  {!coachExpanded && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface/50 p-3">
                      <img src={coachAvatar} alt={BRAND_NAMES.coach} className="h-8 w-8 rounded-full" />
                      <p className="text-xs text-text-tertiary">
                        Nhấn "Mở rộng" để xem gợi ý từ AI Coach
                      </p>
                    </div>
                  )}

                  {/* Expanded view - full coach panel */}
                  {coachExpanded && (
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
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-3">
                  <BotSettings />
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
