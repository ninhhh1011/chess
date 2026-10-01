# Xác minh độc lập Phase 0

**Verdict: PASS**

Thời điểm xác minh: 2026-09-05 (UTC+07). Reviewer chỉ đọc mã sản phẩm và chỉ ghi vào báo cáo/evidence verifier được giao; không sửa production source, test, package/config, task report, plan, không commit/push/PR.

## Phạm vi và kết luận

Reviewer đọc độc lập kế hoạch Phase 0, bảy task report, bảy verifier report, toàn bộ diff ứng viên liên quan và các đường chạy thực tế cho game/bot/Stockfish, corpus, Coach, exercise và training profile. Không dùng JSON của implementer để quyết định verdict; toàn bộ static gate, test suite, clean-checkout gate và browser gate dưới đây được chạy fresh.

Không còn finding Critical/High/Medium/Low trong phạm vi acceptance của Phase 0. Bảy task P0-T01 đến P0-T07 có verifier PASS, trạng thái/claim hiện tại phù hợp với code và evidence fresh. Phase 0 đủ điều kiện đóng gate.

## Git và toolchain

- Branch: `main`.
- HEAD: `7ecc6a6 feat(ui): migrate production to Option C (Charcoal + Pine + Copper) with HeroUI v3.2.4 & Tailwind v4`.
- Remote: `origin https://github.com/ninhhh1011/chess` cho fetch/push.
- Node: `v24.15.0`; npm: `11.12.1`.
- Candidate tree đang dirty đúng như luồng thực thi chưa commit. Trước khi thêm report verifier: 35 tracked files, 570 insertions, 2.041 deletions; ngoài ra có các report/evidence/untracked source của Phase 0. Reviewer không coi dirty tree là clean checkout và đã dựng một candidate checkout riêng như mô tả bên dưới.
- `package-lock.json` không đổi. Không có dependency/version/provider/storage mới.

## Fresh critical gates trên candidate tree

| Command | Exit | Kết quả độc lập |
|---|---:|---|
| `npm run lint` | 0 | PASS, 0 warning/error |
| `npm run typecheck` | 0 | PASS |
| `npm test` | 0 | PASS, 31/31 files, 572/572 tests, 0 fail |
| `npm run build` | 0 | PASS, 4.098 modules transformed |
| `npx playwright test --list` | 0 | PASS, 68 tests trong 4 files |
| `npm run test:e2e` | 0 | PASS, Chromium, 68/68, 0 fail/skip, 1 worker, 3,8 phút |
| `git diff --check` | 0 | PASS; chỉ có notice LF sẽ đổi thành CRLF nếu Git chạm file |
| `git diff --stat` | 0 | Đã ghi nhận đầy đủ diff ứng viên |
| `git status --short --untracked-files=all` | 0 | Đã ghi nhận đầy đủ tracked/untracked state |

Npm discovery và direct Playwright discovery đều là toàn bộ `e2e/`: script hiện là `playwright test`, không còn filter một file. Không tìm thấy `test.only`, `describe.only`, `test.skip`, `describe.skip` hoặc `test.fixme`; `forbidOnly` bật trong CI. Workflow mã hóa đúng thứ tự fail-fast `npm ci → lint → typecheck → test → build → playwright install/list → full E2E → upload`.

## Clean candidate checkout

Reviewer dựng thư mục độc lập:

`C:\Users\nguye\AppData\Local\Temp\chess-phase0-verifier-20260905-222318`

Phương pháp:

1. Xuất tracked baseline bằng `git archive --format=zip HEAD` và giải nén ngoài workspace.
2. Overlay đúng các file ứng viên do `git diff --name-only HEAD` báo cáo.
3. Overlay đúng hai untracked source file có chủ ý: `src/services/exerciseValidator.js` và `src/test/corpusAvailability.test.ts`.
4. Không copy `node_modules`, `dist`, `artifacts`, ignored generated corpus, `src/data/generated/generatedPuzzles.json`, real `.env` hay secret. Trước install, `node_modules=false`, `dist=false`, generated JSON=false`; `.env.example` là file `.env*` duy nhất và là tracked template.

Kết quả clean candidate checkout:

| Command | Exit | Kết quả |
|---|---:|---|
| `npm ci` | 0 | 689 packages, 690 audited |
| `npm run lint` | 0 | PASS |
| `npm run typecheck` | 0 | PASS khi generated JSON hoàn toàn vắng mặt |
| `npm test` | 0 | 31/31 files, 572/572 tests |
| `npm run build` | 0 | PASS, 4.057 modules transformed |
| clean `npm run preview -- --host 127.0.0.1 --port 4192` | 0 | Production preview phục vụ browser gate và đã dừng sau kiểm thử |

Số module giữa workspace build và clean build khác nhau do clean checkout không nhận local ignored environment; cả hai build đều PASS. `npm ci` vẫn hiển thị inventory audit đã biết từ baseline: 12 advisories (1 low, 1 moderate, 8 high, 2 critical). Theo kế hoạch, thay dependency/audit fix cần Decision Gate và được phân loại ở final audit; reviewer không thay lockfile và không dùng việc này để che khuất acceptance Phase 0.

## Browser gate độc lập trên clean production preview

Browser: Chromium, viewport 1440×900, URL `http://127.0.0.1:4192/play`. Harness thao tác trên bàn cờ thật bằng tọa độ chuột, đọc history/FEN từ UI, replay bằng `chess.js`, bắt Worker constructor/message và thu `console`, `pageerror`, request failure/HTTP error.

