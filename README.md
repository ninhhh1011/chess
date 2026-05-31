# Ninh Lốp Trưởng Chess ♟️🔥

## Overview

Chào mừng bạn đến với **Ninh Lốp Trưởng Chess** — ứng dụng chơi cờ vua "gáy vừa đủ, học cũng sâu". Đây không phải là nền tảng thay thế Chess.com, mà là nơi bạn có thể thư giãn, mổ xẻ những nước cờ lỗi ngớ ngẩn (blunder) cùng Quân sư AI Ninh với phong cách phân tích cực mặn. Vừa giải trí, vừa lên trình!

Dự án hiện vẫn đang trong quá trình nâng cấp và hoàn thiện liên tục, nên đôi khi Ninh có thể hơi "ngáo" hoặc nước đi chưa phải là thần sầu nhất. Nhưng yên tâm, "lốp trưởng" sẽ luôn bám sát bạn trên bàn cờ.

---

## Features

- **Chơi với Bot (Ninh):** Các mức độ từ Dễ đến Khó, thi thoảng bot sẽ nhả vài câu nhận xét cực gắt.
- **Phân tích ván cờ (Engine Analysis):** Tích hợp Stockfish 16+ để chỉ ra nước đi tốt nhất, phát hiện lỗi sai, và đánh giá lợi thế.
- **Quân sư AI (AI Coach):** Nhận xét nhanh, mách nước, và phân tích tình huống với phong cách riêng biệt.
- **Luyện tập Khai cuộc (Opening Trainer):** Luyện tay các đường khai cuộc cơ bản để không bị "bắt nạt" từ những nước đầu tiên.
- **Giải bài tập (Tactics):** Các bài tập chiến thuật từ cơ bản đến nâng cao.

---

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS (styling).
- **Chess Engine & Logic:** `chess.js` (luật cờ), `react-chessboard` (bàn cờ), `stockfish` (engine WASM cho trình duyệt).
- **Backend/Database:** Supabase (Xác thực người dùng & Cơ sở dữ liệu).
- **AI Coach:** Tích hợp API AI (mô phỏng huấn luyện viên).
- **Deployment:** Vercel.

---

## Getting Started

Làm theo các bước sau để chạy dự án tại máy tính của bạn (Local Development):

### Yêu cầu hệ thống
- Node.js (phiên bản >= 18)
- npm (hoặc yarn/pnpm)

### Cài đặt và Chạy

1. **Clone kho lưu trữ:**
   ```bash
   git clone https://github.com/ninhhh1011/chess.git
   cd chess
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Chạy server phát triển:**
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại `http://localhost:5173`.

---

## Environment Variables

Tạo một tệp `.env.local` ở thư mục gốc và cung cấp các biến môi trường sau (dựa theo `.env.example`):

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Coach API (Nếu có)
VITE_AI_API_KEY=your_ai_api_key
```

---

## Project Structure

- `src/components/` - Các component React giao diện chính (Bàn cờ, Navbar, Panel phân tích, v.v.)
- `src/pages/` - Các trang chính (Home, Play, Learn, Openings, Exercises)
- `src/services/` - Xử lý logic API, tương tác với Supabase, AI Coach và Stockfish
- `src/contexts/` - Quản lý State toàn cục (Auth, ChessGame)
- `src/utils/` - Hàm tiện ích hỗ trợ phân tích nước cờ và di chuyển
- `docs/` - Chứa tài liệu thiết kế hệ thống và ghi chú (bao gồm `docs/archive/` cho các tệp cũ)
- `supabase/` - Cấu hình và migration cho Supabase

---

## Known Issues

Dự án vẫn đang trong giai đoạn phát triển, vì vậy hãy "giơ cao đánh khẽ" nếu bạn gặp phải:
- **Tải Engine chậm:** Đôi khi Stockfish khởi tạo lần đầu hơi lâu trên các trình duyệt cũ.
- **AI Coach chưa ổn định:** Một số thế cờ quá phức tạp có thể khiến Ninh "im lặng" hoặc đưa ra lời khuyên chung chung.
- **Trải nghiệm Mobile:** Một số giao diện phân tích sâu trên màn hình điện thoại nhỏ vẫn cần tối ưu thêm.

---

## Roadmap

- [ ] Cải thiện tốc độ tải ban đầu của Stockfish.
- [ ] Thêm tính năng đấu Online (Multiplayer thời gian thực).
- [ ] Hoàn thiện hệ thống theo dõi tiến độ học tập (Tracking & Stats).
- [ ] Bổ sung thêm nhiều bài tập chiến thuật và khai cuộc phong phú hơn.
- [ ] Mở rộng kho "văn mẫu" của AI Coach Ninh.
