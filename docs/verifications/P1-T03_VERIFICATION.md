# P1-T03 Independent Verification

**Verdict: PASS**  
**Date:** 2026-09-06  
**Scope:** cancellation, timeout ownership, stale-response isolation, and one bot move per turn.

## Independent code audit

The production request is cancelled at the shared boundary rather than hidden only in the UI:

- `useBotMove` invalidates its generation, owns one `AbortController` per request, passes its signal to `getBotMove`, and aborts it on explicit cancellation or hook timeout.
- Each request clears only its own timer/controller in `finally`; a stale request cannot clear the newer request's timeout.
- `botService.getBotMove` forwards the same signal into `EngineConfig`, checks it before and after analysis, and rethrows abort instead of silently returning a heuristic move.
- `stockfishService.analyzeFenNow` checks queued-request aborts before work, attaches an abort listener to the active analysis, terminates the captured worker, rejects the cancelled promise, and leaves the serialized queue able to run the next request.
- `ChessGameBoard` observes `botRequestId` changes and calls `cancelMove()` before the bot-trigger effect, so new game/undo/resign generation changes cancel the old search even if the next game does not immediately need a bot move.

No parallel implementation, new dependency, mock production fallback, or swallowed cancellation was found.

## Fresh command evidence

| Gate | Result |
|---|---|
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| Targeted hook/board Vitest | PASS, 2 files / 23 tests |
| `npm run test` | PASS, 31 files / 574 tests |
| `npm run build` | PASS, 4098 modules transformed |
| Targeted real Stockfish Playwright | PASS, 2/2 |
| Full `e2e/stockfish.spec.js` | PASS, 10/10 |
| Independent production-browser verifier | PASS, exit 0 |
| `git diff --check` | PASS, exit 0 |

Machine-readable command summary: `artifacts/tech-verification/PHASE_1/P1-T03/verifier/commands.json`.

## Acceptance-criteria replay

| Acceptance criterion | Independent evidence | Result |
|---|---|---|
| Cancel pending request | White and Black UI flows cancelled an active `go movetime 1200`; old worker 1 was terminated and its search retained `bestmove: null`. | PASS |
| New game discards old response | Both colors used the real **Ván mới** confirmation. White history was exactly empty after reset; neither color received a move from the terminated worker. | PASS |
| Timeout cannot contaminate next request | The failure scenario shortened only the first hook timer from the unchanged production request of 15,000 ms to 250 ms. It terminated worker 1 with no move/history; the next request kept 15,000 ms, created worker 2, returned legal `d2d4`, and produced exact history `["d4"]`. | PASS |
| One bot move per turn | White recovery history was exactly `["e4", "d5"]`; Black recovery history was exactly `["d4"]`. Each UI bot SAN matched the replacement worker's real UCI `bestmove`; no duplicate bot ply appeared. | PASS |
| Real engine/source | Every White, Black, and timeout-recovery run loaded `/stockfish-worker.js`, `/stockfish/stockfish.js`, and `/stockfish/stockfish.wasm` with HTTP 200. Replacement moves were legal under `chess.js`. | PASS |
| Error hygiene | Browser console errors `[]`, page errors `[]`, failed/HTTP-error requests `[]`. | PASS |

The production `useBotMove` timeout remains 15,000 ms. No production timeout was increased for P1-T03. The 250 ms value exists only inside the independent failure-injection harness and the immediately following real recovery request retained 15,000 ms; this is not an arbitrary timeout inflation.

## Production-browser artifacts

- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/browser.json`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/white-lifecycle.png`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/black-lifecycle.png`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/timeout-isolation.png`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T03/verifier/network-errors.json`
- Reproducer: `artifacts/tech-verification/PHASE_1/P1-T03/verifier/verify.mjs`

## Findings

No blocker or implementation finding. The initial verifier-only 10-ply extension was discarded after its own board-action orchestration failed; it was not used as product evidence. The final bounded verifier directly covers P1-T03's cancellation and timeout acceptance criteria with real production Stockfish.
