# Ninh Lớp Trưởng Chess

Ứng dụng học cờ vua bằng React/Vite. Trạng thái kỹ thuật hiện tại là **đang ổn định hóa**; không có tuyên bố production-ready cho toàn bộ sản phẩm.

## Những gì đã được xác minh

- Chơi local với bot; đường chạy thành công dùng Stockfish WASM trong Web Worker.
- Năm bài tập tích hợp sẵn trong `src/data/exercises.js`.
- Hồ sơ và kế hoạch luyện tập lưu local; đồng bộ cloud là tùy chọn.
- Baseline clean-checkout ngày 2026-10-07 tại commit `dd9a4aa`: 753 unit/integration tests pass; E2E phát hiện 72 tests, 51 pass và 21 fail do selector khởi tạo cũ. Đây là bằng chứng lịch sử trước các chỉnh sửa trong worktree; xem `docs/audit/BASELINE.md` để biết đầy đủ.

Kho corpus Lichess CC0 gồm 20.000 bài tập đã được bundle dưới dạng các chunk có kiểm tra checksum. Trang bài tập tải và xác thực delivery khi chạy; nếu tải hoặc xác thực thất bại, ứng dụng báo rõ và dùng năm bài tập tích hợp. Coach có chế độ diễn giải cơ bản trung thực; live provider, Supabase/deployed database và hành vi offline/PWA vẫn cần các phase xác minh riêng. Chơi online đã bị loại khỏi ứng dụng.

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

## Tài liệu

Bắt đầu từ [chỉ mục tài liệu](docs/README.md); chỉ mở tài liệu phù hợp với task. [Current runtime source map](docs/CURRENT_RUNTIME.md) tóm tắt các luồng production hiện tại. Báo cáo phase và execution plan là tư liệu lịch sử, không thay thế source hoặc kiểm tra mới.
