# P2-T03 Independent Verification

**Verdict:** PASS  
**Decision Gate required:** No  
**Verified:** 2026-09-06 (UTC+07) on `main` at `7ecc6a6`

## Acceptance result

The versioned `puzzle-record.v1` contract contains all 16 required fields: schema version; internal and source record IDs; source URL, version, publication timestamp, and retrieval timestamp; license ID and URL; raw-source and canonical-record SHA-256 values; FEN; UCI moves; rating; and themes.

Runtime validation now rejects:

- every missing required field, including values supplied only through an object's prototype chain;
- null/array/non-object inputs and unknown enumerable fields;
- unknown schema versions, blank/non-string identifiers, non-HTTP(S) URLs, non-canonical timestamps, malformed SHA-256 values, malformed FEN/UCI arrays, non-integer or negative ratings, and empty/blank/non-string themes;
- post-signature mutation of each canonical content category through a `recordSha256` mismatch.

Canonicalization uses a fixed field order. Node/test and Chromium both produced the pinned digest `b29075acbedc3d20dbb3c3e77672c10f8bb2d86b387c28ea0e641a8cefd751db` for the fixture, including when its input object keys were reversed.

## Adversarial finding and correction

The initial meaningful adversarial run found a real defect: `validatePuzzleRecord` read required fields through the prototype chain. An object with zero own properties could inherit plausible field values and use SHA-256 of `{}` (`44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a`) to be accepted. That run was **57 passed / 1 failed**.

The implementation owner corrected the root cause with own-property enforcement and added a core regression. The verifier made no production edit. The entire independent suite was then rerun and passed **58/58**, including the exact exploit. Earlier failures remain recorded in `harness-failures.json`.

## Web Crypto and change control

- The implementation uses `globalThis.crypto.subtle.digest('SHA-256', ...)`, not a Node-only crypto API.
- A fresh Chromium session imported the actual TypeScript service through Vite and verified Web Crypto availability, the pinned checksum, reordered-key determinism, valid-record acceptance, and checksum-mismatch rejection with zero console, page, or network errors.
- `package.json` dependency and devDependency maps are unchanged from HEAD; `package-lock.json` has no diff. No new dependency was introduced.
- No provider, approved source, or license selection changed. The contract adds required provenance metadata only.

## Fresh validation

| Gate | Result |
|---|---|
| Independent adversarial contract tests | PASS — 1 file, 58 tests |
| Focused contract/corpus plus adversarial tests | PASS — 5 files, 121 tests |
| Full discovered Vitest suite | PASS — 35 files, 672 tests |
| ESLint | PASS |
| TypeScript check | PASS |
| Production build | PASS — 4,103 modules; PWA 45-entry precache |
| Contract/dependency audit | PASS |
| `git diff --check` | PASS; Git emitted only CRLF advisory warnings |

## Production Chromium proof

The fresh hashed production build remained truthful: `/exercises` reported that the extended corpus was unavailable, exposed `externalCorpusAvailable: false` and `externalPuzzleCount: 0`, and did not substitute a fake valid external record.

On `/play`, Chromium completed six legal plies: `e4 e6 Nf3 d5 d3 Bd7`. The recorded worker `/stockfish-worker.js?v=2026-05-30-simplified` emitted a successful ready event and real `bestmove` messages. Replaying the SAN sequence with `chess.js` produced final FEN `rn1qkbnr/pppb1ppp/4p3/3p4/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4`. Console errors, page errors, and network errors were all zero.

Evidence: [contract audit](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/contract-audit.json), [adversarial results](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/adversarial-results.json), [browser Web Crypto](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/browser-contract.json), [production self-play](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/self-play.json), [preserved failures](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/harness-failures.json), and [commands](../../artifacts/tech-verification/PHASE_2/P2-T03/verifier/commands.json).

## Gate decision

No acceptance-blocking finding remains after the own-property correction. The work did not add or change a dependency, provider, corpus source, or license, so no Decision Gate is required. The production external corpus intentionally remains unavailable until later Phase 2 import, validation, and delivery tasks provide verified real records.
