import { useCallback, useLayoutEffect, useState } from 'react';
import MobileControls from '../components/MobileControls';
import ChessGameBoard from '../components/ChessGameBoard';
import { useChessGame } from '../contexts/ChessGameContext';

export default function Play() {
  const { gameGeneration, playState, playerColor } = useChessGame();
  const [boardOrientation, setBoardOrientation] = useState('white');
  const flipBoard = useCallback(() => {
    setBoardOrientation((orientation) => orientation === 'white' ? 'black' : 'white');
  }, []);

  useLayoutEffect(() => {
    if (playState === 'playing') {
      setBoardOrientation(playerColor === 'b' ? 'black' : 'white');
    }
  }, [gameGeneration, playState, playerColor]);

  return (
    <section aria-label="Chơi cờ">
      <ChessGameBoard boardOrientation={boardOrientation} flipBoard={flipBoard} />
      <MobileControls onFlipBoard={flipBoard} />
    </section>
  );
}
