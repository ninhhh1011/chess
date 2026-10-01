# Kế hoạch thực thi kỹ thuật Codex

> **Luồng thực thi:** tuần tự P0 → P5; mỗi task dùng TDD khi đổi hành vi, chạy self-play thật, rồi giao cho verifier độc lập. Không commit/push/PR trong luồng này.

**Mục tiêu:** bảo đảm đường đi thật `Chơi → Stockfish review → lỗi có bằng chứng → puzzle thật → cập nhật tiến bộ → Coach trung thực`, có thể tái tạo từ clean checkout.

**Kiến trúc giữ nguyên:** React/Vite ở client, Stockfish WASM chạy trong worker, Express/Vercel dùng chung Coach handler, localStorage/Supabase cho tiến độ. UI Option C — Charcoal + Pine + Copper là **FROZEN**; chỉ sửa UI để phản ánh trạng thái kỹ thuật thật, nối dữ liệu thật, sửa regression hoặc accessibility.

**Nguyên tắc tối thiểu:** tái sử dụng code và dependency đã pin; không thêm/bỏ/nâng/hạ package, provider, model, storage hoặc dataset source nếu chưa qua Decision Gate; không có production mock/synthetic fallback.

---

## 1. Baseline ngày 2026-09-05

### 1.1 Git và toolchain

| Mục | Fresh evidence |
|---|---|
| Branch | `main` |
| HEAD | `7ecc6a6 feat(ui): migrate production to Option C (Charcoal + Pine + Copper) with HeroUI v3.2.4 & Tailwind v4` |
| Remote | `origin https://github.com/ninhhh1011/chess` fetch/push |
| Node | `v24.15.0` |
| npm | `11.12.1` |
| Working tree trước phiên | sạch; `git status --short --untracked-files=all` không có output |
| Pre-existing changes | không có |
| `git diff --check` | exit 0 |
| Commit/push | bị cấm trong luồng này |

### 1.2 Fresh command baseline

| Command | Exit | Kết quả |
|---|---:|---|
| `npm run lint` | 0 | PASS, 0 warning/error |
| `npm run typecheck` trong workspace | 0 | PASS vì file generated gitignored đang tồn tại local |
| `npm run test` | 1 | 30 files; 580 defined/executed; 578 pass; 2 fail; 0 skip; hai timeout tại `ChessGameBoard.integration.test.jsx:91,127`; duration 418.99 s |
| `npm run build` trong workspace | 0 | PASS; local ignored corpus được bundle |
| `npm run test:e2e -- --list` | 0 | chỉ 29 tests trong `e2e/chess.spec.js` |
| `npx playwright test --list` | 0 | 67 tests trong 4 files: chess/productFlow/smoke/stockfish |
| GitHub Actions run `33962483253` | failure | HEAD hiện tại fail `npm run typecheck`, TS2307 ở `src/services/corpusLoader.ts:24` |

Chưa có lệnh runtime nào khác được xem là PASS cho đến khi chạy fresh tại đúng task/phase gate.

### 1.3 Tái hiện bốn vấn đề A–D

| ID | Bằng chứng fresh | Kết luận |
|---|---|---|
| A — clean checkout | `git archive HEAD` vào `C:\Users\nguye\AppData\Local\Temp\chess-codex-clean-20260905-182835`; generated JSON absent; `npm ci` exit 0; `npm run typecheck` exit 2 với TS2307; `npm run build` exit 0 | CI/type contract phụ thuộc artifact gitignored; build hiện không chứng minh typecheck sạch |
| B — synthetic corpus | `scripts/ingest-corpus.cjs` tự tạo 40,000 records từ template, đổi FEN clock, tự gắn `generated-corpus-v2` và CC0 | Không phải external licensed corpus; không đủ điều kiện production gate |
| C — validator yếu | `node scripts/verify-corpus.cjs` exit 0 dù checksum thiếu, provenance sample 0/10, duplicates 39,977/40,000; solution chỉ kiểm độ dài sample 100 | Validator có false-positive và không chứng minh replay/checkpoint/rollback/reproducibility |
| D — E2E bị lọc | npm script list 29 tests/1 file; Playwright full list 67 tests/4 files | `test:e2e` không chạy full suite |

Phát hiện bổ sung: `docs/REAL_PRODUCT_REBUILD_PLAN.md` ghi READY trong khi `docs/FINAL_VERIFICATION_REPORT.md` ghi NOT READY; báo cáo cũ khẳng định 580/580 nhưng fresh test là 578/580; báo cáo Phase 2 khẳng định 0 duplicate/100% provenance trong khi dữ liệu local là 39,977 duplicate và record không có provenance.

### 1.4 Source of truth và đường chạy active

- Corpus active: `src/services/corpusLoader.ts` → `src/services/corpusService.ts`; loader static-import `src/data/generated/generatedPuzzles.json`; callers production chưa thấy trực tiếp, nhưng integration/learning tests gọi loader. Seed paths `src/data/exercises.js` và `src/data/corpusPuzzles.ts` đang song song với generated path.
- Engine active: `src/components/ChessGameBoard.jsx` → `src/hooks/useBotMove.ts` → `src/services/botService.ts` → `src/services/stockfishService.ts` → `public/stockfish-worker.js` và `public/stockfish/*`.
- Review active: `ChessGameBoard.jsx` → `src/services/analysis/gameAnalyzer.ts`, `pgnParser.ts`, `orientation.ts` → `src/components/review/*`.
- Coach active: client `src/services/coachService.ts` → `/api/coach`; Express `server/routes/coach.js` và Vercel `api/coach.js` dùng `api/coachHandler.js`. `server/services/aiCoachService.js` là wrapper. `src/services/mockCoachService.ts` tồn tại nhưng chưa thấy caller production; phải xác minh và phân loại, không suy diễn.
- Learning active: `src/services/userProfileService.js`, `recommendationService.js`, `syncService.js`, `cloudProfileService.js`; UI `src/pages/Training.jsx`, `Exercises.jsx`, `ChessGameBoard.jsx`.
- RAG code tồn tại nhưng runtime được báo là off: `embeddingService.js`, `vectorSearchService.js`; phải xác minh import graph và runtime, không dựa vào report cũ.
- Docs stale/duplicate: `docs/ARCHITECTURE.md` mô tả file/hook worker v2 không tồn tại và production fallback; các report Phase 0–5 mâu thuẫn với runtime fresh.

