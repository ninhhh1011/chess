import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChessGame } from '../contexts/ChessGameContext';
import { useAuth } from '../contexts/AuthContext';
import ChessGameBoard from '../components/ChessGameBoard';
import { joinGame, subscribeToGame, fetchGameState, pushMove, updateGameStatus } from '../services/onlineGameService';

export default function OnlinePlay() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    game, 
    setGameMode, 
    setPlayerColor, 
    GAME_MODES, 
    makeMove,
    resetGameToFen
  } = useChessGame();
  
  const [status, setStatus] = useState('joining');
  const [error, setError] = useState(null);
  const [myColor, setMyColor] = useState(null);
  
  const lastMoveTimeRef = useRef(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/play/online/${gameId}` } });
      return;
    }

    setGameMode(GAME_MODES.ONLINE || 'online');

    const init = async () => {
      try {
        const { playerColor } = await joinGame(gameId, user.id);
        setMyColor(playerColor);
        setPlayerColor(playerColor);

        const gameState = await fetchGameState(gameId);
        if (gameState.fen !== game.fen()) {
          resetGameToFen(gameState.fen);
        }
        setStatus(gameState.status);

        const unsubscribe = subscribeToGame(gameId, 
          (payload) => {
            // opponent made a move
            const { move, newFen } = payload;
            makeMove(move.from, move.to, move.promotion || 'q', { byRemote: true });
            lastMoveTimeRef.current = Date.now();
          },
          (newState) => {
            setStatus(newState.status);
            if (newState.fen !== game.fen()) {
               resetGameToFen(newState.fen);
            }
          }
        );

        // Check for inactivity
        intervalRef.current = setInterval(() => {
          if (Date.now() - lastMoveTimeRef.current > 30000 && status === 'waiting') {
            // Still waiting after 30s
            // Just local banner handled by state
          }
          if (Date.now() - lastMoveTimeRef.current > 300000 && status === 'playing') {
            updateGameStatus(gameId, 'abandoned');
          }
        }, 10000);

        return unsubscribe;
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    const cleanupPromise = init();

    return () => {
      cleanupPromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameId, user, navigate]);

  // Intercept local moves to broadcast them
  useEffect(() => {
    const handleLocalMove = (e) => {
      const detail = e.detail;
      if (!detail.byRemote && !detail.byBot && status === 'playing') {
         pushMove(gameId, detail.move, detail.fen, detail.pgn).catch(console.error);
         lastMoveTimeRef.current = Date.now();
      }
    };
    
    window.addEventListener('chess-move-made', handleLocalMove);
    return () => window.removeEventListener('chess-move-made', handleLocalMove);
  }, [gameId, status]);

  if (status === 'joining') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center p-4">
        <p className="animate-pulse rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
          Joining beta game...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center p-4 text-center">
        <p className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
        <button onClick={() => navigate('/')} className="btn-secondary">Go Home</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="rounded border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-200">
            Beta
          </span>
          <span>Online Play</span>
        </div>
        <span className="text-xs text-slate-500">Realtime sync can still vary by network.</span>
      </div>
      {status === 'waiting' && (
        <div className="mx-auto w-full max-w-[1320px] rounded-md border border-amber-300/25 bg-amber-300/10 p-2 text-center text-sm text-amber-200">
          Waiting for opponent to join... Share this link: {window.location.href}
        </div>
      )}
      {status === 'abandoned' && (
        <div className="mx-auto w-full max-w-[1320px] rounded-md border border-rose-500/25 bg-rose-500/10 p-2 text-center text-sm text-rose-200">
          Game abandoned due to inactivity.
        </div>
      )}
      <ChessGameBoard />
    </div>
  );
}
