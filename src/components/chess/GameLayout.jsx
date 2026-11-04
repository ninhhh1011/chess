import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
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
import AnalysisCoach from '../review/AnalysisCoach';
import { AppPopover } from '@/ui/AppPopover';
import { AppTabs } from '@/ui/AppTabs';
import { AppSurface } from '@/ui/AppSurface';
import { AppAlertDialog } from '@/ui/AppAlertDialog';
import { AppButton } from '@/ui/AppButton';
import { Settings, History, Activity, Sparkles, AlertTriangle } from 'lucide-react';

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
  boardOrientation,
  flipBoard,
  liveEvalStatus,
  engineHint,
  onAnalysisRequestStart,
  onBestMove,
  autoAnalyze,
  setAutoAnalyze,
  autoComment,
  review,
  isReviewing,
  reviewGameWithEngine,
  engineMove,
  showStartNotice,
  isThinking,
  onRequestHint,
  onReviewFact,
}) {
  const { currentFen, activeGame, botElo, playState, resignGame, playerColor, analysisMode, getLegalMoves } = useChessGame();
  const [activeTab, setActiveTab] = useState('moves');
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [selection, setSelection] = useState({ game: activeGame, square: null, hints: {} });
  const selectedSquare = selection.game === activeGame ? selection.square : null;
  const moveHints = selection.game === activeGame ? selection.hints : {};

  function clearSelection() {
    setSelection({ game: activeGame, square: null, hints: {} });
  }

  function selectSquare(square) {
    const piece = square ? activeGame.get(square) : null;
    if (!piece || piece.color !== activeGame.turn()) {
      clearSelection();
      return;
    }
    if (!analysisMode && (isThinking || piece.color !== playerColor)) return;

    const hints = getLegalMoves(square).reduce((styles, move) => {
      const targetPiece = activeGame.get(move.to);
      styles[move.to] = targetPiece && targetPiece.color !== piece.color
        ? { boxShadow: 'inset 0 0 0 4px rgba(234,179,8,0.42)' }
        : {
            backgroundImage: 'radial-gradient(circle, rgba(234,179,8,0.45) 0 18%, transparent 20%)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
          };
      return styles;
    }, {});

    setSelection({ game: activeGame, square, hints });
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    flipBoard,
    onHint: () => { setActiveTab('coach'); },
    onResign: () => setShowResignConfirm(true),
  });

  // Board keyboard navigation
  useKeyboardNavigation({ selectedSquare, moveHints, selectSquare, clearSelection, isThinking });

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

          {/* Resign Confirmation Modal (HeroUI AlertDialog) */}
          <AppAlertDialog
            isOpen={showResignConfirm}
            onOpenChange={setShowResignConfirm}
            title="Xác nhận đầu hàng"
            confirmLabel="Đầu hàng"
            cancelLabel="Tiếp tục chơi"
            confirmVariant="danger"
            status="danger"
            icon={<AlertTriangle className="h-5 w-5 text-[var(--app-danger)]" />}
            onConfirm={resignGame}
          >
            Bạn có chắc chắn muốn đầu hàng ván cờ này không? Kết quả sẽ được ghi nhận là một trận thua.
          </AppAlertDialog>

          {/* Modals */}
          {showStartNotice && playState === 'playing' && <StartNotice />}
          <PromotionModal />

          {/* Main Layout Grid: Desktop board ~65%, sidebar ~340px */}
          <div className="mx-auto grid w-full max-w-[1340px] gap-4 py-2 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">

            {/* LEFT COLUMN: Board Area */}
            <AppSurface
              variant="base"
              radius="lg"
              className="min-w-0 p-4 sm:p-6 space-y-3 bg-white rounded-[28px] border border-[var(--app-border)] shadow-[var(--shadow-card)]"
            >
              {/* Game status bar */}
              <GameInfoBar botElo={botElo} isThinking={isThinking} />

              {/* Opponent strip - above board */}
              <PlayerBar position="top" boardOrientation={boardOrientation} isThinking={isThinking} />

              {/* Board with evaluation bar */}
              <div className="flex items-start justify-center gap-3 p-3 sm:p-4 rounded-[20px] bg-[var(--app-muted-surface)]/40 border border-[var(--app-border)]">
                <LiveEvaluationBar
                  analysis={liveAnalysis}
                  status={liveEvalStatus}
                  hidden={playState === 'playing' && !isReviewing}
                />
                <div className="flex min-w-0 flex-1 justify-center">
                  <ChessBoardPanel boardOrientation={boardOrientation} engineHint={engineHint} selectedSquare={selectedSquare} moveHints={moveHints} selectSquare={selectSquare} clearSelection={clearSelection} isThinking={isThinking} />
                </div>
              </div>

              {/* Player strip - below board */}
              <PlayerBar position="bottom" boardOrientation={boardOrientation} isThinking={isThinking} />

              {/* Controls visible directly under board on mobile */}
              <div className="block lg:hidden pt-1">
                <GameControls
                  flipBoard={flipBoard}
                  onHint={() => { setActiveTab('coach'); }}
                  requestHint={onRequestHint}
                  isThinking={isThinking}
                />
              </div>

              {/* Move hint */}
              {engineMove && (
                <div className="mt-1">
                  <MoveHintDisplay engineMove={engineMove} selectedSquare={selectedSquare} />
                </div>
              )}
            </AppSurface>

            {/* RIGHT COLUMN: Sidebar (3 tabs + settings popover) */}
            <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
              {/* Controls on desktop */}
              <div className="hidden lg:block">
                <GameControls
                  flipBoard={flipBoard}
                  onHint={() => { setActiveTab('coach'); }}
                  requestHint={onRequestHint}
                  isThinking={isThinking}
                />
              </div>
              <ReviewNavigator />

              {/* Tab Box */}
              <AppSurface
                variant="base"
                radius="lg"
                className="overflow-hidden bg-white rounded-[28px] border border-[var(--app-border)] shadow-[var(--shadow-card)]"
              >
                {/* Tab Header with 3 main tabs + settings popover */}
                <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-muted-surface)]/60 pr-2">
                  <div className="flex-1">
                    <AppTabs
                      tabs={tabs}
                      selectedId={activeTab}
                      onSelectionChange={(id) => setActiveTab(id)}
                      ariaLabel="Các chế độ thông tin ván đấu"
                    />
                  </div>

                  {/* Settings Popover */}
                  <AppPopover
                    title="Cài đặt ván đấu"
                    placement="bottom end"
                    trigger={
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] hover:bg-white hover:text-[#030302] transition-colors">
                        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
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
                      onAnalysisRequestStart={onAnalysisRequestStart}
                      onBestMove={onBestMove}
                      autoAnalyze={autoAnalyze}
                      onAutoAnalyzeChange={setAutoAnalyze}
                      autoComment={autoComment}
                      review={review}
                      isReviewing={isReviewing}
                      onReview={reviewGameWithEngine}
                      onReviewFact={onReviewFact}
                    />
                  )}

                  {/* Tab 3: Huấn luyện (AI Coach) */}
                  {activeTab === 'coach' && (
                    <div className="space-y-3">
                      {review?.focusedEvidenceId && (
                        <AnalysisCoach
                          playerSide={review.playerSide}
                          focusedEvidenceId={review.focusedEvidenceId}
                        />
                      )}
                      <AICoachPanel
                        fen={currentFen}
                      />
                    </div>
                  )}
                </div>
              </AppSurface>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
