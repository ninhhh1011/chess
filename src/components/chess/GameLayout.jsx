import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';

import ChessBoardPanel from './ChessBoardPanel';
import PlayerInfoBar from './PlayerInfoBar';
import GameStatusBanner from './GameStatusBanner';
import BotInfoPanel from './BotInfoPanel';
import AnalysisControls from './AnalysisControls';
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
 * GameLayout Component - FIXED VERSION
 *
 * FIX BUG 1: Added PlayerInfoBar component above the board
 * FIX BUG 2: Responsive flex layout with independent scrolling sidebar
 * FIX BUG 3: Hover hints removed from ChessBoardPanel (handled there)
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
  const [activeTab, setActiveTab] = useState('history'); // Default to history for better UX

  // FIX BUG 2: Mobile sidebar toggle
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const tabs = [
    { id: 'history', label: 'Lịch sử', icon: '📜' },
    { id: 'analysis', label: 'Phân tích', icon: '📊' },
    { id: 'coach', label: 'AI Coach', icon: '🤖' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ];

  return (
    <>
      {/* Global modals */}
      {showStartNotice && <StartNotice />}
      <ResultModal />
      <PromotionModal />

      {/* FIX BUG 2: Flex row layout for desktop, column for mobile */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

        {/* LEFT: Board area - FIX BUG 1: Added PlayerInfoBar */}
        <section className="flex-1 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400/70">Vua Cờ · Play</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-50">Bàn cờ</h2>
            </div>
            <GameStatusBanner />
          </div>

          {/* FIX BUG 1: Player info bar - always visible above board */}
          <PlayerInfoBar botElo={botElo} botDifficulty="Medium" />

          <BotInfoPanel />
          <AnalysisControls />

          <div className="mx-auto flex w-full max-w-3xl items-stretch justify-center gap-3">
            <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
            <div className="min-w-0 flex-1">
              <ChessBoardPanel engineHint={engineHint} />
            </div>
          </div>

          <div className="mx-auto mt-4 w-full max-w-3xl">
            <MoveHintDisplay engineMove={engineMove} />
          </div>

          {/* FIX BUG 2: Mobile sidebar toggle button */}
          <div className="mt-4 lg:hidden">
            <button
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              className="w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-4 py-3 font-bold text-slate-300 transition hover:bg-slate-700/60"
            >
              {isSidebarVisible ? '✕ Đóng' : '📜 Lịch sử nước đi & Phân tích'}
            </button>
          </div>
        </section>

        {/* RIGHT: Sidebar - FIX BUG 2: Independent scrolling, responsive */}
        <aside
          className={`
            w-full rounded-xl border border-slate-700/50 bg-slate-900/40
            lg:sticky lg:top-4 lg:block lg:w-96
            ${isSidebarVisible ? 'block' : 'hidden lg:block'}
          `}
          style={{
            // FIX BUG 2: Sidebar height matches viewport on desktop
            maxHeight: 'calc(100vh - 2rem)',
          }}
        >
          {/* Tab navigation */}
          <nav className="flex border-b border-slate-700/50 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <span className="block text-base">{tab.icon}</span>
                <span className="mt-1 block">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* FIX BUG 2: Tab content with independent scrolling */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
            {activeTab === 'history' && <MoveHistory />}

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
              <div className="space-y-4">
                <BotSettings />
                <GameControls />
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
