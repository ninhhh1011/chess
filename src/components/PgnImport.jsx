import { useState } from 'react';
import { Chess } from 'chess.js';
import { AppTextArea } from '@/ui/AppTextArea';
import { AppButton } from '@/ui/AppButton';
import { AppSurface } from '@/ui/AppSurface';
import { AppStatus } from '@/ui/AppStatus';

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
      <AppTextArea
        label="Import PGN"
        value={pgn}
        onChange={(val) => {
          setPgn(val);
          setError('');
          setPreview(null);
        }}
        onBlur={validatePgn}
        placeholder="Paste PGN here...&#10;ví dụ:&#10;1. e4 e5 2. Nf3 Nc6"
        errorMessage={error}
        rows={4}
      />

      {preview && (
        <AppSurface className="p-3 border border-[var(--app-border)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--app-foreground)]">
              {preview.white} vs {preview.black}
            </span>
            <AppStatus variant="teal" size="sm">
              {preview.moveCount} nước
            </AppStatus>
          </div>
          {preview.event && (
            <p className="text-[11px] text-[var(--app-muted)]">{preview.event}</p>
          )}
          <AppButton
            variant="primary"
            size="sm"
            onClick={handleImport}
            className="w-full font-bold"
          >
            Xem lại ván cờ
          </AppButton>
        </AppSurface>
      )}

      {!preview && !error && pgn && (
        <AppButton
          variant="outline"
          size="sm"
          onClick={validatePgn}
          className="w-full"
        >
          Kiểm tra PGN
        </AppButton>
      )}
    </div>
  );
}
