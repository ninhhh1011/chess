# PHASE_0_GATE Task Report

Phase: 0 — Truthfulness, clean checkout và CI  
Status: VERIFIED  
Baseline: `main` tại `7ecc6a6`; không commit/push.

## Fresh implementation gate

- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 31 files / 572 tests.
- `npm run build`: PASS, 4.098 modules transformed.
- `npx playwright test --list`: 68 tests / 4 files.
- `npm run test:e2e`: PASS, 68/68 trên Chromium.
- `git diff --check`: PASS (chỉ có cảnh báo line-ending của Git).

Full E2E ban đầu tái hiện một fallback khi bốn browser worker cùng tranh CPU với Stockfish WASM. Kiểm tra cô lập 4 context chứng minh hàng đợi trong app PASS 4/4. Release command được đồng nhất với CI ở một Playwright worker; bên trong test concurrency vẫn gửi ba request đồng thời. Timeout path của service cũng được sửa để terminate worker quá hạn, tránh `bestmove` cũ lọt vào request kế tiếp.

## Production self-play

- Game A: Trắng, click-to-move, 20 plies, Hint thật, PGN replay PASS.
- Game B: Đen, drag-to-move, 21 plies, Undo 3→1 rồi tiếp tục, PGN replay PASS.
- Lifecycle: pending bot → Ván mới → stale response bị loại → đầu hàng → mở review → điều hướng 0/2→1/2 → Ván mới sạch.
- Engine: worker ready thành công và phát `bestmove` thật; source `stockfish_wasm`.
- Console errors: 0; page errors: 0; network errors: 0.
- Evidence: `artifacts/tech-verification/PHASE_0/GATE/phase-gate.json` và ba screenshot.
- `failure.json`/`failure.png` là diagnostic của harness bị supersede: tab Coach che move list và generic drag không xử lý bàn lật; run PASS cuối dùng move tab và pointer drag thật.

## Clean checkout

Một archive sạch của `HEAD` được overlay đúng tracked diff và hai source file chưa track có chủ đích (`exerciseValidator.js`, `corpusAvailability.test.ts`). Không copy `.env`, `node_modules`, `dist`, generated corpus, docs hay artifacts. Fresh `npm ci → lint → typecheck → test → build` đều PASS; 572/572 tests. 12 npm advisories là baseline đã biết và không được tự sửa vì dependency Decision Gate.

## Scope

Không đổi dependency/version, provider/model, storage/schema ngoài contract nội bộ đã được từng task duyệt; không sửa Option C.

## Independent phase review

Independent reviewer reran the current-tree gates and an isolated clean candidate: lint, typecheck, 572 unit/integration tests, build, 68/68 E2E tests, and both White/Black production browser flows PASS. The clean browser replay observed real `stockfish_wasm`, 89 `bestmove` messages, correct dispose/new-game/review behavior, and zero console, page, or network errors. No severity finding was reported. Evidence: `docs/verifications/PHASE_0_VERIFICATION.md` and `artifacts/tech-verification/PHASE_0/GATE/verifier/`.

Verdict: VERIFIED