### Game A — White, click, Hint

- Input: click từng ô nguồn/đích.
- 20 legal plies: `a3 e5 a4 d5 a5 c5 a6 Nxa6 b3 Nf6 b4 Nxb4 c3 Nc6 c4 Be7 d3 dxc4 d4 cxd4`.
- Final FEN: `r1bqk2r/pp2bppp/2n2n2/4p3/2pp4/8/4PPPP/RNBQKBNR w KQkq - 0 11`.
- PGN replay: PASS.
- Hint: đã click; worker `bestmove` tăng từ 30 lên 31, chứng minh action gọi engine thật.

### Game B — Black, pointer drag, Undo

- Board orientation: Black; input: pointer drag bằng mouse move/down/up sau khi animation đã settle.
- Undo: trước 3 plies, sau 1 ply; sau đó reviewer đi lại nước Đen và tiếp tục ván.
- 21 legal plies cuối: `e4 Nc6 Nf3 Rb8 d4 Ra8 Bc4 Rb8 d5 Ra8 dxc6 Rb8 cxd7+ Bxd7 Nc3 Rc8 Qe2 Rb8 a4 Rc8 e5`.
- Final FEN: `2rqkbnr/pppbpppp/8/4P3/P1B5/2N2N2/1PP1QPPP/R1B1K2R b KQk - 0 11`.
- PGN replay: PASS.

### Lifecycle

- Bắt được pending bot qua accessible status `role=status`, accessible name `Máy đang suy nghĩ`.
- Trong lúc pending, chọn New Game. Sau 5 giây, history vẫn 0 ply: stale result bị loại, không double move và không stuck.
- Resign: PASS; vào post-game/review: PASS.
- Review navigation: `0/2 → 1/2`.
- New Game từ review: trở về 0 ply.

### Worker và telemetry

- Worker URL thực: `/stockfish-worker.js?v=2026-05-30-simplified`.
- Handshake: `{ type: "ready", success: true }`.
- 89 thông điệp `bestmove` thực được thu trong toàn bộ run.
- Source quan sát được: `stockfish_wasm`; không dùng fallback để đạt browser verdict.
- Console errors: 0; page errors: 0; failed/HTTP-error network events: 0.

Hai run chẩn đoán trước PASS cuối được giữ ở `browser-failure.json/png`. Chúng không phải product finding: lần đầu pointer drag bắt đầu khi CSS piece animation còn chạy; lần sau harness tìm pending trong visible text trong khi component công bố trạng thái đúng qua accessible name. Reviewer sửa duy nhất harness verifier bằng cách đợi animation settle và kiểm tra `role=status`; không sửa production code hay hạ assertion. Run cuối PASS toàn bộ.

## Audit hợp đồng và diff

- Game/bot: `botRequestIdRef` tăng khi new game/undo/resign; callback cũ bị chặn trước `makeMove`; `sourceFen` là lớp chặn thứ hai. Browser lifecycle fresh chứng minh stale request không làm bẩn game mới.
- Stockfish: tất cả analysis đi qua queue, Worker thật, legal-UCI validation và source `stockfish_wasm`; browser và full E2E cùng PASS.
- Corpus: production không còn import/match `generatedPuzzles`, `generated-corpus-v2`, `synthetic` hay `mockCoachService`; loader reset về availability `false`, count 0, source `unavailable`; clean typecheck/build PASS khi file generated vắng mặt.
- Coach: một schema `coach.v1`, một endpoint `/api/coach`, response source chỉ `llm/basic/unavailable`, engine source chỉ `stockfish_wasm/fallback/none`, `knowledgeSource=none`; mock Coach không nằm trong production import graph/bundle. Phase 0 không claim live-provider success.
- Exercise/training: năm seed exercises đi qua shared validator; invalid objective/promotion/capture bị reject; profile `profile.v1` và plan `training.v1` normalize/migrate, profile mới sinh plan có task không rỗng. Các contract này nằm trong 572 test fresh đã PASS.
- Documentation: canonical runtime map ưu tiên observed runtime/current source/fresh tests/current contracts; các báo cáo lịch sử không còn được dùng như current whole-product readiness.

## Evidence verifier

- `artifacts/tech-verification/PHASE_0/GATE/verifier/commands.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/clean-checkout.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/browser.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/network-errors.json`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/game-a-white-click.png`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/game-b-black-drag.png`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/lifecycle-new-game.png`
- `artifacts/tech-verification/PHASE_0/GATE/verifier/phase0-browser.mjs`

SHA-256 của evidence chính:

- `browser.json`: `21C73E713F022A8B7A4868C30D88982C9CA88C63949C6273926F713572C92879`
- `game-a-white-click.png`: `DC6FF79B5092E78477E26E85E44D072BA9DD3CAF591687D1930CA667AB48722E`
- `game-b-black-drag.png`: `08D232C771CD91D9D95A8090C9F5ED5A0FFEE67E9AFCD6F1D6E019567C270354`
- `lifecycle-new-game.png`: `A57A2E0C8D7100FB94A3E3B51365488C858FAF4139128DB34EDCB5B7F3C429D9`

## Kết luận

**PHASE 0 PASS.** Candidate tree tái lập từ clean checkout mà không cần hidden corpus/secrets/local modules, mọi static/unit/build/full-E2E gate đều xanh, hai ván 20+ plies và lifecycle đều chạy trên clean production preview với Stockfish WASM thật và telemetry lỗi bằng 0. Không có severity finding còn mở trong phạm vi Phase 0.
