import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChessGame } from '../contexts/ChessGameContext';
import { useAuth } from '../contexts/AuthContext';
import ChessGameBoard from '../components/ChessGameBoard';
import GameLayout from '../components/chess/GameLayout';
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <p className="text-emerald-500 animate-pulse">Joining game...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="rounded-lg bg-slate-800 px-4 py-2 text-slate-200">Go Home</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {status === 'waiting' && (
        <div className="bg-amber-500/20 text-amber-300 p-2 text-center text-sm">
          Waiting for opponent to join... Share this link: {window.location.href}
        </div>
      )}
      {status === 'abandoned' && (
        <div className="bg-red-500/20 text-red-300 p-2 text-center text-sm">
          Game abandoned due to inactivity.
        </div>
      )}
      <GameLayout>
        <ChessGameBoard />
      </GameLayout>
    </div>
  );
}
