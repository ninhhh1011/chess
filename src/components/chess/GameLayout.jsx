import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';

import ChessBoardPanel from './ChessBoardPanel';
import GameInfoBar from './GameInfoBar';
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
 * GameLayout - Refactored cho giao diện chuyên nghiệp
 *
 * Thay đổi chính:
 * - Xóa PlayerInfoBar cũ (card lớn với avatar)
 * - Thêm GameInfoBar gọn (1 dòng, 48px)
 * - Xóa BotInfoPanel, AnalysisControls, GameStatusBanner thừa
 * - Layout 2 cột: 65% board + 35% sidebar
 * - Bàn cờ lên cao hơn, là trung tâm
 * - Sidebar gọn với tabs rõ ràng
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

      {/* Layout 2 cột: Board (65-70%) + Sidebar (30-35%) */}
      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4 lg:flex-row flex-col">

        {/* CỘT TRÁI: Bàn cờ */}
        <section className="flex-1 lg:max-w-[70%]">
          {/* Thanh thông tin ván đấu gọn - thay thế card cũ */}
          <GameInfoBar botElo={botElo} />

          {/* Bàn cờ với evaluation bar */}
          <div className="flex items-stretch gap-3">
            <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
            <div className="flex-1">
              <ChessBoardPanel engineHint={engineHint} />
            </div>
          </div>

          {/* Gợi ý nước đi */}
          <div className="mt-3">
            <MoveHintDisplay engineMove={engineMove} />
          </div>
        </section>

        {/* CỘT PHẢI: Sidebar */}
        <aside className="w-full lg:w-[400px] lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 overflow-hidden">
            {/* Tabs */}
            <nav className="flex border-b border-slate-700/60 bg-slate-800/40">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-3 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
                  }`}
                >
                  <span className="block text-sm mb-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Nội dung tabs */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
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
                <div className="space-y-4">
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
