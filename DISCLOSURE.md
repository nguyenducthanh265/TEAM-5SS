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
- Backend: `ml/examples/waste_classifier.py` (prompt dựng từ file luật, hậu kiểm bằng code), endpoint `POST /classify`, API nhóm `ml/serve/groups.py`, điểm & chuỗi ngày tính trên server `ml/serve/rewards.py`, giọng đọc AI `ml/serve/speak.py`, test.
- App Expo: nguồn luật `rules.ts`, 3 tab (Cây, Quét, Thống kê) + Cẩm nang, màn Quét với hàng chờ 3 request, màn Xem lại, đồng bộ điểm/chuỗi từ server (`rewardsApi.ts`), giọng đọc AI + dự phòng (`voice.ts`, `voiceCore.ts`), kho dữ liệu trên máy, màn selftest.
- Thư viện & dịch vụ mới thêm trong ngày:
  - App Expo (`app/package.json`): `expo-audio` (`~58.0.12`), `expo-speech` (`~58.0.4`), `react-native-svg` (`15.16.0`).
  - OpenAI TTS (`gpt-4o-mini-tts`) qua endpoint `GET /speak` (`ml/serve/speak.py`), có fallback sang giọng thiết bị (`expo-speech`).
  - Postgres trên Render (`DATABASE_URL` trong `render.yaml`) để lưu bền vững điểm/chuỗi (`ecohanoi_rewards`) và bảng xếp hạng nhóm (`ecohanoi_groups`).
- Công cụ/skill cục bộ ngoài repo: skill `ppt-master` cài trên máy cục bộ để hỗ trợ soạn slide trình bày, KHÔNG commit vào repo.

## Công cụ AI đã dùng để viết code
- **Claude Code**: điều phối và các sub-agent viết khung ban đầu của backend (`/classify`, `/groups`, kiểm tra luật), app Expo 3 tab (`rules.ts`, `scanQueue.ts`, `store.ts`, `selftest.tsx`, `review.tsx`), module điểm/chuỗi tính trên server (`ml/serve/rewards.py`, `app/src/lib/rewardsApi.ts`), module giọng đọc AI + dự phòng (`ml/serve/speak.py`, `app/src/lib/voice.ts`, `app/src/lib/voiceCore.ts`), cấu hình Postgres trên Render (`DATABASE_URL`) và bộ test tương ứng. Việc bắt đầu lúc khoảng 10:50, trước mốc 11:00 của BTC.
- **Codex**: phiên rà soát trước deploy ngày 14/11/2026 — điều phối ba sub-agent theo kit `mobile-ai` kiểm backend, QA/bảo mật mobile và UI/UX; sửa lỗi bảo toàn dữ liệu khi storage lỗi, hậu kiểm phản hồi AI, cổng smoke/build (`predeploy`, `check-build-env.mjs`), và cải thiện giao diện/kiểm thử local. Kết quả và giới hạn nằm trong `evidence/predeploy-review.md`; ảnh chụp phiên do nhóm bổ sung.
- **Antigravity**: ghép giao diện native EcoHanoi từ bản thiết kế (`46754a5`), xử lý các mục rà soát UI/UX (`549bcba`, `0ad8a55`), rà soát code chỉ đọc cho module server-voice/rewards (`evidence/review-report.md`), và cập nhật tài liệu minh bạch/kịch bản pitch (`DISCLOSURE.md`, `PLAN.md`, `PITCH.md`).

## Bằng chứng mốc thời gian
- Tag git `pre-hackathon`: commit f9eaa52, 10:51 ngày 14/11/2026.
- Commit trong giờ thi: `git log pre-hackathon..HEAD --oneline`.
