# P1-T02 Independent Verification

**Verdict: PASS**  
**Verifier:** independent sub-agent  
**Baseline:** `main` at `7ecc6a6`; no commit or push performed.

## Acceptance evidence

- The four displayed controls are `Dễ`, `Vừa`, `Khó`, and `Thử thách`; their configured ELO `400 < 800 < 1200 < 1600`, depth `4 < 6 < 8 < 10`, movetime `500 < 600 < 800 < 1200`, and Skill Level `0 < 3 < 6 < 10` are strictly increasing.
- A fresh Stockfish 18 handshake advertised `Skill Level min 0 max 20` and `UCI_Elo min 1320 max 3190`. The 400/800/1200 tiers therefore use `UCI_LimitStrength false` with Skill Levels 0/3/6; only the 1600 tier uses `UCI_LimitStrength true` with `UCI_Elo 1600`.
- The shared service now prevents the earlier out-of-range default path: generic analyses below Elo 1320 use Skill Level 20, and Elo-mode values are clamped to 1320–3190.
- The production-build Chromium replay used one live worker for `400 → 800 → 1200 → 1600 → 400`. Every bot search received a fresh mode and strength command before its `go` command, including the 1600-to-400 reverse transition. Post-move annotation searches used Skill Level 20; no strength option leaked into a later bot search. Observed Elo commands were `[1600, 1600]`; out-of-range commands were `[]`.

| Displayed tier | Scoped UCI strength | Search | Real result |
|---|---|---|---|
| Dễ / 400 | `LimitStrength false`, `Skill Level 0` | `go movetime 500` | `e2e4`, legal, depth 15, 501 ms |
| Vừa / 800 | `LimitStrength false`, `Skill Level 3` | `go movetime 600` | `e2e3`, legal, depth 13, 603 ms |
| Khó / 1200 | `LimitStrength false`, `Skill Level 6` | `go movetime 800` | `e2e4`, legal, depth 14, 800 ms |
| Thử thách / 1600 | `LimitStrength true`, `UCI_Elo 1600` | `go movetime 1200` | `g1f3`, legal, depth 16, 1200 ms |
| Dễ / 400 after 1600 | `LimitStrength false`, `Skill Level 0` | `go movetime 500` | `e2e4`, legal, depth 14, 503 ms |

Source provenance was captured from the real `/stockfish-worker.js`, `/stockfish/stockfish.js`, and `/stockfish/stockfish.wasm` responses, all HTTP 200, with best moves read from worker output. Browser console errors, page errors, and network errors were all zero.

## Fresh gates

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- Difficulty/UCI unit tests: 2 files, 30 tests PASS.
- Full unit suite: 31 files, 572 tests PASS.
- `npm run build`: PASS, 4098 modules transformed.
- Full Stockfish Chromium suite: 9/9 PASS.

The earlier config-only tests could falsely accept Elo 1200 because they hard-coded a stale range. The current real-worker E2E handshake closes that gap by deriving the range from the installed engine itself.

## Artifacts

- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/browser.json`
- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/commands.json`
- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/run-1-400.png` through `run-5-400.png`
- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T02/verifier/network-errors.json`
