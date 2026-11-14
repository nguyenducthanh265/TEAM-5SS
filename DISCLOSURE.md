# Phần có trước sự kiện và công cụ đã dùng (khai báo với BTC)

Luật: được dùng thư viện, SDK, API, starter template; phải nói rõ phần có trước và cho thấy phần làm mới trong ngày là đáng kể.

## Có trước giờ code (tag git `pre-hackathon`)
- Bộ công cụ hackathon-kit v11: định nghĩa agent/skill cho Claude Code và Codex, backend mẫu `ml/serve/app_llm.py`, client mẫu `ml/client/aiClient.ts`, script `smoke_test.py`, `preflight.py`, `demo_check.py`, `check_rules.py`, cấu hình deploy mẫu.
- Tài liệu ý tưởng EcoHanoi (mô tả chức năng, kịch bản demo, mẫu Google Form, kịch bản pitch).
- Văn bản gốc QĐ 87/2025/QĐ-UBND (PDF) và file luật `rules/qd87.json` soạn từ văn bản đó sáng 14/11.
- Không có app cũ, không có model huấn luyện trước, không có bản mẫu giao diện chạy được trong repo này.
- Nghiên cứu người dùng: [NHÓM ĐIỀN: khảo sát bao nhiêu người, phỏng vấn bao nhiêu người, hoặc ghi "chưa có"].

## Làm trong ngày 14/11
- Hợp đồng dữ liệu `app/src/lib/contracts.ts`, `PLAN.md`.
- Backend: `ml/examples/waste_classifier.py` (prompt dựng từ file luật, hậu kiểm bằng code), endpoint `POST /classify`, API nhóm `ml/serve/groups.py`, test.
- App Expo: nguồn luật `rules.ts`, 3 tab (Cây, Quét, Thống kê), màn Quét với hàng chờ 3 request, màn Xem lại, kho dữ liệu trên máy, màn selftest.

## Công cụ AI đã dùng để viết code
- Claude Code: điều phối và các sub agent viết [NHÓM ĐIỀN ĐÚNG THỰC TẾ: liệt kê gói WP do Claude Code viết]. Việc bắt đầu lúc khoảng 10:50, trước mốc 11:00 của BTC.
- Codex: [NHÓM ĐIỀN ĐÚNG THỰC TẾ: gói việc Codex làm, đường dẫn ảnh chụp phiên]. Luật giải yêu cầu dùng Codex thực chất; nếu Codex không làm phần nào thì ghi đúng như vậy.

## Bằng chứng mốc thời gian
- Tag git `pre-hackathon`: commit f9eaa52, 10:51 ngày 14/11/2026.
- Commit trong giờ thi: `git log pre-hackathon..HEAD --oneline`.
