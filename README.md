# Ninh Lớp Trưởng Chess

Ứng dụng học cờ vua bằng React/Vite. Trạng thái kỹ thuật hiện tại là **đang ổn định hóa**; không có tuyên bố production-ready cho toàn bộ sản phẩm.

## Những gì đã được xác minh

- Chơi local với bot; đường chạy thành công dùng Stockfish WASM trong Web Worker.
- Năm bài tập tích hợp sẵn trong `src/data/exercises.js`.
- Hồ sơ và kế hoạch luyện tập lưu local; đồng bộ cloud là tùy chọn.
- Baseline mới nhất: 572 unit/integration tests trong 31 file và 68 Playwright tests trong 4 file đều pass.

Kho corpus bên ngoài hiện **không được bundle hoặc deploy**. Trang bài tập hiển thị rõ rằng người dùng đang dùng năm bài tập tích hợp. Coach có chế độ diễn giải cơ bản trung thực; live provider, Supabase/online play và hành vi offline/PWA vẫn cần các phase xác minh riêng.

## Chạy local

Yêu cầu Node theo `.nvmrc` (Node 22).

```bash
npm ci
npm run dev
```

Kiểm tra đầy đủ:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --list
npm run test:e2e
```

## Tài liệu canonical

- [Current runtime source map](docs/CURRENT_RUNTIME.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Execution plan](docs/CODEX_TECH_EXECUTION_PLAN.md)
- [Corpus deployment status](docs/CORPUS_DEPLOYMENT.md)

Các báo cáo phase cũ chỉ là snapshot lịch sử. Khi số liệu hoặc trạng thái khác nhau, `CURRENT_RUNTIME.md` và các task/verifier report mới hơn được ưu tiên.
