import { useChessGame } from '../../contexts/ChessGameContext';

export default function AnalysisControls() {
  const { analysisMode, analysisPly, analysisMainline, goToAnalysisPly, exitAnalysisMode } = useChessGame();

  if (!analysisMode) return null;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Chế độ phân tích</p>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Đang xem ply {analysisPly}/{analysisMainline.length}. Bạn có thể đi thử biến khác trên bàn cờ.
          </p>
        </div>
        <button className="btn-secondary btn-sm" onClick={exitAnalysisMode}>
          Rời phân tích
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          className="btn-secondary btn-sm"
          onClick={() => goToAnalysisPly(analysisPly - 1)}
          disabled={analysisPly <= 0}
        >
          ← Lùi
        </button>
        <button className="btn-secondary btn-sm" onClick={() => goToAnalysisPly(analysisMainline.length)}>
          ⏭ Về cuối
        </button>
        <button
          className="btn-secondary btn-sm"
          onClick={() => goToAnalysisPly(analysisPly + 1)}
          disabled={analysisPly >= analysisMainline.length}
        >
          Tiến →
        </button>
      </div>
    </div>
  );
}
