# Báo cáo: Làm sạch & Chuẩn hóa AI Coach Response

## 1. Các file đã sửa đổi
- **`src/components/AICoachPanel.jsx`**: Nơi duy nhất chứa toàn bộ logic, thay vì truyền thông điệp chung chung, bây giờ Panel sẽ đưa các **Hardcoded Prompts** cực kỳ chi tiết (chứa role, schema trả lời) vào thẳng payload. Nó cũng chịu trách nhiệm Parse (bóc tách) đoạn text mà AI trả về để render UI từng khối riêng biệt.

## 2. Format mới của 3 chức năng
Các prompt được ép chặt để không cho phép AI viết lan man, marketing hay "cảm ơn":
- **Nhận xét nhanh**:
  - Gồm 1 câu nhận định chính.
  - Một khối `Điểm cần nhớ` nằm dưới background tối màu nổi bật.
- **Nên chú ý**:
  - Phân tích rủi ro dưới dạng bullet points (max 2 ý), render sạch sẽ bằng thẻ paragraph.
- **Gợi ý nước đi**:
  - Đưa ra ngay nước đi hoặc ý tưởng cần cân nhắc.
  - Kèm theo 1 khối `Vì sao` giải thích ngắn gọn lý do chọn nước đó.

## 3. Cách giới hạn độ dài response
- **Frontend Truncation**: Nếu AI bất chấp luật và trả về một câu trả lời vượt quá 300 ký tự, `AICoachPanel.jsx` sẽ tự động chặt bớt đuôi và thêm `...` ở cuối, bảo đảm Panel không bao giờ bị overflow hay chiếm quá nhiều diện tích màn hình.

## 4. Cách fallback khi AI trả sai format
- Component `renderCoachAdvice` sử dụng regex linh hoạt như `.split(/Điểm cần nhớ:/i)`. Nếu AI trả đúng format, UI sẽ render các box text rất xịn.
- Nếu AI trả sai format (không có chữ "Điểm cần nhớ" hay "Vì sao"), hệ thống sẽ tự động Fallback xuống render dạng **Text thô** (Plain text), cắt tối đa 300 ký tự. Giao diện vẫn an toàn và không bị vỡ.

## 5. Trạng thái Loading và Error
- Thay vì 3 dấu chấm tròn nhảy múa làm rối mắt, giờ đây khi Loading, UI chỉ hiện 1 dòng text đơn giản nhấp nháy nhẹ: `Ninh đang xem thế cờ...`.
- Khi API gặp lỗi, thông báo hiển thị chuyên nghiệp: `Ninh chưa phân tích được thế này. Thử lại sau vài giây.` thay vì câu nói đùa cũ.

## 6. Tính năng Social Redirect
- **An toàn tuyệt đối**: Khối logic quét ý định Social Redirect được đặt ở đầu hàm `getAdvice()`. Do đó, nếu user nhập "ins của lốp", luồng vẫn rẽ nhánh trả về link Instagram và ngắt ngay, hoàn toàn không dính dáng đến luồng Format Chess Advice. Link mở tab mới bình thường.

## 7. Build Result & Rủi ro
- `npm run build` Pass 100%.
- **Rủi ro còn lại**: Đôi khi AI có thể đổi từ (ví dụ dùng "Lý do:" thay vì "Vì sao:"), lúc này nó sẽ bị rơi vào luồng Fallback (Plain Text). Đây là rủi ro chung của LLM nhưng đã được hứng bằng Fallback an toàn. Đã ép `responseStyle: 'structured_short'` trong API payload.
