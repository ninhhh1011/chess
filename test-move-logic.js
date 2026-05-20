// Quick test to verify move logic
import { Chess } from 'chess.js';

const game = new Chess();
console.log('Initial FEN:', game.fen());
console.log('Turn:', game.turn()); // 'w'

// Test 1: Get piece at e2
const piece = game.get('e2');
console.log('Piece at e2:', piece); // { type: 'p', color: 'w' }

// Test 2: Check if can drag
const gameMode = 'bot';
const playerColor = 'w';
const pieceColor = piece.color;
const currentTurn = game.turn();

console.log('\n=== canDragPiece logic ===');
console.log('gameMode:', gameMode);
console.log('playerColor:', playerColor);
console.log('pieceColor:', pieceColor);
console.log('currentTurn:', currentTurn);
console.log('Can drag?', currentTurn === playerColor && pieceColor === playerColor);

// Test 3: Get legal moves
const moves = game.moves({ square: 'e2', verbose: true });
console.log('\n=== Legal moves from e2 ===');
console.log('Count:', moves.length);
console.log('Moves:', moves.map(m => m.to));

// Test 4: Make move
console.log('\n=== Making move e2-e4 ===');
const result = game.move({ from: 'e2', to: 'e4' });
console.log('Result:', result);
console.log('New FEN:', game.fen());
console.log('New turn:', game.turn()); // 'b'