### 1.5 Credentials, dataset và dependency

- Chỉ ghi nhận **tên biến**, không ghi secret: `.env.local` có Supabase và OpenAI variable names; `server/.env` có `AI_API_KEY`/`AI_MODEL`. Giá trị và live validity chưa xác minh.
- Approved corpus source: `https://database.lichess.org/`. Chưa có raw external dataset hoặc source checksum đã pin trong repo.
- Local generated dataset: 40,000 synthetic records, 23 normalized positions, 28 label motifs, 11.78 MB, gitignored.
- `npm ci` fresh báo 12 advisories: 1 low, 1 moderate, 8 high, 2 critical. Không tự chạy `npm audit fix` hoặc đổi dependency; phân loại ở final audit và mở Decision Gate nếu cần version/package change.

## 2. Contract chung cho mọi task

Mỗi task phải đi qua đúng thứ tự:

1. Đặt status `IN_PROGRESS`; đọc toàn bộ caller/callee, contract, test, config và production/legacy path.
2. Ghi root cause/hypothesis. Nếu đổi hành vi: viết test nhỏ nhất, chạy thấy fail đúng lý do, rồi mới sửa tối thiểu.
3. Chạy targeted tests/validators và ghi exit code.
4. Chạy `npm run lint`, `npm run typecheck`, `git diff --check`.
5. Start app production local; Chromium `/play`; chơi tối thiểu 6 plies (10 plies cho gameplay/engine); xác minh legal turns, no double/stale/stuck, FEN parse, PGN replay, real engine source; thu console/pageerror/network/screenshot vào `artifacts/tech-verification/<PHASE>/<TASK_ID>/`.
6. Giao verifier agent độc lập ở read-only với acceptance criteria, diff, commands và runtime scenario; verifier tự chạy lại và tạo `docs/verifications/<TASK_ID>_VERIFICATION.md`.
7. Chạy diff/status audit; tạo `docs/task-reports/<TASK_ID>.md`; chỉ đặt `VERIFIED` khi implementation checks, self-play và verifier đều PASS.

**Files cấm sửa mặc định:** `ui-lab/**`, `src/styles/theme-charcoal-pine.css`, palette/layout Option C, social/multiplayer/sharing/PWA; `package.json`/`package-lock.json` để thay dependency; `.env*`; generated/user data chưa có rollback. Ngoại lệ chỉ khi task nêu rõ config script hoặc sửa regression kỹ thuật, và vẫn không đổi dependency/version.

**Rollback mặc định:** hoàn tác chỉ các hunk do task tạo bằng patch đối nghịch; không dùng reset/restore/checkout/clean/stash; giữ nguyên user data và pre-existing changes.

## 3. Phase inventory

### Phase 0 — Truthfulness, clean checkout và CI

**Phase status: VERIFIED** — full current-tree and isolated clean-candidate gates, production browser self-play, and independent review PASS. See `docs/task-reports/PHASE_0_GATE.md` and `docs/verifications/PHASE_0_VERIFICATION.md`.

#### P0-T01 — Reproduce clean-checkout failure

- Goal/defect/evidence: chứng minh tracked checkout có/không phụ thuộc generated corpus; A đã tái hiện bằng TS2307 sau `npm ci`.
- Dependencies: baseline only.
- Read: `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.js`, `corpusLoader.ts`, workflow. Change: plan, evidence, task/verifier reports only. Forbidden: production code và dependencies.
- Acceptance/tests: archive tracked files ngoài workspace; generated file absent; `npm ci` exit 0; typecheck reproduces TS2307; build result recorded; CI log matches; no secret/node_modules copied.
- Self-play/verifier: preview clean build, Home + `/play`, 6 plies if runtime can start; verifier repeats checkout and audits artifact boundary.
- Mandatory self-play finding: clean preview accepted `e2e4` but production bot did not reply within 15 s. Fresh integration baseline also timed out. P0-T01 therefore includes the smallest root-cause fix needed to make its mandatory smoke runnable before verification; it does not broaden corpus scope.
- Rollback/decision/status: delete only task-created temp/evidence after verified ownership if cleanup needed; no Decision Gate. **VERIFIED** — implementation gates, 6-ply production self-play, clean-checkout/CI reproduction, and independent verifier PASS; see `docs/task-reports/P0-T01.md` and `docs/verifications/P0-T01_VERIFICATION.md`.

#### P0-T02 — Remove hidden corpus build dependency truthfully

- Goal/defect/evidence: clean checkout typecheck/build must not import gitignored JSON; unavailable real corpus must be explicit and never replaced by fake production data.
- Dependencies: P0-T01.
- Read: all corpus loader/service callers, Exercises/Training routes, corpus tests, Vite/TS config. Change: minimum loader/contract/UI status and focused tests. Forbidden: synthetic data promotion, package/dependency changes, Option C redesign.
- Acceptance/tests: failing clean-checkout contract test first; clean typecheck/build exit 0 without generated JSON; runtime reports unavailable corpus; no seed/synthetic fallback labeled real; relevant unit/integration tests pass.
- Self-play/verifier: clean preview 6 plies plus corpus-unavailable UI/source assertion; verifier scans all loader callers and production bundles for generated path/mock fallback.
- Rollback/decision/status: reverse task hunks; Decision Gate only if solution truly needs artifact service/database/CDN/package/storage. **VERIFIED** — clean tracked-only typecheck/build, truthful unavailable UI/contract, 29 local focused tests, 66 verifier tests, dual 6-ply Stockfish self-play, and independent verifier PASS.

