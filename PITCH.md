# Kịch bản Pitch 5 Phút — EcoHanoi

Hai người trình bày: **N** (nói) và **D** (cầm máy demo). Mục tiêu đọc to dưới 4 phút 50 giây (tính cả khoảng dừng thao tác demo).

---

## Lời nói chính (40 → 35 → 25)

### 0:00–2:10 · Mở đầu & Demo AI trên máy thật (40 điểm)

*(N giơ hộp cơm nhựa dính thức ăn, im 2 giây.)*

Em hỏi thật anh chị: cái hộp cơm nhựa dính thức ăn này, ăn xong bỏ túi nào ở Hà Nội?

Tụi em làm EcoHanoi để trả lời câu hỏi đó ngay tại thùng rác. Em xin đóng hẳn app rồi mở lại trên máy thật.

*(D vuốt tắt app trong đa nhiệm và mở lại. N im lặng chờ.)*

Đây là cây của em — sống nhờ phân loại đúng. Giờ em bấm QUÉT RÁC.

*(D bấm QUÉT RÁC, lướt lần lượt: chai nhựa → vỏ chuối → hộp cơm dính thức ăn → pin AA.)*

Chai nhựa: Tái chế. Vỏ chuối: Thực phẩm. Hộp cơm dính thức ăn: app xếp vào Tái chế, nhắc gạt thức ăn thừa và tráng sơ theo Quyết định 87 *(evidence-log.csv dòng 3)*. Còn pin AA: app chặn bỏ chung túi rác, nhắc để riêng mang đến điểm thu gom chất thải nguy hại.

Mọi nhãn ở đây đọc trực tiếp từ một file luật trích từ Quyết định 87 — AI chỉ nhìn ảnh, không được tự nghĩ ra luật.

*(N đưa một món trên bàn cho giám khảo.)*

Anh chị thử quét giúp em một món bất kỳ ạ.

*(Giám khảo quét. Nếu AI nhầm hoặc hiện Chưa chắc — chọn tay, D chạm sửa ngay trên màn Xem lại.)*

AI cũng có lúc nhầm, nên luôn có bước Xem lại để sửa một chạm. Lưu xong, cây được tưới ngay. Nếu máy chính lỗi mạng, tụi em chuyển sang máy dự phòng ngay, không dùng video.

### 2:10–3:10 · Vấn đề thật có bằng chứng (35 điểm)

Từ ngày 8 tháng 1 năm 2026, Quyết định 87 của Hà Nội bắt buộc hộ gia đình phân loại rác thành 3 nhóm: Tái chế, Thực phẩm và Còn lại *(evidence-log.csv dòng 1)*. Đơn vị thu gom có quyền từ chối túi rác nếu không phân loại đúng *(evidence-log.csv dòng 2)*.

Trong 10 món phổ biến tụi em trích từ văn bản, có tới 5 món dễ nhầm như hộp cơm dính thức ăn hay giấy ăn dính dầu *(evidence-log.csv dòng 3)*.

Vì thế code sẽ khóa chặt AI: nhóm lạ hoặc độ tin cậy dưới 0,5 tự về Chưa chắc — chọn tay. Hệ thống đã qua 143 test backend, 34 test app và kiểm tra khớp hoàn toàn tên nhóm, màu túi với file luật *(evidence-log.csv dòng 4, 5, 6)*.

### 3:10–4:15 · Người dùng, mở rộng và minh bạch AI (25 điểm)

Người dùng đầu tiên của tụi em là ký túc xá và khu trọ sinh viên qua thử thách 7 ngày Phòng xanh: mỗi phòng nuôi chung một cây để thi đua giữ chuỗi quét hằng ngày. Tiếp theo là ban quản lý chung cư và UBND phường — nơi cần bảng theo dõi tỉ lệ phân loại theo tòa nhà.

Về mở rộng, toàn bộ quy định Hà Nội nằm trong một file JSON. Sang thành phố khác có luật riêng chỉ cần thêm một file luật mới, không phải viết lại ứng dụng.

Nói minh bạch: trước 10 giờ 51 ở mốc pre-hackathon chỉ có khung kit, tài liệu ý tưởng và file luật; toàn bộ backend phân loại, app 3 tab, hàng chờ quét và kiểm thử được làm trong ngày bằng cách điều phối Codex và Antigravity *(evidence-log.csv dòng 7)*.

*(N giơ lại hộp cơm nhựa.)*

Mục tiêu của tụi em: tối nay cầm hộp cơm này ra thùng rác, không ai phải đoán nữa. Em cảm ơn anh chị.

