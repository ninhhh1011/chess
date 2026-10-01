# P1-T01 Independent Verification

**Verdict: PASS**  
**Open findings:** none  
**Verifier scope:** Stockfish service, bridge worker, app cleanup and callers, tests, pinned assets, canonical documentation, native-worker lifecycle, and built production self-play. This verifier changed only its report and raw-evidence directory.

## Acceptance-criteria result

- Real engine handshake and move: PASS. Native Chromium loaded `/stockfish-worker.js?v=2026-05-30-simplified`, `/stockfish/stockfish.js`, and `/stockfish/stockfish.wasm`; all requests returned HTTP 200. Warm-up and restarted analyses returned legal moves with `source: stockfish_wasm`, observed depth, and engine time. No mock or fallback response was used.
- Active-analysis disposal: PASS. Disposing a `go movetime 5000` analysis promptly rejected it with `Stockfish analysis disposed`, terminated outer worker 1, and left no completed best move from that search. Re-initialization created worker 2, which reported ready and returned legal `d2d4` at depth 11 and engine time 100 ms. Only worker 1 was terminated.
- Cold-initialization disposal: PASS. The independent harness delayed only the first real outer worker's `init` delivery; it synthesized no Stockfish response. Disposal while state was `loading` settled the first init `false` immediately (0 ms in the final replay), terminated worker 1, and allowed worker 2 to report real ready. After an explicit 10.5-second wait beyond the original 10-second stale-timeout horizon, the service remained `ready`; worker 2 was not terminated. Audit: created `[1, 2]`, terminated `[1]`.
- No silent happy-path fallback: PASS. All happy-path lifecycle and browser move evidence came from real worker ready/output/bestmove messages and is labeled `stockfish_wasm`.
- Production White/Black self-play: PASS. Each built-preview game reached 10 legal plies and replayed from PGN without error, with a successful real ready handshake and multiple measured best moves.

## Fix audit

The final service uses one shared `engineInitPromise`, a cancellable initialization callback, and a worker identity captured per initialization. Its single `finish()` path clears the timeout, cancel callback, and shared promise; message/error/timeout handlers ignore stale workers; `disposeEngine()` cancels initialization before stopping analysis and terminating the current worker. The implementation closes the previously reproduced stale-timer race without giving an old initialization authority over a replacement worker.

The added browser regression disposes during cold loading and verifies prompt settlement plus replacement readiness. The independent replay adds the missing real 10.5-second horizon proof; the repository test deliberately shortens the first timeout only to keep the suite fast.

## Fresh automated verification

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- Targeted Stockfish/hook tests: 3 files, 13/13 PASS.
- Full unit/integration suite: 31 files, 572/572 PASS.
- `npm run build`: PASS, 4098 modules transformed and PWA assets generated.
- `npx playwright test e2e/stockfish.spec.js`: 8/8 PASS in 27.5 seconds, including active-analysis and cold-init disposal regressions.
- `git diff --check`: PASS; only line-ending notices were emitted.

## Built production-preview self-play

The final browser games ran against `npm run preview` serving the freshly built `dist` at `http://127.0.0.1:4182`.

- White: 10 plies, `1. a3 c5 2. a4 Nc6 3. a5 Nf6 4. a6 d5 5. b3 e5`; final FEN `r1bqkb1r/pp3ppp/P1n2n2/2ppp3/8/1P6/2PPPPPP/RNBQKBNR w KQkq - 0 6`; observed depths 13-16, engine time 400-504 ms, wall time 413-513 ms.
- Black: 10 plies, `1. e4 Nc6 2. d4 Rb8 3. Nc3 Ra8 4. Nf3 Rb8 5. d5 Ra8`; final FEN `r1bqkbnr/pppppppp/2n5/3P4/4P3/2N2N2/PPP2PPP/R1BQKB1R w KQk - 1 6`; observed depths 12-15, engine time 400-508 ms, wall time 409-525 ms.
- Browser console errors: 0; page errors: 0; failed or HTTP-error requests: 0.
- Worker, engine JS, and WASM requests all returned HTTP 200.

Raw production evidence is in `artifacts/tech-verification/PHASE_1/P1-T01/verifier/preview-browser.json`; screenshots are `self-play-w.png` and `self-play-b.png`.

## Assets and documentation

- `stockfish` is pinned to `18.0.7` in both package manifests.
- `public/stockfish-worker.js`: 4,407 bytes, SHA-256 `E7B39F6C9FE44CACB5BA06486AA614508FA88F4FE4D076A8BA956C7EFA942431`.
- Active `public/stockfish/stockfish.js`: 20,670 bytes, SHA-256 `2278005057F381491F1C9BB3E44C9F5920B3A00BEF9759E33CC6582769A1F1FE`; exact match for pinned package `stockfish-18-lite-single.js`.
- Active `public/stockfish/stockfish.wasm`: 7,295,411 bytes, SHA-256 `A8FBC05EC6920B56D7485826DCB02C5FFD2826BCBF751CF973046F237A9096F1`; exact match for pinned package lite-single WASM.
- Current `README.md` and `docs/ARCHITECTURE.md` truthfully identify the active worker path and explicitly distinguish legal fallback moves from `stockfish_wasm`. No active v2 worker path is claimed.

## Prior finding closure

The first independent run reproduced one HIGH cold-init defect: a disposed init remained pending until its old 10-second timer fired and terminated a freshly ready replacement worker. The revised promise/cancel/identity implementation was then independently re-inspected and replayed. The final evidence above closes that finding; no severity findings remain.

## Gate decision

P1-T01 is independently verified and may advance.