#### P0-T03 — Run the complete E2E suite

- Goal/defect/evidence: replace one-file Playwright filter; 29 vs 67 discovered tests.
- Dependencies: P0-T02.
- Read: `package.json`, `playwright.config.js`, all `e2e/*.spec.js`, CI workflow. Change: scripts/workflow and exact discovery regression check. Forbidden: deleting/filtering/skip/fixme/only or lowering assertions.
- Acceptance/tests: before/after discovery proves `npm run test:e2e -- --list` equals full folder file/test counts; CI calls same full command; full run reports defined/discovered/executed/pass/fail/skip/filter per project/file.
- Self-play/verifier: 6-ply production game; verifier independently compares npm and direct Playwright discovery and runs full E2E.
- Rollback/decision/status: reverse script/workflow hunk; no Decision Gate. **VERIFIED** — npm/direct discovery exact-match at 68 tests/4 files, full suite 68/68, dual production self-play, independent verifier PASS.

#### P0-T04 — Verify toolchain and CI order

- Goal/defect/evidence: establish one reproducible Node/install/lint/type/test/build/browser order; latest CI stops at typecheck.
- Dependencies: P0-T03.
- Read/change: `.nvmrc`, engines, lockfile metadata, workflow, Playwright config; change only order/config/tests needed without version/dependency change. Forbidden: version bump or audit fix.
- Acceptance/tests: Node 22 CI satisfies engines; `npm ci → lint → typecheck → test → build → playwright install/list → full E2E` is encoded and runs; failures stop pipeline; artifacts upload only after gate.
- Self-play/verifier: clean-preview 6 plies; verifier executes workflow-equivalent sequence.
- Rollback/decision/status: reverse config hunks; version/dependency change requires Decision Gate. **VERIFIED** — Node 22 pipeline, 563 unit/integration tests, 68 full E2E tests, self-play and independent verifier all PASS; no lock/dependency change.

#### P0-T05 — Reconcile contracts and stale reports

- Goal/defect/evidence: remove contradictory runtime claims and identify canonical/dead source paths.
- Dependencies: P0-T04 fresh evidence.
- Read: README, ARCHITECTURE, all phase/final reports, import graph. Change: docs only unless a verified dead runtime export causes contract ambiguity. Forbidden: claiming PASS from history or changing UI.
- Acceptance/tests: one canonical source map; READY/NOT READY contradiction removed; test/corpus/engine counts match fresh evidence; README/ARCHITECTURE state only verified runtime.
- Self-play/verifier: 6-ply production smoke ensures doc-only work did not hide runtime regression; verifier cross-checks every updated claim against commands/code.
- Rollback/decision/status: reverse doc hunks; deletion of runtime/dependency requires Decision Gate/ownership proof. **VERIFIED** — canonical runtime map established, stale readiness/corpus claims superseded, 563 tests and build pass, 6-ply real-Stockfish self-play pass, and independent verifier PASS after evidence-precedence correction.

#### P0-T06 — Verify Coach truthfulness and no silent mock

- Goal/defect/evidence: prove active endpoint/source badges and degraded basic mode; `mockCoachService.ts` and duplicate wrappers need classification.
- Dependencies: P0-T05 canonical map.
- Read: all Coach client/server/handler/components/tests/config/imports. Change: canonical path/source disclosure/tests only if fresh reproduction fails. Forbidden: provider/model/package changes or live-success mocks.
- Acceptance/tests: one request/response schema and endpoint; `basic` labeled “Diễn giải cơ bản”; provider failure labeled unavailable/basic per contract; no `AI` badge unless real `llm`; no prompt/raw-provider leakage; mock service absent from production bundle/call graph.
- Self-play/verifier: 6 plies then real Coach request with trusted facts plus provider-failure scenario; verifier inspects bundle/network/source.
- Rollback/decision/status: reverse hunks; missing/invalid required live provider or model/API change triggers Decision Gate. **VERIFIED** — canonical `coach.v1` contract, truthful basic/provider-failure disclosure, 569 tests, production bundle scan, dual six-ply real-Stockfish Coach flows, and independent verifier PASS; live-provider success remains assigned to its later gate.

#### P0-T07 — Verify exercise and training-plan contracts

- Goal/defect/evidence: prove legal exercise validation and non-empty canonical plans rather than DOM/localStorage-only claims.
- Dependencies: P0-T06.
- Read: exercises, validators, recommendation/profile services, Training/Exercises components and tests. Change: shared contract/validator and tests only if failure reproduced. Forbidden: synthetic production puzzle claims or decorative UI.
- Acceptance/tests: every shipped seed exercise FEN/move/objective legal; new profile has measurable non-zero tasks; all task shapes render; invalid records rejected; persistence contract versioned/migrated.
- Self-play/verifier: 6 plies, open Training and one valid exercise through UI; verifier reruns validators and browser flow.
- Rollback/decision/status: reverse hunks; no Decision Gate unless external service/dependency becomes necessary. **VERIFIED** — all five shipped exercises and malformed controls pass the shared production validator, local profile/plan persistence is versioned and migrated, 572 tests pass, dual six-ply real-Stockfish training/exercise flows pass, and the independent verifier PASSed after the false-promotion predicate was corrected.

### Phase 1 — Engine, bot và post-game review

**Phase status: VERIFIED** — P1-T01 through P1-T08, 592/592 unit tests, 72/72 Chromium tests, the exact real-WASM 80-ply benchmark, and the full hashed-production lifecycle/review gate independently PASS. See `docs/task-reports/PHASE_1_GATE.md` and `docs/verifications/PHASE_1_VERIFICATION.md`.

