# P0-T07 Independent Verification

**Verdict: PASS**

All P0-T07 acceptance criteria pass after re-verification of the corrected promotion predicate.

## Resolved finding

### P0-T07-V1 — RESOLVED — false promotion objectives are rejected

`src/services/exerciseValidator.js:23` now requires both a truthy `move.promotion` and exact agreement with the declared `correctMove.promotion` for every promotion-tagged record.

The independent reproduction copied the shipped `knight_capture` record, changed only its id and tags to `['promotion']`, and sent it through the same `validateExerciseRecord` import used in production. The legal move remained `e3-d5` (`Nxd5`), which does not promote. The corrected result is:

```json
{
  "valid": false,
  "exerciseId": "malformed_false_promotion",
  "error": "Move does not achieve the declared promotion"
}
```

Production continues to use this exact validator: `src/pages/Exercises.jsx:4` imports it and line 10 filters records by its result. The repository regression fixture now includes this false-promotion case.

The verifier-owned check is now a direct Node assertion script, `contract-check.mjs`, rather than an auto-discovered Vitest file. It exits successfully with `falsePromotionRejected: true` and `verdict: PASS`, while leaving the canonical unit suite at 31 files and 572 production tests.

## Passing acceptance evidence

- Exactly five shipped seed exercises were replayed independently with `chess.js`; every FEN loaded, every declared move was legal, and the relevant shipped objectives held: `Kf7#`, `Nxd5`, `a8=Q`, `Qxg2#`, and `Bxb5+`.
- The production page imports and applies the shared production validator; malformed FEN, illegal moves, unmet mate/capture objectives, and the false-promotion record are rejected.
- A new profile persisted `profile.v1` with a non-empty `training.v1` plan containing four canonical tasks. The visible Training UI rendered lesson, exercise, opening, and challenge shapes (`Bài học`, `Bài tập`, `Thực chiến`, `Rèn luyện`).
- Repository history at commit `f9613d0` shows the actual legacy daily-plan shape was `{ generatedAt, lesson, exercises, opening, challenge }`. Fresh migration tests confirmed that exact shape converts to `training.v1` with all four task types.
- An entirely malformed persisted plan normalizes to `null` and the profile path regenerates a non-empty canonical plan; profile and plan migration tests passed.
- Built-production Chromium completed six legal plies (`e4 e5 Nf3 Nf6 d3 Nc6`) with a successful Stockfish WASM worker and legal FEN replay. It navigated through visible UI to Training and Exercises, solved the real `mate_one_queen` board exercise by dragging `g6-f7`, and verified `exerciseStats.total === 1` plus persisted completion id `mate_one_queen`.
- Browser console errors: 0. Page errors: 0. Failed/HTTP-error network events: 0.

Browser evidence: `artifacts/tech-verification/PHASE_0/P0-T07/verifier/self-play.json`, `self-play.png`, `browser-console.json`, `page-errors.json`, and `network-errors.json`.

## Fresh verification matrix

| Check | Result |
|---|---|
| Focused repository tests | PASS — 48/48 in 3 files |
| Independent direct contract script | PASS — all five shipped records valid; false promotion rejected |
| Full unit suite | PASS — 572/572 in 31 files |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS — 4098 modules transformed |
| E2E discovery | PASS — 68 tests in 4 files |
| Relevant Chromium E2E | PASS — 1/1 |
| Independent built-production browser journey | PASS |
| `git diff --check` | PASS; line-ending warnings only |

No blocking or non-blocking findings remain. The prior built-production browser evidence remains applicable because the only intervening production change is the stricter rejection predicate; a fresh production build also passed.
