# P1-T07 Independent Verification

**Verdict: PASS**  
**Verified:** 2026-09-06 02:00 +07:00  
**Verifier scope:** evaluation orientation, mate ordering, mover CPL, classification thresholds, legal PVs, and production review labels for both colors.

## Fresh gates

| Gate | Result |
| --- | --- |
| Targeted orientation/analyzer/fact/worker tests | PASS — 5 files, 46 tests |
| Full unit/integration suite | PASS — 33 files, 592 tests |
| ESLint | PASS — 0 warnings/errors |
| TypeScript | PASS |
| Production build | PASS — 4,103 modules |
| Stockfish browser E2E | PASS — 10/10 |
| Final `git diff --check` | PASS — no whitespace errors |

## Contract evidence

- White/Black symmetry is routed through `calculateMoverCPL(evalBefore, evalAfter, mover)`. The symmetric fixtures prove a 200 cp loss for both `+100 -> -100` by White and `-100 -> +100` by Black, while improving/noisy moves clamp to 0.
- Mate ordering is monotonic: shorter winning mates outrank longer winning mates; longer survival outranks faster loss; a winning mate outranks a finite cp advantage and a losing mate ranks below it.
- CPL is non-negative at its shared calculation boundary and the `analysis.v1` validator independently rejects a negative value.
- Classification boundaries remain identical to `HEAD`: `0 best`, `<=10 excellent`, `<=30 good`, `<=80 inaccuracy`, `<=200 mistake`, `>200 blunder`. No threshold was changed.
- Candidate validation replays every UCI in a PV from the fact's `fenBefore`; the regression test rejects an illegal second PV move. The worker service retains the latest PV line rather than concatenating streamed lines.

## Fresh production evidence

Built output was served at `http://127.0.0.1:4207`; loaded scripts were hashed `/assets/` files, with no `/src/` development module. The harness played 14 legal plies as each color, opened the production review, independently recomputed every displayed fact, replayed displayed played/best moves, traced the worker, and replayed every captured latest PV.

| Player side | Selected displayed fact | Independent CPL calculation | UI label | Real worker correlation |
| --- | --- | --- | --- | --- |
| White | ply 13, `Qd3`, eval `-590 -> -1003` | `max(0, -590 - -1003) = 413` | `blunder` | displayed `e2c4` matched worker `bestmove e2c4` at exact FEN |
| Black | ply 4, `Qg5`, eval `-48 -> +686` | `max(0, 686 - -48) = 734` | `blunder` | displayed `e5e4` matched worker `bestmove e5e4` at exact FEN |

- Production review searches: 21 White-run + 24 Black-run = **45**.
- Legal latest worker PVs: **45/45**.
- Review fact engine source: **`stockfish_wasm`**.
- Stockfish worker URL observed in both contexts: `/stockfish-worker.js?v=2026-05-30-simplified`.
- Browser console errors: **0**; page errors: **0**; failed/HTTP-error network requests: **0**.
- Screenshots were visually inspected: review badges and orientation-correct board layouts were rendered for both colors.

One initial harness attempt timed out on an exact localized button label before review began. The verifier changed only its own selector to target the Review article structurally and reran the entire two-color production flow; no product assertion failed in the aborted attempt.

## Evidence

- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/production.json`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/commands.json`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/network-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/white-review.png`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/black-review.png`
- `artifacts/tech-verification/PHASE_1/P1-T07/verifier/verify-production.mjs`

No commit or push was performed.