#### P1-T01 — Stockfish worker lifecycle/source
- Goal/defect/evidence: prove init/ready/analyze/dispose and truthful `stockfish_wasm`; obsolete v2/fallback documentation was superseded by the canonical runtime map.
- Dependencies: Phase 0 VERIFIED. Read/change: Stockfish service, worker assets, app dispose, engine tests/docs; no package change. AC/tests: real worker handshake, legal move, dispose/re-init, no silent fallback or leaked worker. Self-play/verifier: White/Black 10 plies with source/depth/time; independent lifecycle replay. Rollback/decision/status: reverse hunks; engine/package/provider change requires Decision Gate. **VERIFIED** — active and cold-init disposal regressions pass; replacement workers remain ready, 8/8 Stockfish E2E and dual 10-ply production self-play pass with real WASM; independent verifier PASS with no findings.

#### P1-T02 — Monotonic difficulty mapping
- Goal/defect/evidence: verify all displayed levels monotonically increase effective engine constraints. Dependencies: P1-T01. Read/change: bot levels/service/UCI tests/UI labels if technically false. AC/tests: ELO/depth/movetime/skill monotonic and actual UCI commands match pinned engine ranges. Self-play/verifier: one real move at each level, legal/source recorded. Rollback/decision/status: reverse hunks; no package change. **VERIFIED** — shared service now honors pinned Skill mode, 1200 no longer sends unsupported Elo, generic analysis cannot emit out-of-range Elo, 572/572 unit tests and 9/9 Stockfish E2E pass, and independent production replay `400→800→1200→1600→400` confirms legal WASM moves with clean option isolation.

#### P1-T03 — Cancellation, timeout, stale isolation
- Goal/defect/evidence: fresh suite has two integration timeouts; cancellation/stale claims rely heavily on mocks. Dependencies: P1-T02. Read/change: all `useBotMove` callers, hook, bot/engine service, lifecycle tests. AC/tests: reproduce root cause; RED regression; cancel pending request, new game discards old response, timeout cannot contaminate next request, one bot move per turn. Self-play/verifier: pending bot → new game → no stale move; White/Black. Rollback/decision/status: reverse hunks; no arbitrary timeout inflation. **VERIFIED** — the RED browser regression proved the active worker survived new-game; AbortSignal now reaches the captured Stockfish worker, request timers are ownership-safe, 574/574 tests and 10/10 Stockfish E2E pass, and independent production White/Black plus timeout-recovery replay confirms no stale or duplicate move.

#### P1-T04 — PGN parser and replay
- Goal/defect/evidence: prove headers/comments/variations/errors and legal replay on current parser. Dependencies: P1-T03. Read/change: parser, fixtures/tests, review callers. AC/tests: exact official `rklpc7mk` export parses 47 full moves/94 plies, while its deliberately fixed first-40/80 benchmark prefix replays to a separate stable final FEN; invalid PGN fails explicitly. Self-play/verifier: export UI PGN after 10+ plies and replay with chess.js. Rollback/decision/status: reverse hunks; no Decision Gate. **VERIFIED** — the hand-written tokenizer was deleted in favor of chess.js verbose history; comments, RAV/NAG handling, SetUp/FEN, explicit errors, exact-source replay, and the named benchmark prefix pass 577/577 tests. Local and independent production flows copied and replayed 10-ply PGNs with exact SAN/FEN, real Stockfish WASM, and zero browser errors.

#### P1-T05 — Two-pass game analysis
- Goal/defect/evidence: old report says second pass analyzed 0 positions; must prove selection and coverage. Dependencies: P1-T04. Read/change: analyzer/orientation/Stockfish contracts/tests. AC/tests: pass 1 covers all 80 plies; pass 2 deterministically selects evidenced candidates; cancellation/error counts explicit; no missing/duplicate ply facts. Self-play/verifier: review played game and navigate facts. Rollback/decision/status: reverse hunks; no provider change. **VERIFIED** — pass 1 now evaluates the initial position plus every played position once, pass 2 uses deterministic pre-move candidates, and failures/cancellation name the exact pass location. The production review route uses this service; independent real-WASM evidence covered 14 plies, all 15 ordered shallow positions, three deep candidates/facts, navigation, and zero browser errors. Final gates pass 581/581 tests.

#### P1-T06 — AnalysisFact contract
- Goal/defect/evidence: unify engine facts consumed by review, learning and Coach. Dependencies: P1-T05. Read/change: analysis types, analyzer, Coach/review/profile callers and contract tests. AC/tests: one versioned schema; 1 fact per analyzed ply; required FEN/move/eval/source/candidates/evidence IDs; invalid facts rejected. Self-play/verifier: select a real review fact and trace it end-to-end. Rollback/decision/status: reverse hunks; no Decision Gate. **VERIFIED** — `analysis.v1` now has one runtime validator and stable `${gameId}:ply:${ply}` evidence identity; every analyzed ply carries legal pre/post FEN, played/best moves, evaluations, an anchored candidate and real `stockfish_wasm` source. Review, learning and Coach reject invalid facts. Fresh gates pass 587/587 tests, and independent production replay validated 14 facts, 15/15 pass-one positions, three deep facts, selectable navigation, final-bestmove/PV normalization and zero browser errors.

#### P1-T07 — Orientation, mate, CPL, classification
- Goal/defect/evidence: verify white/black perspective and mate transitions rather than report assertions. Dependencies: P1-T06. Read/change: orientation/analyzer/classification tests. AC/tests: symmetric white/black fixtures; mate score ordering; non-negative CPL for mover; thresholds unchanged unless proven contract bug; legal candidate line. Self-play/verifier: both colors produce correctly oriented review labels. Rollback/decision/status: reverse hunks; threshold change requires explicit evidence, not convenience. **VERIFIED** — CPL is symmetric by the mover in `fenBefore`, signed mates have monotonic ordering, loss is never negative, classification thresholds are unchanged, skill tags consume positive CPL, and full candidate PVs are legal. Fresh gates pass 592/592 tests and 10/10 Stockfish E2E; independent two-color production replay recomputed exact labels, replayed 45/45 latest PVs, matched displayed best moves to real WASM searches, and recorded zero errors.

