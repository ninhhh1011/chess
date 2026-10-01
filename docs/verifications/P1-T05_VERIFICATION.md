# P1-T05 Independent Verification

**Verdict: PASS**

I independently inspected the P1-T05 analyzer, parser/replay contract, Stockfish service boundary, production review route, focused tests, and benchmark wording. No unresolved P1-T05 finding remains.

## Contract review

- Pass 1 evaluates the initial FEN once and then every post-move FEN once, reusing each prior result for the next move. For an 80-ply input this is 81 engine positions and exactly 80 ordered facts, one per ply.
- Candidate ordering is deterministic: descending centipawn loss, then ascending ply. Pass 2 deep-analyzes only those selected game-position candidates.
- Engine errors and cancellation no longer disappear. Focused service tests assert exact pass/ply or pass/candidate messages for pass-1 failure, shallow cancellation, pass-2 failure, and deep cancellation.
- The production `Phân tích` -> `Mổ ván cờ` button calls `analyzeGame` with the current PGN and renders evidenced candidate facts.
- The 40-move/80-ply test is explicitly a mocked deterministic unit contract: it uses `vi.mock('../services/stockfishService')`, asserts 80 unique contiguous facts and candidates 21/22, and makes no real latency claim. `docs/PHASE_1_IMPLEMENTATION_REPORT.md` now marks the 2026-09-03 table superseded/non-current; P1-T08 owns fresh real-WASM latency.

## Fresh command evidence

| Gate | Result |
|---|---|
| Targeted analyzer/parser/routing | PASS — 4 files, 38 tests |
| Full unit/integration suite | PASS — 32 files, 581 tests |
| Lint | PASS — 0 warnings/errors |
| Typecheck | PASS — `tsc --noEmit` |
| Production build | PASS — 4,102 modules transformed |
| `git diff --check` | PASS — exit 0; line-ending notices only |

Raw command summary: `artifacts/tech-verification/PHASE_1/P1-T05/verifier/commands.json`.

## Independent production replay

A fresh built preview ran at `http://127.0.0.1:4193`. Chromium selected the actual 1600-level bot, played 14 legal plies, clicked the real `Phân tích` tab and `Mổ ván cờ` button, and observed worker traffic without replacing or mocking the worker.

- Played SAN: `e4 e6 Na3 Bxa3 b3 Bc5 f3 d6 e5 Nc6 exd6 cxd6 b4 Bb6`.
- Worker URL: `/stockfish-worker.js?v=2026-05-30-simplified`.
- Pass 1: 15/15 positions, exactly the initial FEN followed by all 14 played-position FENs in order; every search returned `bestmove`.
- Pass 2: 3 candidates, all matching positions from the played game.
- Rendered facts: `#5 b3`, `#9 e5`, and `#6 Bc5`, each with a displayed engine recommendation.
- Analysis navigation: selecting the first move changed the navigator to `1 / 14`; the screenshot shows the board at `1. e4`.
- Browser console errors: 0. Page errors: 0. Failed/HTTP-error requests: 0.

Production evidence:

- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/production.json`
- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/worker-messages.json`
- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/review-navigation.png`
- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_1/P1-T05/verifier/network-errors.json`

## Findings resolved during verification

1. Service tests initially covered only pass-1 failure/cancellation. Two focused regressions now prove exact pass-2 failure and cancellation messages.
2. The historical Phase 1 report initially attributed old real-WASM latency numbers to the now-mocked 80-ply unit. It now clearly labels the unit as mocked/deterministic and the old table as superseded/non-current.
3. The first random 10-ply verifier game produced no >80 CPL candidate, so it was rejected as insufficient evidence rather than treated as a product failure. A 14-ply expert-bot game deliberately exposed material and produced three independently observed pass-2 candidates.

No package, provider, model, storage, schema, production source, or test behavior was changed by the verifier.