---

## 6 câu hỏi giám khảo và câu trả lời ngắn

1. **AI sai thì sao?**
   Backend hậu kiểm bằng code: nhóm lạ hoặc độ tin cậy dưới 0,5 ép về Chưa chắc — chọn tay. Khi lỗi mạng hoặc quá tải trả nhánh dự phòng để tự chọn, và màn Xem lại luôn cho sửa một chạm trước khi lưu.

2. **Có lưu ảnh không?**
   Không. Ảnh gửi lên server để phân tích rồi bỏ ngay; backend không lưu ảnh ra đĩa hay log. App không cần đăng nhập, chỉ băm SHA-256 mã máy để thống kê.

3. **Khác app khác hoặc ChatGPT, Google Lens ở đâu?**
   Ba điểm: một là ép AI theo đúng 3 nhóm và quy định Quyết định 87 từ file luật; hai là quét nhanh liên tục không cần gõ câu hỏi; ba là gắn với thói quen đổ rác qua cây xanh và thi đua theo phòng.

4. **Mở rộng thế nào?**
   Luật tách khỏi code: server dựng prompt và app hiển thị màu, tên nhóm, hướng dẫn từ cùng một file JSON. Thêm thành phố mới chỉ là thêm một file luật và chạy script kiểm tra.

5. **Ai trả tiền?**
   Cá nhân dùng miễn phí. Bên trả phí là ban quản lý ký túc xá, chung cư và phường cần công cụ tuyên truyền và báo cáo tỉ lệ phân loại đúng theo khu vực.

6. **Codex đã làm gì?**
   Theo DISCLOSURE.md, trước 10 giờ 51 ngày 14 tháng 11 chỉ có kit v11, tài liệu ý tưởng và file luật. Trong giờ thi, nhóm dùng Codex và Antigravity viết backend phân loại, API nhóm, luồng quét và bộ kiểm thử. Chi tiết từng gói của Codex và ảnh phiên làm việc đang được cập nhật vào DISCLOSURE.md trước giờ nộp.

7. **Làm sao chống gian lận điểm?**
   Toàn bộ điểm XP và chuỗi ngày do server tính (`ml/serve/rewards.py`), app không thể tự gửi hay sửa XP, ngày hoặc số món. Server giới hạn tối đa 15 món/ngày tính theo giờ Việt Nam (UTC+7) trên server nên đổi giờ điện thoại không có tác dụng, và mỗi ảnh chỉ được tính một lần trong ngày qua mã băm (`seen` hash). Việc đổi thưởng thật hiện chưa làm trong bản hackathon này — đó là bước tiếp theo và sẽ yêu cầu đối soát trực tiếp tại chỗ (ví dụ tại ký túc xá/ban quản lý) trước khi trao thưởng.

---

## Thiếu bằng chứng (tách riêng, KHÔNG đọc thành số khi chưa cập nhật)

Các mục chưa có số thật trong repo — chỉ đưa vào lời nói chính sau khi cập nhật vào evidence/evidence-log.csv:

- **Bài test 10 món Google Form (`survey-google-form`)**: chưa có số sinh viên tham gia, điểm trung bình trên 10, tỉ lệ sai hộp cơm và ảnh điểm tập kết rác tự chụp.
- **Phỏng vấn (`interview-1`)**: chưa có trích dẫn nguyên văn từ các cuộc phỏng vấn ngắn.
- **Độ chính xác AI Phase 2 (`llm-eval`, `evidence/accuracy-report.md`)**: chưa có tập 30 đến 50 ảnh rác thật và kết quả chạy đánh giá.
- **Người dùng thử & `/stats` (`stats-endpoint`)**: chưa có `devices_ai`, `ai_requests`, số người đoán sai trước khi quét (ghi dạng "p trong k" nếu dưới 20 người) và câu trích tại sự kiện.
- **Kênh 100 người dùng đầu tiên (`first-user-channel`)**: chưa có tên kênh cụ thể, số thành viên và ảnh tin nhắn đồng ý của người phụ trách.
- **Kiểm chứng 2 máy thật & Render (`demo-check`, `smoke_test.py`)**: `app/eas.json` chưa có URL Render thật và chưa có kết quả `demo_check.py --repeat 3` trên 2 máy Android.
- **Soát chéo luật & khai báo Codex (`rules/qd87.json`, `DISCLOSURE.md`)**: `review_status` vẫn chờ 2 người soát chéo; `DISCLOSURE.md` còn mục chờ điền chi tiết gói của Codex và Claude Code.
