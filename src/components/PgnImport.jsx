import { useState } from 'react';
import { Chess } from 'chess.js';

/**
 * PgnImport - Import PGN to review or analyze
 */
export default function PgnImport({ onImport }) {
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  function validatePgn() {
    if (!pgn.trim()) {
      setError('');
      setPreview(null);
      return;
    }

    try {
      const game = new Chess();
      game.loadPgn(pgn.trim());
      const headers = game.header();
      const moves = game.history();

      setError('');
      setPreview({
        headers,
        moves,
        moveCount: moves.length,
        white: headers.White || 'Unknown',
        black: headers.Black || 'Unknown',
        event: headers.Event || 'Unknown',
      });
    } catch (e) {
      setError('PGN không hợp lệ. Kiểm tra lại các nước đi.');
      setPreview(null);
    }
  }

  function handleImport() {
    if (!preview) return;

    try {
      const game = new Chess();
      game.loadPgn(pgn.trim());

      if (onImport) {
        onImport({
          pgn: pgn.trim(),
          game,
          headers: preview.headers,
          moves: preview.moves,
        });
      }

      setPgn('');
      setPreview(null);
    } catch (e) {
      setError('Không thể import PGN.');
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-text-primary">Import PGN</h4>

      <textarea
        value={pgn}
        onChange={e => {
          setPgn(e.target.value);
          setError('');
          setPreview(null);
        }}
        onBlur={validatePgn}
        placeholder="Paste PGN here...&#10;ví dụ:&#10;1. e4 e5 2. Nf3 Nc6"
        className="h-32 w-full resize-none rounded-lg border border-border bg-bg-base p-3 text-sm text-text-primary placeholder-text-tertiary focus:border-primary-400 focus:outline-none"
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {preview && (
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {preview.white} vs {preview.black}
            </span>
            <span className="rounded bg-bg-base px-2 py-0.5 text-xs text-text-secondary">
              {preview.moveCount} nước
            </span>
          </div>
          {preview.event && (
            <p className="mb-2 text-xs text-text-tertiary">{preview.event}</p>
          )}
          <button
            onClick={handleImport}
            className="w-full rounded-lg bg-primary-400 px-4 py-2 text-sm font-semibold text-bg-base transition hover:bg-primary-300"
          >
            Xem lại ván cờ
          </button>
        </div>
      )}

      {!preview && !error && pgn && (
        <button
          onClick={validatePgn}
          className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
        >
          Kiểm tra PGN
        </button>
      )}
    </div>
  );
}
