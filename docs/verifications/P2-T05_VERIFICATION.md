# P2-T05 Independent Verification

**Verdict: PASS**  
**Decision Gate: not required**  
**Verified:** 2026-09-06 on `main` at `7ecc6a6` with Node `v24.15.0`, npm `11.12.1`.

## Acceptance result

The canonical validator streams every accepted JSONL row with `createReadStream` and a fatal UTF-8 decoder; there is no sampling flag or sampled validation path. Each contract-valid record is checked for official Lichess identity/URL, CC0-1.0 license, source and row hashes, manifest metadata, pinned themes, independently recomputed normalized checksum, duplicate source ID/key, `sourceFen + precedingMove === fen`, side to move, and a full legal `chess.js` replay. PuzzleRecord v1 supplies strict field/type/FEN/rating/UCI/canonical-record-hash validation. Manifest gates cover schema versions, official source, license, completed status, source SHA-256 format, actual output hash, accepted count, and clean accepted-output counts.

The pinned official [`PuzzleTheme.scala`](https://github.com/lichess-org/lila/blob/50139702e66d67747e5ac0a6482b275f348f0dcd/modules/puzzle/src/main/PuzzleTheme.scala) was fetched and compared independently: **75 official themes, 75 validator themes, zero missing, zero extra**.

`scripts/verify-corpus.cjs` is a minimal compatibility wrapper: it forwards every argument to the canonical validator and propagates status. Fresh subprocess checks proved canonical and wrapper exit `0` for PASS, `2` for validation failure, and `1` for fatal/usage errors. The former sampled synthetic verifier path is gone.

## Actual P2-T04 corpus

Fresh canonical and independent verification of `%TEMP%\chess-p2t04\mini-import-final-1\accepted.jsonl` and its manifest produced:

- **1,000 lines / 1,000 valid / 0 quarantined / 0 reasons**
- **3,732/3,732 legal solution moves replayed**
- **1,000 unique source IDs / 1,000 unique normalized keys**
- source file size **304,384,407 bytes** and freshly calculated source SHA-256 `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`
- accepted output SHA-256 `e23ec11296bfb650805c08a23056df9ea8d267887ffe43181d412a0baaacf8d7`
- independently rebuilt content identity `c836c4470ffc4289945d2e48f987ad1849926f7cb526002bb81e4f9511b00338`
- official URL/license and manifest output/content identities all match; manifest reports zero invalid, duplicate, and quarantine rows.

## Adversarial verification

The verifier-owned harness created and preserved its task-specific cases under `C:\Users\nguye\AppData\Local\Temp\chess-p2t05-verifier-1788661483073`. All expected exact reason/gate sets were observed for malformed JSON, illegal FEN, illegal solution, side mismatch, unknown theme, invalid rating, provenance/license/source/output/record/normalized checksum failures, duplicate source ID, duplicate normalized key, count mismatch, wrong manifest source URL, and malformed manifest source SHA-256. Invalid UTF-8 failed fatally. Unknown and `--sample` options exited `1`.

Reason mapping was exact: illegal FEN/rating/record checksum are `contract_violation`; illegal legal-format move is `illegal_solution`; the remaining cases use their specific provenance, license, checksum, duplicate, side, theme, malformed, or manifest gate codes. Evidence: `validator-audit.json`, `static-audit.json`, and the preserved temp reports/quarantines.

## Fresh gates

- Focused corpus/contract suite: **4 files, 31 tests PASS**.
- Full suite: **37 files, 692 tests PASS**.
- ESLint: PASS, zero warnings.
- TypeScript `--noEmit`: PASS.
- Production build: PASS; 4,103 modules and 45 PWA precache entries.
- `git diff --check`: PASS (only existing line-ending warnings).
- Dependency audit: no lockfile or dependency change; the package diff only broadens existing Playwright script targets.
- Production-path search found no synthetic/fake/mock/generated corpus reference in the canonical validator/wrapper or non-test corpus/exercise production modules.

## Production Chromium

The first verifier run was intentionally preserved as `browser-failure.json`: the harness had not dismissed the onboarding overlay and timed out before starting the game. After correcting only the verifier harness, the **entire scenario** was rerun from navigation.

The corrected hashed-production run passed on `/play`: `e4 e5 Nf3 d6 d3 Nf6` (**6 legal plies**), replayed to FEN `rnbqkb1r/ppp2ppp/3p1n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4`. Chromium observed `/stockfish-worker.js?v=2026-05-30-simplified`, a successful real `stockfish_wasm` ready event, and multiple `bestmove` outputs. Production asset URLs were hashed. Console errors: **0**; page errors: **0**; failed/HTTP-error network requests: **0**.

No implementation, production test, dependency, or prior evidence was changed by this verifier. No commit or push was performed.
