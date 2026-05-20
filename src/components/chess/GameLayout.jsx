import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';

import ChessBoardPanel from './ChessBoardPanel';
import GameInfoBar from './GameInfoBar';
import PlayerBar from './PlayerBar';
import LiveEvaluationBar from './LiveEvaluationBar';
import MoveHintDisplay from './MoveHintDisplay';
import StartNotice from './StartNotice';
import ResultModal from './ResultModal';
import PromotionModal from './PromotionModal';
import MoveHistory from './MoveHistory';
import BotSettings from './BotSettings';
import GameControls from './GameControls';
import EngineAnalysisPanel from '../analysis/EngineAnalysisPanel';
import AICoachPanel from '../AICoachPanel';

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
  const { currentFen, currentPgn, moveHistory, activeGame, isGameOver, isCheck, botElo } = useChessGame();
  const [activeTab, setActiveTab] = useState('moves');

  const tabs = [
    { id: 'moves', label: 'Nước đi', icon: '📜' },
    { id: 'analysis', label: 'Phân tích', icon: '📊' },
    { id: 'coach', label: 'AI Coach', icon: '🤖' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ];

  return (
    <>
      {/* Modals */}
      {showStartNotice && <StartNotice />}
      <ResultModal />
      <PromotionModal />

      {/* Main layout: 2 columns, controlled sizing */}
      <div className="mx-auto flex max-w-[1400px] gap-4 px-3 py-3 lg:flex-row flex-col">

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
          <div className="flex items-start gap-2">
            <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
            <div className="flex-1 flex justify-center">
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

        {/* RIGHT COLUMN: Sidebar - fixed width */}
        <aside className="w-full lg:w-[360px] lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 overflow-hidden">
            {/* Tabs - compact */}
            <nav className="flex border-b border-slate-700/60 bg-slate-800/40">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-2 py-2.5 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
                  }`}
                >
                  <span className="block text-sm mb-0.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab content - reduced padding */}
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
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
                                  const { getSanFromUci } = require('../../utils/chessMoveUtils');
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
                  status={isGameOver ? 'Game Over' : isCheck ? 'Check' : 'Playing'}
                />
              )}

              {activeTab === 'settings' && (
                <div className="space-y-3">
                  <BotSettings />
                  <GameControls />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