#### P1-T08 — Exact 40-move benchmark
- Goal/defect/evidence: replace stale ~5.3–5.8s logs with fresh cold + 2 warm runs. Dependencies: P1-T07. Read/change: benchmark and fixture only if contract defect appears. AC/tests: `rklpc7mk`; 40 moves/80 plies; 80 facts; real `stockfish_wasm`; 0 illegal/error/timeout; median/max; compare 5365 ms and investigate >20%. Self-play/verifier: full Phase 1 White/Black/lifecycle/review gate; verifier reruns benchmark independently. Rollback/decision/status: report-only if pass; reverse benchmark hunks if needed. **VERIFIED** — local median/max 42,728/42,934 ms and independent median/max 42,764/42,997 ms across exact cold + two warm browser runs; every run produced 80 ordered facts and 83/83 legal real-WASM searches with zero fallback/error/timeout. The apparent +697.1% change is explained by the historical jsdom/no-Worker fallback plus hardcoded source, not a comparable real-engine regression. Fresh 592/592 unit and 72/72 E2E gates plus independent 20+20-ply production lifecycle/review passed with zero browser errors.

### Phase 2 — Real licensed corpus

#### P2-T01 — Audit corpus origin
- Goal/defect/evidence: establish chain of custody; current data is synthetic, 23 normalized positions. Dependencies: Phase 1 VERIFIED. Read/change: generator, ignored JSON/manifest, services/tests/reports; audit docs/evidence only. AC/tests: every production record classed real/synthetic/seed; no synthetic counted; source/license claims checked against source records. Self-play/verifier: general 6 plies; verifier samples and traces records. Rollback/decision/status: docs only; unclear license/source triggers Decision Gate. **VERIFIED** — production external count is truthfully 0; five bundled drills, 28 dormant seed records, test seeds, and 40,000 ignored generated rows are classified and excluded. The generated rows reduce to 23 normalized positions with 39,977 duplicates and no external provenance fields. The approved Lichess export is reachable and explicitly CC0, so no source/license Decision Gate is required. Fresh local and independent gates pass 46/46 focused and 592/592 full tests, production build, six legal real-WASM plies, and zero browser errors.

#### P2-T02 — Remove synthetic corpus from production path
- Goal/defect/evidence: quarantine generator output as test fixture or migrate callers before removal. Dependencies: P2-T01. Read/change: all corpus callers/data/tests; minimal production routing/tests. AC/tests: production bundle/path cannot select synthetic/template records; tests label fixtures explicitly; unavailable state truthful. Self-play/verifier: 6 plies plus production puzzle route cannot show synthetic record. Rollback/decision/status: preserve data until callers migrated; no destructive delete without ownership/rollback. **VERIFIED** — Phase 0 had already removed generated/static corpus imports from the active loader, so no production rewrite or destructive data move was needed. Fresh local and independent audits found zero synthetic imports or initializer calls in production source and zero synthetic markers in the rebuilt bundle; exactly five explicitly local drills remain with a truthful external-corpus-unavailable notice. Local and independent gates pass 592/592 tests, lint/typecheck/build, six legal real-WASM plies, PGN replay, and zero browser errors; dormant artifacts remain hash-identical.

#### P2-T03 — Define real PuzzleRecord/provenance contract
- Goal/defect/evidence: current generated records lack sourceId/licenseId/checksums. Dependencies: P2-T02. Read/change: corpus types/service/tests. AC/tests: versioned record has source record ID, source URL/version/date, license ID/URL, raw/source checksum, record checksum, FEN, moves, rating/themes; schema rejects missing/forged fields. Self-play/verifier: 6 plies and render unavailable/valid metadata correctly. Rollback/decision/status: reverse schema hunks; changing source/license requires Decision Gate. **VERIFIED** — added exact `puzzle-record.v1` runtime/type contract with 16 required fields, canonical Web Crypto SHA-256, strict unknown/malformed/missing/tamper rejection, and pinned deterministic digest. Independent adversarial verification exposed inherited required fields crossing the prototype chain; the shared validation boundary now enforces own properties with `Object.hasOwn`, and the exact exploit is covered by a regression. Fresh final gates pass 58/58 adversarial, 121/121 focused, 672/672 full, lint/typecheck/build, actual Chromium Web Crypto, and six legal production real-WASM plies with zero runtime errors.

#### P2-T04 — Streaming importer for approved Lichess source
- Goal/defect/evidence: existing script generates templates and never reads Lichess data. Dependencies: P2-T03. Read/change: importer/contract/tests/package scripts only; use Node stdlib streams and installed `chess.js`. AC/tests: stream approved format without loading whole source, pin input checksum, deterministic transform/quarantine, no fake records. Self-play/verifier: general game plus import a small real source slice and trace record. Rollback/decision/status: outputs isolated by run ID; inaccessible dataset or license change → Decision Gate. **VERIFIED** — official 304,384,407-byte CC0 snapshot SHA-256 `a0ea9129…847f073`; 9,362 parsed/1,000 accepted, 1,000/1,000 replay/provenance, 0 duplicate, <128 MiB, resume/determinism/adversarial/full/browser gates and independent verifier PASS.

#### P2-T05 — Full chess validator
- Goal/defect/evidence: current CLI samples and warns while exiting 0. Dependencies: P2-T04. Read/change: validator/service/tests. AC/tests: all records FEN/side/full solution replay/legal moves/rating/themes/provenance/license/checksums; normalized duplicates fatal/quarantined; non-zero exit on gate failure; reason counts exact. Self-play/verifier: imported puzzle wrong move/retry/solution via product. Rollback/decision/status: reverse validator hunks; no new library. **VERIFIED** — canonical streaming validator checked 1,000/1,000 real records and 3,732 moves with zero quarantine/duplicate; 18-case independent adversarial audit, exact 75-theme taxonomy, strict CLI/wrapper exits, 692/692 full tests, production WASM smoke, and independent verifier PASS. Product delivery remains truthfully deferred to P2-T07/P2-T08; the task-specific imported-puzzle flow used the current non-production boundary.

