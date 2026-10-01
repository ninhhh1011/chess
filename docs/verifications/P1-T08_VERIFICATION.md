# P1-T08 Independent Verification

**Verdict: PASS**

P1-T08 was independently exercised from fresh evidence. The exact Lichess `rklpc7mk` fixed first-40/full-move prefix passed parsing, legal replay, real-browser Stockfish analysis, repository quality gates, the full browser suite, and a fresh hashed-production self-play scenario. No production source or test was modified, and no commit or push was made.

## Fresh repository gates

| Gate | Result |
|---|---|
| ESLint | PASS — 0 errors, 0 warnings |
| TypeScript | PASS |
| Unit/integration | PASS — 33 files, 592 tests |
| Production build | PASS — 4103 modules, 7.33 s, `/assets/index-CozSBo6p.js` |
| Playwright discovery | PASS — 72 tests in 4 files |
| Full Chromium E2E | PASS — 72/72 in 3.7 min |

## Exact browser benchmark

The benchmark directly invoked `analyzeGame` through the Vite browser module graph on the separately confirmed-free port `4219`. This is intentional: direct module access was required, while execution still occurred in native Chromium with a real `Worker`. There were no mocks.

Fixture invariants all passed: game `rklpc7mk`; deliberately fixed first 40 full moves of the official 47-move game; 40 full moves; 80 plies; 80 ordered facts; legal final FEN `8/p3k1p1/2p3P1/1p2K2P/8/8/P7/2b5 w - - 0 41`.

| Run | Wall duration | Analyzer duration | Pass 1 | Pass 2 | Completed worker searches | Worker creation |
|---|---:|---:|---:|---:|---:|---:|
| Cold | 42,997 ms | 42,925 ms | 81 | 2 | 83/83 | 1 |
| Warm 1 | 42,699 ms | 42,646 ms | 81 | 2 | 83/83 | 0 |
| Warm 2 | 42,764 ms | 42,710 ms | 81 | 2 | 83/83 | 0 |

Median was **42,764 ms** and maximum was **42,997 ms**. Every run used the historical request options `maxDepth: 10`, `movetimeMs: 500`, `multiPv: 1`, `analyzeTopMistakes: 2`; returned 80/80 facts with source `stockfish_wasm`; selected plies 25 and 62 for pass two; and had 83 searches with `info`, 83 legal `bestmove` results, zero source violations, zero illegal moves, zero errors, and zero timeouts.

No-fallback proof is direct rather than inferred: the native Worker loaded `/stockfish-worker.js?v=2026-05-30-simplified`; the bridge worker, `/stockfish/stockfish.js`, and `/stockfish/stockfish.wasm` all returned HTTP 200; and all 83 searches per run produced legal worker best moves while all 80 facts reported `stockfish_wasm`. Browser console, page, and network error lists were empty.

## Why the median differs by more than 20%

Against the requested previous median of 5,365 ms, the fresh 42,764 ms median is **+697.1%**. This is not a valid like-for-like regression comparison.

At historical commit `c5a33af`, Vitest used jsdom and its setup installed no Worker. `stockfishService` explicitly returned `false` when `Worker` was unavailable and then used fallback analysis. The latency test did not supply a Worker or capture worker commands. Meanwhile, `gameAnalyzer` hardcoded `source: 'stockfish_wasm'` into placeholder facts and its top-level result, and the test printed the source as a literal before asserting only that hardcoded result. Its first-pass call also did not forward `movetimeMs: 500`. The historical report recorded zero pass-two positions.

There is also a historical-number discrepancy: `PHASE_1_IMPLEMENTATION_REPORT.md` at `c5a33af` records a 5,772 ms median, while `FINAL_VERIFICATION_REPORT.md` labels 5,365–5,377 ms as “previously reported.” Neither value proves a real Worker workload.

The corrected run completes 83 real searches. At 500 ms per search, the nominal search-time floor alone is 41,500 ms; the measured median is only about 1,264 ms above it and remains below the historical 60-second per-run gate. The large percentage increase is thus explained by measuring the requested real engine work instead of fallback plus hardcoded provenance.

## Fresh hashed-production self-play

The freshly built production bundle was served on the separately confirmed-free port `4218`.

| Requirement | Fresh evidence |
|---|---|
| White click game + Hint | PASS — exactly 20 legal plies; Hint exercised |
| Black drag game + Undo | PASS — 21 legal plies; Undo changed move count 3 → 1 before continuation |
| Pending bot → New Game isolation | PASS — stale bot move discarded and pending worker 1 terminated |
| Resign | PASS — confirmed |
| Real Stockfish review | PASS — 28 completed review searches; fact `review-1788637399756:ply:10`, source `stockfish_wasm`, Black to move, 747 CPL blunder, played `d6e5`, best `d6b6` |
| Review navigation | PASS — `10 / 21 -> 0 / 21 -> 1 / 21` |
| Worker telemetry | PASS — real worker URL, 2 workers, 138 searches across scenario |
| Runtime errors | PASS — zero console, page, and network errors |

The final screenshots were visually inspected and corroborate the White interaction, Black orientation/review state, and reset/lifecycle state.

## Harness corrections and evidence

Verifier-only problems were preserved and corrected before complete reruns. The initial benchmark used a `.ts` browser import where the live module path was `.js`; it failed with HTTP 404 before any search, then the entire cold/two-warm sequence was rerun. Self-play iterations exposed an Undo settle race, premature review navigation, a quiet line that ended too early, and finally an all-best-move line with no qualifying review fact. The final harness used lifecycle-correct waits and a bounded genuine mistake, then reran the full production scenario successfully. These were harness/test-data issues; the final production run had no browser, page, or network errors.

Evidence is under `artifacts/tech-verification/PHASE_1/P1-T08/verifier/`: `benchmark.json`, `self-play.json`, `historical-audit.json`, `commands.json`, `harness-failures.json`, the two raw rolling failure records, and three final screenshots.

Final verifier lint, parsing of all seven JSON evidence files, and `git diff --check` passed. Git emitted only pre-existing LF-to-CRLF working-copy notices. Unrelated dirty files remained untouched.
