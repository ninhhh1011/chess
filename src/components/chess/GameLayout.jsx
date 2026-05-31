import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { getSanFromUci } from '../../utils/chessMoveUtils';

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
 * - Controlled board sizing (max 620px)
 * - Compact player strips
 * - Balanced sidebar (360px)
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
}) {
  const { currentFen, currentPgn, moveHistory, activeGame, isGameOver, isCheck, botElo, playState } = useChessGame();
  const [activeTab, setActiveTab] = useState('moves');

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

          {/* Modals */}
          {showStartNotice && playState === 'playing' && <StartNotice />}
          <PromotionModal />

          {/* Main layout: board first, sidebar secondary */}
          <div className="mx-auto grid w-full max-w-[1320px] gap-3 py-2 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* LEFT COLUMN: Board area */}
        <section className="flex-1 min-w-0">
          {/* Game status bar - compact */}
          <div className="mb-2">
            <GameInfoBar botElo={botElo} />
          </div>

          {/* Opponent strip - above board */}
          <div className="mb-2">
            <PlayerBar position="top" />
          </div>

          {/* Board with evaluation bar */}
          <div className="flex items-start justify-center gap-2">
            <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
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
          <GameControls onHint={() => setActiveTab('coach')} />
          <ReviewNavigator />

          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
            {/* Tabs - compact */}
            <nav className="flex border-b border-slate-800 bg-slate-900">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-2 py-3 text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'text-emerald-500 border-b-2 border-emerald-500 bg-slate-800/50'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tab.iconType === 'avatar' ? (
                    <img
                      src={tab.iconSrc}
                      alt={tab.label}
                      className="mx-auto mb-1 h-5 w-5 rounded-full object-cover"
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
