# Nội dung 3 Slide — EcoHanoi

Nguyên tắc thiết kế (theo `PITCH-SCRIPT.md`): mỗi slide chỉ dùng một hình ảnh chính, chữ thật ít, nhiều nhất hai con số đã kiểm chứng trong `evidence/evidence-log.csv`. Không đưa số liệu chưa đo vào slide.

---

## Slide 1 · Vấn đề thật & Bằng chứng (35 điểm)

- **Tiêu đề**: Quyết định 87 đã có hiệu lực — người dân vẫn lúng túng từng món rác
- **Con số đã kiểm chứng (`evidence-log.csv` dòng 1–3)**:
  - **08/01/2026**: QĐ 87/2025/QĐ-UBND của UBND TP Hà Nội chính thức có hiệu lực với **3** nhóm rác (`Tái chế`, `Thực phẩm`, `Còn lại`), xử lý riêng chất thải nguy hại và cho phép từ chối thu gom nếu phân loại sai (Điều 8, Điều 23.5).
  - **5 trên 10** món rác phổ biến trích từ văn bản luật thuộc diện dễ nhầm (như hộp cơm nhựa còn dính thức ăn, giấy ăn dính dầu mỡ).
- **Hình ảnh (1 ảnh duy nhất)**: Ảnh tự chụp điểm tập kết rác thực tế có túi rác lẫn lộn *(bổ sung trước giờ pitch; không dùng ảnh mạng)*.
- **Ghi chú chờ cập nhật khi có số thật**: Thay hoặc bổ sung bằng điểm trung bình bài test 10 món từ Google Form (`survey-google-form`) khi chốt số liệu.

---

## Slide 2 · Người dùng thật & Độ tin cậy trên máy thật (40 + 25 điểm)

- **Tiêu đề**: Quét thật trên điện thoại — ép AI theo luật, không lưu ảnh
- **Con số đã kiểm chứng (`evidence-log.csv` dòng 4–6)**:
  - **143** bài kiểm thử backend (`pytest`) và **34** bài kiểm thử ứng dụng (`jest`) đạt toàn bộ; `check_rules.py` xác nhận không sai lệch tên nhóm, màu túi so với `rules/qd87.json`.
  - Độ tin cậy dưới **0,5** tự động chuyển về `Chưa chắc — chọn tay`; màn Xem lại cho phép sửa nhãn một chạm.
- **Hình ảnh (1 ảnh ghép gọn)**: Ảnh chụp màn hình `GET /stats` có giờ thực tế kèm 1 ảnh người dùng thử app trực tiếp tại sự kiện (đã xin phép).
- **Ghi chú chờ cập nhật lúc 15:15**: Điền số máy (`devices_ai`), số lượt quét (`ai_requests`), số người đoán sai trước khi quét (dạng "p trong k" nếu dưới 20 người) và độ chính xác thực tế từ `evidence/accuracy-report.md` khi hoàn thành Phase 2.

---

## Slide 3 · Kênh 100 người dùng đầu tiên & Mở rộng (25 điểm)

- **Tiêu đề**: Thêm thành phố mới = thêm một file luật
- **Kênh người dùng đầu tiên**:
  - Thí điểm 7 ngày **"Phòng xanh"** tại ký túc xá / khu trọ sinh viên (mỗi phòng nuôi chung một cây qua việc quét và phân loại đúng hằng ngày) → mở rộng sang ban quản lý chung cư và UBND phường (đơn vị cần theo dõi tỉ lệ phân loại đúng theo tòa nhà).
  - *(Chờ bổ sung tên kênh cụ thể, số thành viên và ảnh chụp tin nhắn đồng ý của người phụ trách trong `first-user-channel`).*
- **Kiến trúc mở rộng**:
  - Toàn bộ quy định Hà Nội nằm gọn trong một file cấu hình `rules/qd87.json` (backend tự dựng prompt và app tự đồng bộ UI qua `rules.ts`).
  - Mở rộng sang thành phố khác có luật phân loại riêng chỉ cần thêm một file luật JSON mới và chạy `check_rules.py` kiểm chứng, không phải viết lại logic ứng dụng.
- **Hình ảnh (1 sơ đồ + trích đoạn file luật)**: Sơ đồ luồng `1 file luật JSON → KTX Hà Nội → Chung cư / Phường → Thành phố khác`, góc dưới kèm ảnh chụp cấu trúc `rules/qd87.json`.