#### P2-T06 — Checkpoint/resume/idempotency/rollback
- Goal/defect/evidence: current in-memory test claims do not prove importer process recovery. Dependencies: P2-T05. Read/change: importer/state manifest/tests. AC/tests: interrupt/resume equals clean import byte-for-byte; rerun adds no duplicate; failed run cannot replace accepted corpus; rollback restores prior manifest/artifact. Self-play/verifier: general 6 plies after each state operation; verifier kills/restarts importer. Rollback/decision/status: immutable run dirs + atomic manifest pointer; external storage need → Decision Gate. **VERIFIED** — real-source separate-process interrupt/resume matched clean artifacts byte-for-byte; immutable sealed runs, atomic pointer/no-op publish, failed-run isolation, rollback, 695/695 tests, three state-tagged WASM smokes, and independent verifier PASS. Independent junction-escape finding was fixed at the physical path boundary with `lstat`/`realpath` and rerun PASS.

#### P2-T07 — Production delivery strategy
- Goal/defect/evidence: gitignored local-only 11.78 MB artifact breaks clean deployment. Dependencies: P2-T06. Read/change: build/deploy config, loader, docs/tests; choose only repo-native strategy possible without new service. AC/tests: clean deployment obtains verified corpus or truthfully disables corpus; checksum verified before activation; no hidden local artifact. Self-play/verifier: clean checkout opens a real imported puzzle. Rollback/decision/status: keep prior verified artifact; DB/CDN/release artifact/new package/storage → Decision Gate. **VERIFIED** — repo-native versioned static delivery ships 1,000 real Lichess puzzles; exact source/dataset pins, full chunk/record verification, fail-closed fallback, atomic rollback, clean-candidate build, 700/700 tests, production puzzle + six-ply WASM browser flow, and independent verifier PASS.

#### P2-T08 — Import ≥20,000 real puzzles
- Goal/defect/evidence: current 40,000 synthetic records do not count. Dependencies: P2-T07. Read/change: importer outputs/manifest/evidence, not source code unless reproduced defect. AC/tests: accepted ≥20,000; full replay 100%; illegal FEN/move 0; duplicate 0; provenance 100%; ≥12 meaningful motifs; pinned source checksum; reproducibility/resume/idempotency/rollback/deployment all pass. Self-play/verifier: real imported puzzle wrong/retry/solve; full phase self-play; phase reviewer repeats gates. Rollback/decision/status: atomic previous-manifest restore; source unavailable/license change → Decision Gate. **VERIFIED** — exact approved CC0 source produced 20,000 unique records across 72 themes; local and independent validators replayed all 71,916 moves with zero invalid/quarantine/duplicate. Resume byte identity, idempotency, rollback, clean deployment, real five-ply puzzle, 702/702 full tests, and complete White/Black/lifecycle/review production gates passed with zero runtime errors.

### Phase 3 — Real learning loop

#### P3-T01 — Persistence entities/contracts
- Goal/defect/evidence: map profile/game review/fact/puzzle attempt/skill/plan/sync IDs and migrations. Dependencies: Phase 2 VERIFIED. Read/change: profile/cloud/sync/recommendation types and tests. AC/tests: versioned serializable entities, stable IDs/timestamps, migration and invalid-state handling. Self-play/verifier: clean profile + 6 plies + reload. Rollback/decision/status: preserve/migrate user data; schema/provider change → Decision Gate. **VERIFIED** — `profile.v2`/`learningPersistence.v1` and all nested entities round-trip with stable native IDs and UTC ISO timestamps; v1 migration, invalid-state preservation, revision/sync normalization, 710/710 tests, clean candidate, real six-ply WASM reload flow, and independent verifier PASS. The verifier-found locale-timestamp gap and an over-strict first correction were both retained and resolved at the shared AnalysisFact boundary.

#### P3-T02 — Move-review evidence
- Goal/defect/evidence: weakness must trace to trusted AnalysisFact, not heuristic label alone. Dependencies: P3-T01. Read/change: analyzer/review/profile services/components/tests. AC/tests: selected mistake persists fact/evidence/game/ply IDs and engine source; orphan/invalid evidence rejected. Self-play/verifier: game → review → select mistake → trace record. Rollback/decision/status: additive migration with reverse adapter; no Decision Gate. **VERIFIED** — production reviews persist the validated `gameReview.v1 → analysis.v1` trace with native game/review IDs, derived evidence/ply identity, complete engine evidence, and fail-closed orphan/cross-game/conflict handling. Local 712/712 tests and a real 14-ply Stockfish review passed; independent verifier repeated focused/full/clean/browser gates plus nine adversarial cases and exact replay stability.

#### P3-T03 — Puzzle attempt tracking
- Goal/defect/evidence: attempts need real corpus provenance and idempotent identity. Dependencies: P3-T02. Read/change: Exercises/ExerciseBoard/profile/corpus/tests. AC/tests: wrong/correct/retry timestamps and move records persist once per attempt ID; real puzzle ID resolves provenance. Self-play/verifier: wrong → retry → solve in browser. Rollback/decision/status: preserve attempts; no Decision Gate. **IN_PROGRESS**.

#### P3-T04 — Skill-state update
- Goal/defect/evidence: skill changes need evidence trace and deterministic rule. Dependencies: P3-T03. Read/change: profile/recommendation/training rules/tests. AC/tests: exactly-once update from recorded fact/attempt; trace includes before/after/reason/evidence; replay idempotent. Self-play/verifier: solve puzzle and inspect changed skill. Rollback/decision/status: event replay/previous snapshot; no Decision Gate. **TODO**.

