/**
 * Stockfish Benchmark Corpus
 *
 * 100 unique FEN positions for engine testing.
 * Each position tested for:
 * - Legal bestmove
 * - Source verification
 * - Timeout handling
 */

import { Chess } from 'chess.js';
import { analyzeFen, isEngineReady } from '../services/stockfishService';

export interface BenchmarkResult {
  fen: string;
  description: string;
  legal: boolean;
  bestMove: string | null;
  source: string;
  evaluation: { type: string; value: number } | null;
  error?: string;
}

export interface BenchmarkReport {
  total: number;
  successful: number;
  legal: number;
  illegal: number;
  timeout: number;
  crash: number;
  totalTimeMs: number;
  engineSource: string;
  engineVersion: string;
  depth: number;
  avgTimeMs: number;
  results: BenchmarkResult[];
}

/**
 * 100 Benchmark FEN positions
 */
export const BENCHMARK_FENS: Array<{ fen: string; description: string }> = [
  // Starting position
  { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', description: 'Starting position' },

  // After 1. e4
  { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', description: 'After 1.e4' },

  // After 1. e4 e5
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', description: 'After 1.e4 e5' },

  // After 1. d4
  { fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', description: 'After 1.d4' },

  // After 1. c4 (English)
  { fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1', description: 'After 1.c4' },

  // After 1. Nf3
  { fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1', description: 'After 1.Nf3' },

  // Italian Game
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', description: 'Italian Game' },

  // Ruy Lopez
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq b3 0 4', description: 'Ruy Lopez' },

  // Sicilian Defense
  { fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', description: 'Sicilian Defense' },

  // King's Indian Defense
  { fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', description: 'KID' },

  // Queen's Gambit
  { fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq d3 0 2', description: 'Queens Gambit' },

  // Scandinavian Defense
  { fen: 'rnbqkbnr/ppp1pppp/8/3p4/1P6/8/P1PP1PPP/RNBQKBNR w KQkq - 0 2', description: 'Scandinavian' },

  // French Defense
  { fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', description: 'French Defense' },

  // Caro-Kann
  { fen: 'rnbqkbnr/pp1ppppp/2p5/4P3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', description: 'Caro-Kann' },

  // Ponziani
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 3', description: 'Ponziani' },

  // London System
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 3', description: 'London System' },

  // Dutch Defense
  { fen: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 2', description: 'Dutch Defense' },

  // Nimzo-Indian
  { fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4', description: 'Nimzo-Indian' },

  // Bogo-Indian
  { fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 4', description: 'Bogo-Indian' },

  // Grunfeld
  { fen: 'rnbqkb1r/ppp1pp1p/5n2/3p1p2/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 4', description: 'Grunfeld' },

  // Benoni
  { fen: 'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3', description: 'Benoni' },

  // Modern Defense
  { fen: 'rnbqkb1r/pppppppp/5n2/8/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3', description: 'Modern Defense' },

  // Alekhine Defense
  { fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3', description: 'Alekhine Defense' },

  // Petrov Defense
  { fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', description: 'Petrov Defense' },

  // Philidor
  { fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', description: 'Philidor' },

  // Latvian Gambit
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', description: 'Latvian Gambit' },

  // Vienna Game
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 0 3', description: 'Vienna Game' },

  // Center Game
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2', description: 'Center Game' },

  // King's Gambit
  { fen: 'rnbqkbnr/pppppppp/8/8/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2', description: 'Kings Gambit' },

  // Giuoco Piano
  { fen: 'r1bqkbnr/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', description: 'Giuoco Piano' },

  // Two Knights Defense
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/5N2/PPPP1PPP/RNB1K2R w KQkq - 0 5', description: 'Two Knights' },

  // Greco Defense
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P2Q/5N2/PPPP1PPP/RNB1K2R b KQkq - 0 5', description: 'Greco Defense' },

  // Traxler
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4N3/4P2Q/8/PPPP1PPP/RNB1K2R b KQkq - 0 5', description: 'Traxler' },

  // Scotch Game
  { fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq d6 0 4', description: 'Scotch Game' },

  // Morra Gambit
  { fen: 'rnbqkbnr/ppp2ppp/8/3pp3/2P1PP2/8/PP4PP/RNBQKBNR b KQkq - 0 4', description: 'Morra Gambit' },

  // Danish Gambit
  { fen: 'rnbqkbnr/ppp2ppp/8/3pp3/2PP1P2/8/PP4PP/RNBQKBNR b KQkq - 0 4', description: 'Danish Gambit' },

  // Budapest Gambit
  { fen: 'rnbqkb1r/pppp1ppp/5n2/8/2PPp3/8/PP3PPP/RNBQKBNR w KQkq - 0 4', description: 'Budapest Gambit' },

  // Englund Gambit
  { fen: 'rnbqkbnr/pppp1ppp/8/8/2PpP3/8/PP4PP/RNBQKBNR b KQkq d3 0 3', description: 'Englund Gambit' },

  // Blackmar-Diemer Gambit
  { fen: 'rnbqkbnr/ppp1pppp/8/8/2pPP3/8/PP4PP/RNBQKBNR w KQkq - 0 3', description: 'BDG' },

  // King's Indian Attack
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3PP3/2N5/PPP1PPP/R1BQKBNR b KQkq - 0 4', description: 'KIA' },

  // Hypermodern
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', description: 'Hypermodern' },

  // Torre Attack
  { fen: 'r1bqkb1r/pppppppp/2n5/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 4', description: 'Torre' },

  // Trompowsky
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 0 4', description: 'Trompowsky' },

  // Barry Attack
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4', description: 'Barry Attack' },

  // Owen Defense
  { fen: 'rnbqkb1r/pppppppp/5n2/6N1/3PP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4', description: 'Owen Defense' },

  // Elephant Gambit
  { fen: 'rnbqkbnr/ppp2ppp/8/3pp3/2P1P3/5N2/PP3PPP/RNBQKB1R b KQkq - 0 4', description: 'Elephant Gambit' },

  // Checkmate positions
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', description: 'Italian mate threat' },
  { fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 2', description: 'Fool\'s mate position' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', description: 'Endgame mate setup' },
  { fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6', description: 'Castling rights matter' },

  // Tactical positions
  { fen: 'r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 6', description: 'Open position' },
  { fen: 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7', description: 'Slightly closed' },
  { fen: 'rnbq1rk1/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 7', description: 'Closed position' },
  { fen: 'r1bq1rk1/ppp1n1pp/3p1p2/2bPp3/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 8', description: 'Complex middle' },
  { fen: '2rq1rk1/ppp2ppp/2n1bn2/3p4/3P4/2NBPN2/PPP2PPP/R2Q1RK1 w - - 0 10', description: 'Endgame preparation' },

  // Isolated queen pawn
  { fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/2PP4/2NBPN2/PP3PPPP/R2Q1RK1 w - - 0 9', description: 'IQP position' },
  { fen: 'r1bqr1k1/ppp2ppp/2n2n2/3p4/1b1P4/2NBPN2/PPP2PPP/R2Q1RK1 w - - 0 9', description: 'IQP with pressure' },

  // Hanging pawns
  { fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/3P4/3BPN2/PPP2PPP/R2Q1RK1 w - - 0 10', description: 'Hanging pawns' },

  // Back rank weaknesses
  { fen: '6k1/5ppp/8/8/8/4P3/5PPP/4R1K1 w - - 0 1', description: 'Rook endgame' },
  { fen: '3r2k1/5ppp/8/8/8/4P3/5PPP/4R1K1 w - - 0 2', description: 'Rook vs pawns' },
  { fen: '4r1k1/5ppp/8/8/8/4P3/5PPP/4R1K1 w - - 0 2', description: 'Rook central' },

  // Knight outposts
  { fen: 'r2q1rk1/ppp2ppp/2n1bn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7', description: 'Knight outpost' },
  { fen: 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/2B1P3/2N2N2/PPP2PPP/R1BQ1RK1 w KQkq - 0 7', description: 'Open center' },

  // Bishop pairs
  { fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R1BQK2R w KQkq - 0 9', description: 'Bishop pair' },
  { fen: 'r2qk2r/ppp2ppp/2n1bn2/3p4/3P4/2N1BN2/PPP2PPP/R2QK2R w KQkq - 0 8', description: 'No bishop pair' },

  // Space advantage
  { fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', description: 'Space advantage' },

  // Minority attack
  { fen: 'r2q1rk1/ppp2ppp/2n2n2/3p4/1b1P4/2N2N2/PPP1BPPP/R2QKB1R w KQkq - 0 9', description: 'Minority attack' },

  // Open files
  { fen: 'r3qrk1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 10', description: 'Open d-file' },

  // Closed positions
  { fen: 'r1bq1rk1/ppp1n1pp/2n5/2bp4/2P1P3/2NP1N2/PP3PPP/R1BQKB1R w KQkq - 0 8', description: 'Closed structure' },

  // Opposite-side castling
  { fen: 'r1bq1rk1/ppppnppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPPQ1PPP/R1B2K1R w KQ - 0 8', description: 'Opposite castling' },

  // Same-side castling
  { fen: 'r1bq1rk1/pppn1ppp/2n2n2/3pp3/2B1P3/2NP1N2/PPPQ1PPP/R1B2K1R w KQ - 0 7', description: 'Same-side castling' },

  // Piece coordination
  { fen: 'r1bq1rk1/pppn1ppp/3p1n2/2b1p3/2B1P3/2NP1N2/PPPQ1PPP/2KR1B1R w - - 0 9', description: 'Coordinated pieces' },

  // King activity
  { fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', description: 'Active king' },

  // Pawn storms
  { fen: 'r1bq1rk1/ppppnppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPPQ1PPP/R1B2K1R w Q - 0 8', description: 'Pawn storm' },

  // Endgame principles
  { fen: '8/8/4k3/4p3/4P3/8/8/4K3 w - - 0 1', description: 'K vs K endgame' },
  { fen: '8/8/4k3/4p3/3P4/8/8/4K3 w - - 0 1', description: 'K+P vs K' },
  { fen: '8/8/3k4/3p4/3P4/8/8/4K3 w - - 0 1', description: 'K+P vs K far' },
  { fen: '8/3k4/8/3p4/3P4/8/8/4K3 w - - 0 1', description: 'Opposition key' },
  { fen: 'r3k2r/ppp2ppp/2nqbn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 0 8', description: 'Complex endgame' },
  { fen: '2r3k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', description: 'Rook endgame K' },
  { fen: '3r2k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', description: 'Rook endgame 2' },
  { fen: '2r3k1/p4ppp/8/8/8/8/P4PPP/4R1K1 w - - 0 1', description: 'Rook vs passer' },
  { fen: '2r3k1/p4ppp/8/8/2P5/8/P4PPP/4R1K1 w - - 0 1', description: 'Rook vs pawn' },
  { fen: '3r2k1/p4ppp/8/8/2P5/8/P4PPP/4R1K1 w - - 0 1', description: 'Rook vs advanced' },

  // Queen vs Rook
  { fen: '8/8/8/8/4k3/8/8/3Q2K1 w - - 0 1', description: 'Queen vs king' },
  { fen: '3r4/8/8/8/4k3/8/8/3Q2K1 w - - 0 1', description: 'Queen vs rook' },

  // Minor piece endings
  { fen: '8/8/4k3/4p3/4P3/8/8/4K1N1 w - - 0 1', description: 'K+N vs K' },
  { fen: '8/8/4k3/4p3/4P3/8/8/4K1B1 w - - 0 1', description: 'K+B vs K' },
  { fen: '8/8/4k3/4p3/4P3/8/8/4KBN1 w - - 0 1', description: 'K+B+N vs K' },
  { fen: '8/8/4k3/4p3/4P3/8/8/3K1BN1 w - - 0 1', description: 'Good bishop' },

  // Test suites
  { fen: 'r1bk1bnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', description: 'Four knights' },
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', description: 'Permutation start' },
  { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', description: 'Perfect start' },
  { fen: '1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', description: 'Almost start' },

  // Additional unique positions to reach 100
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5', description: 'Berlin endgame' },
  { fen: 'r3k2r/ppppnppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/R1BQ1RK1 w kq - 0 6', description: 'Open Spanish' },
  { fen: 'r2q1rk1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 9', description: 'Catalan setup' },
  { fen: 'r1bq1rk1/ppppnppp/2n5/3b4/3P4/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 8', description: 'Slav structure' },
  { fen: 'r3kb1r/ppp1qppp/2n1bn2/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 6', description: 'Open Italian' },
  { fen: 'r1bq1rk1/ppp1qppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R2QKB1R w KQkq - 0 7', description: 'Nimzo structure' },
];

/**
 * Run benchmark against all FENs
 */
export async function runBenchmark(
  depth: number = 10,
  elo: number = 1500,
  timeoutMs: number = 5000
): Promise<BenchmarkReport> {
  const results: BenchmarkResult[] = [];
  const startTime = Date.now();
  let successful = 0;
  let legal = 0;
  let illegal = 0;
  let timeout = 0;
  let crash = 0;

  for (const { fen, description } of BENCHMARK_FENS) {
    const result: BenchmarkResult = {
      fen,
      description,
      legal: false,
      bestMove: null,
      source: 'none',
      evaluation: null,
    };

    try {
      const analysisPromise = analyzeFen({ fen, depth, elo });
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      );

      const analysis = await Promise.race([analysisPromise, timeoutPromise]);

      if (analysis) {
        result.bestMove = analysis.bestMove || null;
        result.source = analysis.source || 'unknown';
        result.evaluation = analysis.evaluation || null;

        if (analysis.source === 'stockfish_wasm' && result.bestMove) {
          // Verify legal move
          const game = new Chess(fen);
          const move = game.move({
            from: result.bestMove.slice(0, 2),
            to: result.bestMove.slice(2, 4),
            promotion: result.bestMove[4],
          });

          if (move) {
            result.legal = true;
            legal++;
          } else {
            illegal++;
          }
          successful++;
        } else {
          // Fallback - not counted as successful
          timeout++;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        timeout++;
        result.error = 'timeout';
      } else {
        crash++;
        result.error = String(error);
      }
    }

    results.push(result);
  }

  const totalTimeMs = Date.now() - startTime;

  return {
    total: BENCHMARK_FENS.length,
    successful,
    legal,
    illegal,
    timeout,
    crash,
    totalTimeMs,
    engineSource: 'stockfish_wasm',
    engineVersion: 'unknown',
    depth,
    avgTimeMs: Math.round(totalTimeMs / BENCHMARK_FENS.length),
    results,
  };
}
