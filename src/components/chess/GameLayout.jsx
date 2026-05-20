import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';

import ChessBoardPanel from './ChessBoardPanel';
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
  const { currentFen, currentPgn, moveHistory, activeGame, isGameOver, isCheck } = useChessGame();
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'history' | 'coach' | 'settings'
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const tabs = [
    { id: 'analysis', label: 'Phân tích', icon: '📊' },
    { id: 'history', label: 'Lịch sử', icon: '📜' },
    { id: 'coach', label: 'AI Coach', icon: '🤖' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ];

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] gap-4">
      {showStartNotice && <StartNotice />}
      <ResultModal />
      <PromotionModal />

      {/* Main board area - takes priority */}
      <section className="flex-1 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400/70">Vua Cờ · Play</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-50">Bàn cờ</h2>
          </div>
          <GameStatusBanner />
        </div>

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
      </section>

      {/* Collapsible side panel */}
      <aside
        className={`relative flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/40 transition-all duration-300 ${
          isPanelOpen ? 'w-80' : 'w-12'
        }`}
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute -left-3 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-lg transition hover:bg-slate-700 hover:text-amber-400"
          aria-label={isPanelOpen ? 'Đóng bảng điều khiển' : 'Mở bảng điều khiển'}
        >
          {isPanelOpen ? '›' : '‹'}
        </button>

        {isPanelOpen && (
          <>
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

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
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

              {activeTab === 'history' && <MoveHistory />}

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
          </>
        )}
      </aside>
    </div>
  );
}