#### P3-T05 — Daily-plan generation
- Goal/defect/evidence: plan must respond to evidenced weakness without zero-task state. Dependencies: P3-T04. Read/change: recommendation/profile/Training/tests. AC/tests: clean and learned profiles receive valid non-empty plans; changed evidence changes priority; no missing/infinite repeated puzzle; all IDs resolvable. Self-play/verifier: compare plan before/after real attempt. Rollback/decision/status: regenerate from source events; no Decision Gate. **TODO**.

#### P3-T06 — Retry workflow
- Goal/defect/evidence: browser flow must prove incorrect attempt and retry rather than direct state mutation. Dependencies: P3-T05. Read/change: ExerciseBoard/Exercises/profile tests/E2E. AC/tests: illegal/wrong move recorded; board resets to correct retry state; correct continuation solves; duplicate completion blocked. Self-play/verifier: exact browser retry flow with real corpus. Rollback/decision/status: no destructive data rewrite; no Decision Gate. **TODO**.

#### P3-T07 — Local persistence
- Goal/defect/evidence: old E2E checks isolated localStorage/DOM, not whole product flow. Dependencies: P3-T06. Read/change: profile/storage migrations/E2E. AC/tests: clean profile → game → review → puzzle → skill/plan change → reload persists all IDs and no duplicate. Self-play/verifier: full required browser flow without cloud. Rollback/decision/status: export/restore prior local state in test profile only. **TODO**.

#### P3-T08 — Cloud adapter/idempotency
- Goal/defect/evidence: prove live Supabase path and conflict/retry semantics; never mock success. Dependencies: P3-T07. Read/change: Supabase client/schema/cloud/sync/auth tests/E2E. AC/tests: live credential validation, upsert/retry exactly once, no duplicate events, conflict behavior and source status explicit. Self-play/verifier: full flow plus reload/sync retry. Rollback/decision/status: isolate test user and reversible rows; missing/invalid credentials or provider/schema change → Decision Gate. **TODO**.

### Phase 4 — Coach V1

#### P4-T01 — Canonical request/response contract
- Goal/defect/evidence: one versioned Coach schema across client/server. Dependencies: Phase 3 VERIFIED. Read/change: Coach types/handler/service/tests. AC/tests: strict request/response validation, trusted fact IDs, enumerated source/error states, invalid payload rejected. Self-play/verifier: 6 plies + real review fact request. Rollback/decision/status: reverse contract hunks; provider/model changes gated. **TODO**.

#### P4-T02 — Canonical server endpoint
- Goal/defect/evidence: prove Express/Vercel adapters call one handler without divergent behavior. Dependencies: P4-T01. Read/change: `api/coach*`, server routes/services/index, Vite/Vercel config/tests. AC/tests: `/api/coach` only canonical endpoint; adapters pass identical contract/status; duplicate legacy path absent from production. Self-play/verifier: request through local production proxy. Rollback/decision/status: reverse adapter hunks; endpoint/provider change gated. **TODO**.

#### P4-T03 — Deterministic basic explanation
- Goal/defect/evidence: basic degraded mode must be useful, deterministic and not masquerade as AI. Dependencies: P4-T02. Read/change: Coach generator/handler/tests. AC/tests: same AnalysisFact → same bounded response; best move copied only from trusted candidates; source `basic`; no fake facts. Self-play/verifier: force allowed degraded mode and inspect label/content. Rollback/decision/status: reverse hunks; no Decision Gate. **TODO**.

#### P4-T04 — Trusted AnalysisFact loading
- Goal/defect/evidence: Coach must resolve persisted evidence instead of accepting invented best move. Dependencies: P4-T03. Read/change: analysis/profile/Coach boundaries/tests. AC/tests: valid persisted fact resolves; missing/tampered/stale fact rejected; best move always belongs to fact candidate line. Self-play/verifier: select real mistake then ask Coach. Rollback/decision/status: reverse hunks; no Decision Gate. **TODO**.

#### P4-T05 — LLM adapter
- Goal/defect/evidence: validate configured live provider/model only if actual credential works; no mock live success. Dependencies: P4-T04. Read/change: handler/provider config/server env-name docs/tests; never secrets. AC/tests: live request schema, timeout/error/invalid output; response source `llm` only after valid provider result; raw error hidden. Self-play/verifier: real provider browser request plus failure scenario. Rollback/decision/status: credential missing/invalid, model/API/provider/SDK change → Decision Gate. **TODO**.

#### P4-T06 — Output constraints
- Goal/defect/evidence: prevent illegal move, contradiction, prompt/raw error leakage. Dependencies: P4-T05 or user-approved degraded path. Read/change: handler/validators/tests. AC/tests: schema 100%, allowed source/action values, move constrained to trusted candidates, unsafe/invalid provider output rejected. Self-play/verifier: adversarial real requests and browser display. Rollback/decision/status: reverse hunks; threshold not lowered. **TODO**.

#### P4-T07 — UI source disclosure
- Goal/defect/evidence: Option C must show `AI`, `Diễn giải cơ bản`, or unavailable truthfully. Dependencies: P4-T06. Read/change: SourceDisclosure/AICoachPanel/review components and accessibility tests; technical text-only UI changes. AC/tests: label maps exactly to response source, accessible live status, no RAG/AI badge on basic/unavailable. Self-play/verifier: exercise all source/error states. Rollback/decision/status: reverse UI hunks; palette/layout frozen. **TODO**.

#### P4-T08 — 200+ unique Coach benchmark
- Goal/defect/evidence: old low-latency deterministic report does not establish live/provider metrics or contradictions. Dependencies: P4-T07. Read/change: benchmark corpus/runner/reports only unless reproduced defect. AC/tests: ≥200 unique IDs, 0 duplicates/illegal/prompt/raw-error leaks, contradiction ≤2%, source/schema 100%, invalid output rejected, basic/provider failure labeled, p50/p95/max. Self-play/verifier: real Coach flow; full phase gate; independent rerun. Rollback/decision/status: benchmark immutable; unavailable required live provider → Decision Gate. **TODO**.

