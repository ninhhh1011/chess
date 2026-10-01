# P2-T06 Independent Verification

**Final verdict: PASS**  
**Decision Gate: not required**  
**Verified:** 2026-09-06 on `main` at `7ecc6a6`, Node `v24.15.0`, npm `11.12.1`.

## Finding and correction history

The first independent normal lifecycle passed, but an additional Windows filesystem-boundary attack found a real defect: the original lexical direct-child check accepted a junction at `release\runs\junction-escape` whose physical target was outside `runs`. Publishing exited `0`, changed `activeRun` to `junction-escape`, and wrote a 492-byte seal into the outside target. This failure remains preserved in `junction-bypass-failure.json` and in task-owned temp root `C:\Users\nguye\AppData\Local\Temp\chess-p2t06-verifier-a4UOWz`.

The implementation was corrected by the owning agent, not this verifier. The manager now rejects `lstat` symbolic links/junctions and checks that both `runs` and the selected run resolve through `realpath` to a physical direct-child relationship. The preserved exploit now exits `1` with `Run directory cannot be a symbolic link or junction`. A fresh end-to-end rerun created a new escaping junction; it was rejected before pointer/seal mutation and `outsideSealCreated` remained false.

## Process recovery and reproducibility

The final verifier-owned lifecycle is preserved at `C:\Users\nguye\AppData\Local\Temp\chess-p2t06-verifier-72r6Fh` and used the actual official 304,384,407-byte source. Its freshly checked SHA-256 is `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`.

- A separate importer process exited **75** after parsed 3,000 / filtered 2,655 / accepted 345.
- The durable checkpoint was `interrupted`, bound source row 3,000, and recorded accepted byte boundary **445,773** and quarantine byte boundary **0**; physical partial sizes matched.
- A new process resumed and exited **0** at parsed 9,362 / filtered 8,362 / accepted 1,000 / invalid 0 / quarantined 0 / duplicate 0.
- A clean run used the checkpoint's original `retrievedAt`. Clean and resumed accepted files were byte-for-byte identical, as were quarantine files.
- Accepted SHA-256: `d8ce16538cae9ca09f502ddba98905128daf6f74a9c04d0d817a2a324bf02d29`; empty quarantine SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Both content identities equal `c836c4470ffc4289945d2e48f987ad1849926f7cb526002bb81e4f9511b00338`; there was no loss or duplicate.
- Fresh in-place rerun exited **1** with refusal to overwrite, and accepted/quarantine/manifest/checkpoint hashes were unchanged.

## Release, seal, and rollback

The verifier exercised CLI and exported API paths:

- root, nested-child, outside-directory, and physical junction escape inputs were rejected;
- first publish selected `clean` with empty history and wrote a valid seal binding manifest, accepted, quarantine, content identity, and import-run ID;
- `status` returned the exact pointer;
- repeated publish was a true no-op: pointer bytes and modification time did not change;
- incomplete publish failed with pointer bytes unchanged;
- second publish selected `resumed` with history `["clean"]`;
- corrupt active output was rejected on repeat publish without pointer change;
- corrupt rollback-target output was rejected without pointer change;
- manifest tampering with otherwise correct output hashes was rejected by the stored seal without pointer change;
- rollback restored `clean` with empty history;
- accepted/quarantine/manifest/checkpoint hashes for both runs matched their pre-manager snapshots;
- no `current.json.tmp-*` file remained after the tested flow.

## Production Chromium after each state

Three fresh hashed-production `/play` runs were executed in sequence immediately after first publish, second publish, and rollback. Each completed six legal plies, replayed with `chess.js`, observed `/stockfish-worker.js?v=2026-05-30-simplified`, a successful real `stockfish_wasm` ready event, multiple `bestmove` outputs, and zero console/page/network errors.

| State | Pointer | Plies | Errors |
|---|---|---:|---:|
| after first publish | `clean`, history `[]` | 6 | 0 |
| after second publish | `resumed`, history `[clean]` | 6 | 0 |
| after rollback | `clean`, history `[]` | 6 | 0 |

## Fresh quality gates

- Focused importer/validator/release suite: **3 files, 23 tests PASS**.
- Dedicated SIGINT recovery test: **1/1 PASS** in 5.55 seconds.
- Final standalone full suite: **38 files, 695 tests PASS**.
- ESLint: PASS with zero warnings.
- TypeScript `--noEmit`: PASS.
- Production build: PASS; 4,103 modules and 45 PWA precache entries.
- `git diff --check`: PASS (existing line-ending warnings only).
- Static audit found no new dependency, provider, storage integration, synthetic data, or production mock in the importer/release implementation.

Two earlier full-suite attempts are recorded in `commands.json`: running the full suite concurrently with the production build caused four fixed-timeout failures, and overlapping another agent's full run caused only the 15-second SIGINT fixture to time out. There were no assertion failures; the focused SIGINT rerun and final standalone 695/695 run passed without implementation changes.

No implementation, production test, dependency, or prior evidence was modified by this verifier. No commit or push was performed.
