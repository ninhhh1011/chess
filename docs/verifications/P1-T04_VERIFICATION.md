# P1-T04 Independent Verification

Date: 2026-09-06  
Verifier: independent `p1_t04_verifier` agent  
Verdict: **PASS**

## Scope and source contract

I independently read the parser, fixtures, tests, benchmark caller, analysis caller, and production PGN-copy path. I fetched the official Lichess Game Export endpoint with the representation used by the fixture:

`GET https://lichess.org/game/export/rklpc7mk?clocks=false&evals=false&literate=true`  
`Accept: application/x-chess-pgn`

The response was HTTP 200 with `Content-Type: application/x-chess-pgn`. After converting CRLF to LF and trimming only outer whitespace, both the live response and `RKLPC7MK_FULL_PGN` had SHA-256 `26588cdc4a69df0c2e3108ff707ddb37e18bf402bd96fbbc5295708025b63a8a`; content matched exactly.

The source game and the benchmark input are deliberately distinct:

- Official full source: 47 full moves, 94 contiguous plies, result `0-1`, final FEN `8/p5p1/6P1/6bP/K1pk4/8/8/8 w - - 0 48`.
- Named benchmark prefix: first 40 full moves, 80 contiguous plies, result `*`, final FEN `8/p3k1p1/2p3P1/1p2K2P/8/8/P7/2b5 w - - 0 41`.

The unparameterized endpoint currently includes `%eval` comments, so its checksum differs. This is not the fixture representation and must not be used as its checksum contract.

## Parser and replay checks

Fresh direct contract execution and the 44-test targeted suite proved:

- headers are preserved;
- mainline comments are attached to the correct resulting position;
- RAV moves are excluded from the replay mainline;
- `$1` NAG syntax is accepted without polluting SAN history;
- ply numbering is contiguous from 1;
- `[SetUp "1"]` plus `[FEN "..."]` starts from the declared position and reaches the expected FEN;
- malformed PGN returns `success: false` with a non-empty structured error;
- the exact full Lichess export and the 40/80 benchmark prefix replay legally to their separate stable FENs.

## Fresh gates

| Gate | Result |
|---|---|
| Targeted parser/corpus/latency | PASS — 3 files, 44 tests |
| Latency fixture | PASS — cold 5382 ms; warm 5286 ms / 5275 ms; 80 plies/facts |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — 31 files, 577 tests |
| `npm run build` | PASS — 4098 modules |
| `git diff --check` | PASS |

## Production self-play

I served the fresh production build separately at `http://127.0.0.1:4181`, opened `/play` in Chromium, chose a real difficulty and White, and played 10 plies through board clicks. The page loaded `/stockfish-worker.js?v=2026-05-30-simplified`; completed worker searches produced the bot moves.

I clicked the actual `Sao chép PGN` control, read the real browser clipboard, loaded that PGN into installed `chess.js`, and compared all SAN moves to the visible move history. Both sequences were exactly:

`a3 g6 a4 Nf6 a5 c5 a6 Nxa6 b3 Bg7`

Replay final FEN was `r1bqk2r/pp1pppbp/n4np1/2p5/8/1P6/2PPPPPP/RNBQKBNR w KQkq - 1 6`. Console errors, page errors, and failed/HTTP-error network requests were all zero.

## Documentation clarification

No blocking runtime or parser finding remains. However, the current in-progress plan sentence and the historical Phase 1 report abbreviate this as “Lichess game `rklpc7mk`, 40 moves/80 plies.” Task closeout should say “the first-40/80 benchmark prefix of the official 47/94 game” so the full source is never mistaken for a 40-move game.

## Evidence

- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/source-contract.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/parser-contract.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/commands.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/production.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/production-export.png`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/network-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T04/verifier/verify-production.mjs`
