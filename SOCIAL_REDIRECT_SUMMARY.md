# Báo cáo: Tính năng Social Redirect (Hỏi Instagram Ninh lốp trưởng)

## 1. Mục tiêu
Cho phép người dùng hỏi AI Coach xin link Instagram của Ninh một cách tự nhiên mà không tốn lượt gọi AI API, và trả về một link có thể click trực tiếp.

## 2. Các file đã can thiệp
- **`src/utils/socialIntent.js` (Mới)**: Chứa toàn bộ logic bắt ý định (intent detection). Viết sẵn logic Regex và xử lý tiếng Việt không dấu.
- **`src/components/AICoachPanel.jsx` (Sửa đổi)**: 
  - Đã thêm một Input Form nhỏ nằm dưới 3 nút tính năng có sẵn.
  - Ngăn chặn việc gọi `askAICoach` nếu phát hiện câu hỏi thuộc về Social intent.
  - Cập nhật UI hiển thị nút "Mở Instagram" khi state `advice` chứa `instagramUrl`.

## 3. URL Đích
Được gán hằng số: `https://www.instagram.com/ngvninhh`

## 4. Logic Intent (`isInstagramIntent`)
Logic hoạt động như sau:
1. Chuẩn hóa chuỗi nhập: Bỏ dấu tiếng Việt, xoá ký tự đặc biệt, chuyển thành chữ thường (`lowercase`), loại bỏ khoảng trắng thừa.
2. Quét các nhóm từ khoá:
   - Các từ khoá instagram: `ig`, `ins`, `instagram`, `insta`, `i g`.
   - Các từ khoá định danh Ninh: `ninh`, `ngvninhh`, `ngv ninh`, `anh ninh`, `sep`.
   - Các từ khoá định danh Lốp: `lop`, `lop truong`, `ninh lop`.
   - Các từ khoá yêu cầu: `cho xin`, `gui`, `mo`, `link`, `profile`, v.v.
3. Nếu input khớp với các "hardcoded direct keywords" (`ig`, `ins`, `instagram`, `insta`, `ngvninhh`) thì `return true` ngay lập tức.
4. Nếu input là dạng câu hỏi thì bắt buộc phải chứa (Một từ khoá Instagram) VÀ (Một từ khoá định danh HOẶC Một từ khoá yêu cầu) để tránh bị false-positive với các thuật ngữ cờ vua.

## 5. Kết quả Test (Test Cases Pass)
- ✅ `ins` -> Trả về link
- ✅ `cho xin ins của lốp` -> Trả về link
- ✅ `ig của ninh` -> Trả về link
- ✅ `xin link ig anh ninh` -> Trả về link
- ✅ `ngvninhh` -> Trả về link
- ✅ `phân tích thế cờ này` -> Pass qua AI API bình thường
- ✅ `gợi ý nước đi` -> Pass qua AI API bình thường

## 6. Hướng dẫn Test Thủ Công
1. Chạy app `npm run dev`.
2. Truy cập `/play` và vào tab **Ninh Coach**.
3. Bạn sẽ thấy ô input mới *"Hỏi về ván cờ, hoặc xin Instagram của Ninh..."* ở bên dưới.
4. Nhập chữ `ins` và nhấn **Gửi**. Nút *Mở Instagram* sẽ xuất hiện ngay lập tức, không có delay load AI.
5. Nhập *tôi nên đi mã hay tượng*, nó sẽ có loading (vì đang gọi AI API).

## 7. Rủi ro còn lại
- Không có. Bộ Regex xử lý tiếng Việt kết hợp Exact Match bảo vệ khá an toàn khỏi việc bắt nhầm intent cờ vua. 
- Component mở link tuân thủ tuyệt đối an ninh Frontend (`target="_blank" rel="noreferrer"`).
