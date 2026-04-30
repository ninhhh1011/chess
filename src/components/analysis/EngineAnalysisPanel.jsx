import { useEffect, useState } from 'react';
import { analyzeFen, initEngine, isEngineReady, stopEngine } from '../../services/stockfishService';
import { formatEvaluation, getSanFromUci } from '../../utils/chessMoveUtils';
import GameReviewPanel from './GameReviewPanel';

export default function EngineAnalysisPanel({ fen, onReview, review, isReviewing, autoAnalyze, onAutoAnalyzeChange, autoComment }) {
  const [status, setStatus] = useState('Đang tải');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const bestSan = analysis?.bestMove ? getSanFromUci(analysis.fen, analysis.bestMove) : null;

  useEffect(() => {
    initEngine().then(() => setStatus(isEngineReady() ? 'Sẵn sàng' : 'Lỗi')).catch(() => setStatus('Lỗi'));
  }, []);

  async function runAnalysis(showHint = false) {
    setIsAnalyzing(true); setError(''); setStatus('Đang phân tích');
    try {
      const result = await analyzeFen({ fen, depth: 10 });
      setAnalysis(result);
      setStatus('Sẵn sàng');
      if (showHint && result.bestMove) setError(`Engine gợi ý: ${getSanFromUci(result.fen, result.bestMove)}`);
    } catch (err) {
      setStatus('Lỗi');
      setError(err.message || 'Engine chưa sẵn sàng, vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleStop() { stopEngine(); setIsAnalyzing(false); setStatus('Đã dừng'); }

  return <aside className="mt-6 rounded-[2rem] border border-gold/20 bg-white/[.08] p-5 backdrop-blur lg:mt-0">
    <h2 className="text-2xl font-black">Stockfish Analysis</h2>
    <p className="mt-2 text-sm text-cream/55">Trạng thái engine: <b className="text-gold">{status}</b></p>
    <label className="mt-4 flex items-center gap-3 rounded-2xl bg-ink/45 p-3 text-sm font-bold text-cream/75">
      <input type="checkbox" checked={autoAnalyze} onChange={(event) => onAutoAnalyzeChange(event.target.checked)} />
      Tự phân tích sau mỗi nước
    </label>
    {autoComment && <p className="mt-3 rounded-2xl bg-gold/10 p-3 text-sm font-bold text-gold">{autoComment}</p>}
    <div className="mt-4 grid gap-3 rounded-2xl bg-ink/45 p-4 text-sm">
      <p>Evaluation: <b className="text-gold">{formatEvaluation(analysis?.evaluation)}</b></p>
      <p>Best move: <b className="text-gold">{bestSan || 'Chưa có'}</b></p>
      <p>PV: <span className="text-cream/65">{analysis?.pv?.map((uci) => getSanFromUci(analysis.fen, uci)).join(' ') || 'Chưa có'}</span></p>
    </div>
    {error && <p className="mt-3 rounded-2xl bg-ink/50 p-3 text-sm font-bold text-gold">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button className="btn-primary" onClick={() => runAnalysis(false)} disabled={isAnalyzing}>{isAnalyzing ? 'Đang phân tích...' : 'Phân tích vị trí'}</button>
      <button className="btn-secondary" onClick={() => runAnalysis(true)} disabled={isAnalyzing}>Gợi ý nước tốt nhất</button>
      <button className="btn-secondary" onClick={handleStop}>Dừng phân tích</button>
    </div>
    <GameReviewPanel review={review} isReviewing={isReviewing} onReview={onReview} />
  </aside>;
}