### Phase 5 — RAG evaluation only

#### P5-T01 — Freeze no-RAG baseline
- Goal/defect/evidence: create fixed, reproducible Coach baseline with RAG off. Dependencies: Phase 4 VERIFIED. Read/change: Coach benchmark/eval datasets/config/reports. AC/tests: fixed cases/expected evidence IDs/checksums; runtime `knowledgeSource:none`; latency/quality metrics recorded. Self-play/verifier: baseline browser Coach request. Rollback/decision/status: report/config revert; no provider decision yet. **TODO**.

#### P5-T02 — Define allowed RAG scope
- Goal/defect/evidence: retrieval may explain knowledge but never compute engine facts. Dependencies: P5-T01. Read/change: evaluation contract/docs/tests. AC/tests: allowed openings/motifs/lessons/strategy; prohibited bestMove/eval/CPL/classification/fact mutation enforced. Self-play/verifier: attempted retrieval contradiction cannot alter trusted fact. Rollback/decision/status: reverse contract hunks; no runtime RAG enabled. **TODO**.

#### P5-T03 — Evaluate metadata/lexical retrieval
- Goal/defect/evidence: existing metadata lookup must not be mislabeled RAG. Dependencies: P5-T02 and real corpus. Read/change: existing search/data/eval runner only, no new package. AC/tests: fixed Recall@5/citation/groundedness/evidence-resolution/latency; truthful `metadata` label; same benchmark as baseline. Self-play/verifier: resolve cited real record in browser/evidence. Rollback/decision/status: keep runtime off if metrics fail; no Decision Gate unless new dependency/source needed. **TODO**.

#### P5-T04 — Evaluate vector/hybrid only if approved
- Goal/defect/evidence: no fake embeddings or unapproved provider/library/database. Dependencies: P5-T03. Read/change: only after user decision; evaluation adapter/tests/config. AC/tests: real provider vectors, fixed benchmark, reproducible settings, no engine fact mutation. Self-play/verifier: candidate retrieval with resolvable evidence. Rollback/decision/status: provider/paid API/vector DB/SDK/model/library always → Decision Gate before change. **TODO**.

#### P5-T05 — Baseline/candidate comparison and GO/NO-GO
- Goal/defect/evidence: replace unapproved historical NO-GO with evidence plus user decision when external provider is involved. Dependencies: P5-T03 and, if approved, P5-T04. Read/change: eval results/runtime disclosure/docs. AC/tests: Recall@5 ≥85%, citation ≥95%, groundedness ≥95%, defined hallucination limit, ≥10-point improvement, p50/p95; otherwise RAG disabled/no badge. Self-play/verifier: same baseline/candidate flow; phase reviewer reruns. Rollback/decision/status: default runtime remains disabled; missing provider choice offers A credential/B provider/C user-approved baseline-only NO-GO. **TODO**.

## 4. Dependency graph và locked execution order

```text
P0-T01 → P0-T02 → P0-T03 → P0-T04 → P0-T05 → P0-T06 → P0-T07 → PHASE_0_GATE
PHASE_0_GATE → P1-T01 → P1-T02 → P1-T03 → P1-T04 → P1-T05 → P1-T06 → P1-T07 → P1-T08 → PHASE_1_GATE
PHASE_1_GATE → P2-T01 → P2-T02 → P2-T03 → P2-T04 → P2-T05 → P2-T06 → P2-T07 → P2-T08 → PHASE_2_GATE
PHASE_2_GATE → P3-T01 → P3-T02 → P3-T03 → P3-T04 → P3-T05 → P3-T06 → P3-T07 → P3-T08 → PHASE_3_GATE
PHASE_3_GATE → P4-T01 → P4-T02 → P4-T03 → P4-T04 → P4-T05 → P4-T06 → P4-T07 → P4-T08 → PHASE_4_GATE
PHASE_4_GATE → P5-T01 → P5-T02 → P5-T03 → P5-T04 → P5-T05 → PHASE_5_GATE → FINAL_VERIFICATION
```

Không chạy song song implementer tasks. Sau mỗi task chỉ verifier read-only được chạy độc lập. Không sang phase tiếp theo nếu task verifier hoặc phase reviewer chưa PASS.

## 5. Phase gate chung

Cuối mỗi phase chạy fresh và lưu exit/count:

```text
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test --list
npm run test:e2e
git diff --check
git diff --stat
git status --short --untracked-files=all
```

Sau đó chạy Game A White ≥20 plies/click/hint, Game B Black ≥20 plies/drag/undo, lifecycle pending bot → new game → discard stale → resign → review/navigation → new game, phase-specific scenario, và `phase-reviewer` read-only tạo `docs/verifications/PHASE_<N>_VERIFICATION.md`.

Phase 0 thêm clean checkout; Phase 1 thêm benchmark 80 plies; Phase 2 thêm importer/full validation/provenance/duplicate/reproducibility/resume/rollback/real puzzle; Phase 3 thêm full learning loop/cloud live; Phase 4 thêm full Coach benchmark/live path; Phase 5 thêm fixed baseline/candidate and approved GO/NO-GO.

## 6. Final verification và reports

- Duy trì plan status sau mỗi verifier PASS.
- Task reports: `docs/task-reports/<TASK_ID>.md`.
- Task/phase verification: `docs/verifications/*.md`.
- Final report tiếng Việt: `docs/CODEX_TECH_FINAL_REPORT.md`, chỉ tạo kết luận sau fresh final commands, clean checkout, full browser loop, benchmark/corpus/Coach/RAG gates và dependency audit.
- Không ghi `ALL TECH PHASES VERIFIED — READY FOR EXTERNAL REVIEW` nếu còn task/phase thiếu evidence, Decision Gate hoặc blocker.
