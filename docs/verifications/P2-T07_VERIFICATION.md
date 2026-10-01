# P2-T07 Independent Verification

Verdict: **PASS / VERIFIED**  
Verifier scope: production delivery strategy only  
Baseline: `main` at `7ecc6a6`; no commit or push

## Acceptance result

| Requirement | Independent evidence | Result |
| --- | --- | --- |
| A clean deployment obtains a verified corpus or truthfully disables it | A candidate assembled only from `git ls-files --cached --others --exclude-standard` contained the versioned static corpus, passed typecheck/build, and opened `lichess-0000D` in its production build. | PASS |
| Checksum is verified before activation | Delivery tests rejected chunk tampering. The production chunk SHA-256 matched its manifest. Adversarial source-version/source-SHA tests pass after the trust-boundary fix. | PASS |
| No hidden local artifact is required | The clean 956-file candidate did not contain `src/data/generated/generatedPuzzles.json`; both `public/corpus` and built `dist/corpus` were present. | PASS |
| Clean checkout opens a real imported puzzle | Chromium displayed `Lichess puzzle 0000D`, the real FEN, `Bài 1 / 1000`, and visible links to the Lichess puzzle and CC0-1.0 license. All three corpus requests returned HTTP 200. | PASS |
| General production self-play remains healthy | A separate `/play` run completed six legal plies (`e4 e6 Nf3 a5 d3 b6`), replayed through `chess.js` to a legal final FEN, and used a ready Stockfish WASM worker with real `bestmove` output. | PASS |
| No browser/runtime regressions | Production Chromium recorded zero console errors, page errors, and failed/error responses. | PASS |
| Rollback boundary remains safe | Focused delivery tests cover failed validation without pointer mutation and refusal to roll back to a corrupted chunk before a successful verified rollback. | PASS |

## Independent finding and correction

The first adversarial run found a real trust-boundary defect: `loadProductionCorpus()` accepted an arbitrary 64-hex source checksum and arbitrary dataset version when the attacker also recomputed record and chunk checksums. Both tests failed because the forged corpus was activated.

The implementation was returned to the executor without verifier edits. After the root fix, the loader and delivery builder pin the approved source URL/license, dataset version `2026-08-02`, and exact official source SHA-256 `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`; the loader also checks each record's source version, source ID, and canonical Lichess URL. The same two adversarial tests then passed.

## Fresh gates

- Focused delivery/UI/source-pin: 3 files, 5/5 tests PASS.
- Full standalone suite: 41 files, 700/700 tests PASS in 65.18s.
- ESLint: PASS, zero warnings/errors.
- TypeScript: PASS.
- Workspace production build: PASS, 4,104 modules.
- Clean-candidate typecheck/build: PASS, 4,063 modules; 1,000-puzzle `dist/corpus` present with matching chunk SHA.
- `git diff --check`: exit 0; line-ending conversion warnings only.
- Production Chromium: real imported puzzle and provenance visible; three corpus HTTP 200 responses; six-ply Stockfish WASM game; zero console/page/network errors.

One invalid harness command, `npm test -- --runInBand`, stopped before executing tests because Vitest does not support that Jest option. It was immediately replaced by the standalone full-suite command above and is retained in the command ledger rather than hidden.

## Evidence

- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/source-pin-adversarial.test.ts`
- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/commands.json`
- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/clean-candidate.json`
- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/production.json`
- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/real-puzzle.png`
- `artifacts/tech-verification/PHASE_2/P2-T07/verifier/six-ply.png`

P2-T07 satisfies its plan acceptance criteria with no new dependency, service, storage provider, dataset, license, or platform. No Decision Gate is required.
