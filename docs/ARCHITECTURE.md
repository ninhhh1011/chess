# Runtime Architecture

This document describes the current production import graph. See [CURRENT_RUNTIME.md](CURRENT_RUNTIME.md) for verification status and evidence precedence.

## Browser application

```text
src/main.jsx
  → src/App.jsx
      → route pages
      → AuthProvider
      → ChessGameProvider
      → shared layout and error boundary
```

Routes are lazy-loaded from `src/pages`. State is primarily browser-local unless an authenticated Supabase path is configured.

## Chess engine and bot

```text
Play / analysis UI
  → ChessGameBoard / EngineAnalysisPanel
  → useBotMove / useEngineAnalysis
  → botService / stockfishService
  → public/stockfish-worker.js
  → Stockfish WASM
```

`stockfishService.ts` owns the single worker and serializes analysis requests. `botService.ts` validates returned UCI moves. Both the engine service and bot service contain legal-move fallback paths for unavailable or failed Stockfish; those paths are not represented as Stockfish results.

There is no active `stockfish-worker-v2.js` path.

`App.jsx` disposes the engine when the application unmounts. Disposal settles any pending initialization or active analysis, terminates that worker, and lets the next request initialize a fresh worker; stale initialization handlers cannot change the replacement worker's state.

Bot requests carry one `AbortSignal` from `useBotMove` through `botService` to the active Stockfish analysis. New-game generation changes and hook timeouts terminate that request's captured worker and settle its promise; request-owned timer/controller cleanup cannot clear a newer request, and cancelled analysis is never converted into a heuristic move.

Displayed bot constraints are defined once in `src/data/botLevels.js`: Elo labels 400/800/1200 use Stockfish Skill Levels 0/3/6 with 500/600/800 ms searches, while 1600 uses `UCI_Elo 1600` with 1200 ms. Stockfish 18 advertises Skill Level 0–20 and `UCI_Elo` 1320–3190. The engine service never sends Elo outside that range; generic analysis uses full Skill Level 20.

## PGN replay

`src/services/analysis/pgnParser.ts` delegates PGN syntax, legality, variations, comments, NAGs, and SetUp/FEN handling to the installed chess.js parser. It exposes only chess.js verbose mainline history, using each move's `after` FEN and contiguous array index as the ply number; malformed input returns an explicit structured failure. The exact official 47-move/94-ply `rklpc7mk` export and its deliberately truncated first-40/80 benchmark input are separate fixtures with separate final FENs.

## Post-game analysis

The production `ChessGameBoard` review action calls `src/services/analysis/gameAnalyzer.ts`. Pass 1 asks the shared Stockfish service for the initial position and each post-move position exactly once, then compares each pre/post pair from the mover's perspective. Candidates are ordered by descending CPL and ascending ply. Pass 2 analyzes each selected move's pre-move FEN so the recommendation is an alternative to the played move; failures and cancellation identify the exact pass location instead of being skipped.

Each analyzed ply is an `analysis.v1` fact validated by `src/services/analysis/analysisFact.ts` before it leaves the analyzer or enters review, learning, or Coach. Its stable evidence identity is `${gameId}:ply:${ply}`; no duplicate ID field or schema version was added. The validator checks legal pre/post FEN, exact SAN/UCI/resulting FEN for played and best moves, evaluations, non-empty candidates containing the best move, PV anchoring, engine source, and timestamp. If Stockfish's final `bestmove` differs from the last streamed PV head, the fact keeps the authoritative final move and a one-move PV instead of joining incompatible lines.

Stockfish scores are normalized once to White's perspective, then CPL is calculated from the mover recorded in the pre-move FEN: White loses value when the score falls; Black loses value when it rises. Signed mate values share an ordered scalar with centipawn scores, and CPL is clamped at zero for engine noise. The existing 0/10/30/80/200 classification boundaries are unchanged. The worker retains the latest streamed PV line, and the fact boundary replays every PV move legally from `fenBefore`.

## Exercises and corpus

`src/pages/Exercises.jsx` renders the five bundled records from `src/data/exercises.js`. `src/services/corpusLoader.ts` exposes the external-corpus availability state and currently returns zero records with an explicit unavailable reason. The legacy `src/data/corpusPuzzles.ts` file is not imported by production code.

## Training and persistence

`src/services/userProfileService.js` is the local profile store. `recommendationService.js` derives local training recommendations. Authenticated sync routes through `syncService.js`, `cloudProfileService.js`, and the Supabase client; that deployed path requires separate credential and runtime verification.

## Coach

```text
AICoachPanel.tsx
  → coachService.ts
  → POST /api/coach
      → api/coach.js (Vercel) or server/routes/coach.js (local Express)
      → api/coachHandler.js
```

The client and both server adapters use the exact `coach.v1` request/response contract. `api/coachHandler.js` is shared by both server entry points. The UI derives its source label from the returned response: `llm` is labeled AI, while provider absence/failure degrades to `basic` and is labeled “Diễn giải cơ bản · Không dùng AI”. Live model/provider success is not claimed as verified here.

## Dormant modules

`mockCoachService.ts`, `embeddingService.js`, `vectorSearchService.js`, and `corpusPuzzles.ts` are not in the current production import graph. Keep or remove them only through a scoped task with fresh evidence.
