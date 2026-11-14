# Phần có trước sự kiện (khai báo với BTC)

Luật: được dùng thư viện, SDK, API, starter template; phải nói rõ phần có trước và cho thấy phần làm mới trong ngày là đáng kể.

## Có trước ngày 14/11
- Bộ công cụ hackathon-kit: agent/skill cho Claude Code và Codex, backend mẫu `ml/serve/app_llm.py`, client `ml/client/aiClient.ts`, script `smoke_test.py`, `preflight.py`, `demo_check.py`, cấu hình deploy.
- Khung app Expo trống (điều hướng, quyền camera/micro), chưa có luồng chính.
- (Nếu repo đã có bản app cũ chạy được, khai đúng như vậy) Bản app cũ: [mô tả, ví dụ 1 màn cuộn, hàm phân loại ảnh cũ]. Hôm nay viết lại: [liệt kê].
- Bản mẫu giao diện web (chỉ mô phỏng, không gọi AI): [link].
- File luật `rules/qd87.json` do nhóm chép từ văn bản gốc.
- Dữ liệu: [bảng tra / danh mục, nguồn], bộ test [số mẫu].
- Nghiên cứu người dùng: khảo sát [số người], phỏng vấn [số người].
- (Nếu có) Model [tên] huấn luyện trước trên [dữ liệu].

## Làm trong ngày (11:00–16:00)
- Luồng chính của app: [mô tả].
- Hàm AI (prompt, schema đầu ra) và logic quyết định: [mô tả].
- Giao diện, xử lý lỗi, màn selftest, bộ đếm người dùng phía app.

## Công cụ AI đã dùng để viết code
- Codex (công cụ chính trong giờ thi): [các gói việc Codex làm, ví dụ WP-01, WP-04, WP-05]. Ảnh chụp phiên: [đường dẫn].
- Công cụ khác (nếu có): [tên, dùng vào việc gì].

## Bằng chứng mốc thời gian
- Tag git `pre-hackathon`: [mã commit, giờ].
- Commit trong giờ thi: `git log pre-hackathon..HEAD --oneline` ([số] commit).
