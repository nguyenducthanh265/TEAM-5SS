# EcoHanoi — MASTERPLAN (Codex Community Hackathon Hà Nội, 14/11/2026)

Tài liệu tổng: mục tiêu, kiến trúc, pipeline theo cổng, workflow sub agent, kiểm thử, bằng chứng, rủi ro. Chi tiết từng gói việc nằm ở `profiles/codex-hanoi/ecohanoi/WORK-PACKAGES.md`; hợp đồng và checklist sống nằm ở `PLAN.md`.

## 1. Mục tiêu và thang điểm
| Tiêu chí | Điểm | Việc phải đạt |
|---|---|---|
| 1. Demo AI trên điện thoại thật | 40 | APK cài thẳng, đóng hẳn rồi mở lại, quét món rác thật ra nhãn `source: ai`. Video, giả lập, trình duyệt = 0 |
| 2. Vấn đề thật, có bằng chứng | 35 | QĐ 87 có hiệu lực 08/01/2026; bài test 10 món; phỏng vấn; ảnh hiện trường; độ chính xác AI trên ảnh thật |
| 3. Người dùng đầu tiên, mở rộng | 25 | Kênh có tên và người gật đầu; người dùng thật trong ngày (`/stats`); thêm thành phố = thêm một file luật |
Hòa điểm xét 1 → 2 → 3. Khi hai việc tranh nhau, bảo vệ tiêu chí 1.

## 2. Kiến trúc
```
Điện thoại (APK Expo) ──ảnh ~512px base64──▶ Backend FastAPI (Render)
  expo-camera, hàng chờ ≤3 request             POST /classify  (header X-Device-Id)
  AsyncStorage: XP, lịch sử, id máy            ├─ prompt dựng từ rules/qd87.json
  rules.ts đọc bản sao qd87.json               ├─ OpenAI vision, JSON mode (key chỉ ở server)
                                               ├─ hậu kiểm bằng code: id lạ → unknown, conf<0.5 → unknown
                                               ├─ lỗi/timeout → source: fallback, items: []
                                               └─ /health, /stats, /groups/*
```
Nguyên tắc: một nguồn luật; key không bao giờ ở app; không bao giờ hiện nhãn giả khi AI lỗi; logic quyết định bằng code, model chỉ nhìn ảnh.

## 3. Timeline tổng
| Mốc | Nội dung |
|---|---|
| Tối 13/11 (Cổng 0) | Luật, Form, kênh người dùng, kit, tag `pre-hackathon`, APK khung trên 2 máy, 30–50 ảnh rác |
| 09:00–10:40 | Check-in, đọc lại luật mới, cắm máy, `adb devices`, đánh thức backend |
| 11:00–11:20 | Cổng 1 hợp đồng: `PLAN.md`, `contracts.ts`; bấm build APK #1 |
| 11:20–13:00 | Cổng 2 luồng quét: 4 agent song song |
| 13:00–13:15 | Selftest, rà soát lần 1, build APK #2 |
| 13:15–14:30 | Cổng 3 đủ demo: Cây, Thống kê, đo độ chính xác, nhóm (nếu kịp) |
| 14:00–15:15 | Mời 10–20 người dùng thử APK #2 (song song) |
| 14:30 | CHỐT TÍNH NĂNG, chỉ sửa lỗi |
| 14:30–14:45 | Rà soát lần 2, build APK cuối (muộn nhất 14:45) |
| 14:45–15:30 | Cổng 4 đóng gói: `PITCH.md`, 3 slide, `DISCLOSURE.md` |
| 15:30–15:55 | Cổng 5 tổng duyệt 2 lần ≤ 4:50, nộp trước 15:55 |
| 16:00 | Dừng code. 16:05 `/health`, chụp `/stats` |

## 4. Pipeline: lệnh kiểm tra từng cổng (chưa qua thì không làm việc cổng sau)
| Cổng | Lệnh | Đạt khi |
|---|---|---|
| 0 | `python -X utf8 ml/scripts/check_rules.py rules/qd87.json` | `RESULT: PASS`, hai người đã soát chéo |
| 1 | `cd app && npx tsc --noEmit` | không lỗi; build #1 vào hàng |
| 2 | `cd ml && python -X utf8 -m pytest tests/test_waste*.py -q`; `python -X utf8 ml/scripts/check_rules.py rules/qd87.json --scan-src app/src`; `npx tsc --noEmit`; `python -X utf8 ml/scripts/smoke_test.py <URL> --kind json` | pytest qua, `RESULT: PASS`, tsc sạch, `RESULT: PASS source=ai`, quét được 1 món trên máy dev |
| 3 | `python -X utf8 ml/scripts/demo_check.py --package com.fivess.ecohanoi --scheme ecohanoi --apk <apk> --repeat 3` | `RESULT: PASS` trên máy phụ với APK #2 |
| 4 | tsc + check_rules + smoke, rồi `demo_check.py --repeat 3` trên APK cuối | PASS trên cả 2 máy |
| 5 | Tập pitch bấm giờ, 4G, đóng hẳn/mở lại | Hai lần ≤ 4:50 |
Qua cổng thì commit và đánh dấu `[x]` trong `PLAN.md`. APK mới chỉ thay APK cũ sau khi qua `demo_check.py`.

## 5. Workflow sub agent
Vòng chuẩn cho mỗi gói: giao việc (đúng một gói, chỉ sửa file trong cột chủ file) → agent làm, TDD khi có logic thuần → báo cáo ≤ 10 dòng kèm nguyên văn dòng kết quả lệnh nghiệm thu → điều phối chạy lại lệnh cổng → rà soát → commit.

| Agent | Kit | Gói | Chủ file | Chạy lúc |
|---|---|---|---|---|
| A-backend | ml-engineer | WP-01 `/classify`; WP-08 API nhóm; WP-02 đo độ chính xác | `ml/serve/`, `ml/examples/waste_classifier.py`, `ml/tests/test_waste*.py`, `test_groups.py`, `render.yaml` | 11:20; 13:15 |
| B-shell | fullstack-dev | WP-03 luật + 3 tab; WP-06 tab Cây | `rules.ts`, `tree.ts`, `_layout.tsx`, `(tabs)/index.tsx`, `components/tree/*`, `scripts/sync-rules.mjs` | 11:20; 13:15 |
| C-scan | fullstack-dev | WP-04 màn Quét; WP-10 selftest | `scan.tsx`, `components/scan/*`, `scanQueue.ts`, `session.ts`, `aiClient.ts`, `selftest.tsx` | 11:20; 13:00 |
| D-data | fullstack-dev | WP-05 kho + Xem lại; WP-07 Thống kê; WP-08 phần app | `store.ts`, `progress.ts`, `review.tsx`, `components/review/*`, `stats.tsx`, `components/stats/*`, `groupApi.ts` | 11:20; 13:15 |
| E-review | code-reviewer + security-reviewer | WP-11 (chỉ đọc) | — | 13:00 và 14:30 |
| F-test | e2e theo kit | pytest, tsc, jest, check_rules, smoke; QA trên máy | `evidence/test-report.md` | sau mỗi cổng |
| G-pitch | pitch-coach | WP-12 | `PITCH.md`, `evidence/evidence-log.csv` | 14:45 |
| H-device (người) | devops-deployer | WP-09 build, cài máy, giữ backend thức | `app/app.json`, `app/eas.json` | 11:05, 13:00, 14:45 |
| Điều phối | — | WP-00, ghép nối, cổng, commit | `PLAN.md`, `contracts.ts`, `package.json`, `DISCLOSURE.md` | suốt ngày |

Quy tắc: tối đa 3–4 agent song song; hai agent không sửa cùng một file; không thêm thư viện native sau APK #2; agent treo > 5 phút thì dừng và giao lại phạm vi nhỏ hơn; Codex làm phần thực chất trong 11:00–16:00 và có ảnh chụp phiên (luật "Use Codex meaningfully").

## 6. Kiểm thử
- Backend: pytest với client giả (prompt có đủ id nhóm, id lạ → unknown, JSON hỏng → fallback, `bag` giữ `misplaced`, luật còn TODO → lỗi khởi động, 503 khi quá tải). Cả bộ test của kit không được hỏng.
- App: `tsc --noEmit`, jest cho `progress.ts` (XP, chuỗi ngày qua nửa đêm) và `store.ts` (hai lần lưu liền nhau không mất).
- Luật: `check_rules.py` và quét từ cấm ("hữu cơ", "vô cơ", "4 thùng").
- Thiết bị: `demo_check.py --repeat 3` trên cả 2 máy; checklist QA cuối `profiles/mobile-ai.md` (tắt mạng, từ chối quyền camera, ép fallback, 3 lượt liên tiếp, lượt đầu khi server nguội).
- AI: `llm_eval` với `ml/configs/llm_eval_image.yaml` trên 30–50 ảnh tự chụp; không sửa nhãn cho khớp model; sửa prompt tối đa một lần và ghi cả hai con số.
- Bảo mật: không có key trong `app/`, không `EXPO_PUBLIC_*KEY*`, `.env` không commit, backend không lưu ảnh, log không chứa ảnh.

## 7. Bằng chứng (tiêu chí 2 và 3)
Mỗi câu pitch trỏ tới một dòng trong `evidence/evidence-log.csv` (ngày, nguồn, số hoặc trích nguyên văn). Không có dòng thì bỏ câu. Nói "khảo sát n sinh viên", dưới 20 người dùng dạng "13 trong 18". Không tự bấm nhiều lần để tăng `/stats`. Chi tiết: `profiles/codex-hanoi/ecohanoi/EVIDENCE-PLAN.md`, `GOOGLE-FORM.md`, `PITCH-SCRIPT.md`.

## 8. Quyết định sẵn khi trượt giờ
| Tình huống | Quyết định |
|---|---|
| 13:00 chưa qua Cổng 2 | Bỏ WP-08, WP-07; dồn mọi agent vào luồng quét |
| APK #2 lỗi trên máy thật | Giữ APK #1 ở máy chính, sửa trên máy phụ |
| 14:45 chưa bấm được build cuối | Demo bằng APK #2 |
| Hàng chờ EAS > 25 phút | Build cục bộ nếu đã thử trước, nếu chưa thì chờ |
| OpenAI lỗi hoặc hết credit | App hiện "Chưa phân tích được, chọn nhóm bằng tay"; không giả kết quả AI |
| Wi-Fi quán chập chờn | Máy demo dùng 4G riêng từ đầu |
Thứ tự cắt: WP-08 → WP-07 → chế độ Cả túi → hiệu ứng cây. Không cắt: WP-01, WP-04 (1 món), WP-05, WP-10, WP-11, WP-02, WP-12.

## 9. Rủi ro và việc cần người
| Rủi ro | Xử lý |
|---|---|
| Máy chưa có Node, `adb`, key OpenAI | Cài Node LTS, platform-tools; đặt `OPENAI_API_KEY`, `OPENAI_MODEL` ở biến môi trường; chạy `scripts/setup-app.ps1` |
| File luật do AI soạn | Hai người soát chéo với PDF; 4 món `certainty: suy luận` cần chốt |
| Render free ngủ | `/health` mỗi 10 phút từ 15:30 và 3 phút trước lượt pitch |
| Lộ key | Key chỉ ở env của Render |
| Dùng Codex chưa đủ thực chất | Giao Codex phần thật (sửa lỗi sau tsc, selftest, build), chụp phiên, khai trung thực trong `DISCLOSURE.md` |

## 10. Trạng thái hiện tại (cập nhật lúc tạo tài liệu)
Đã xong: kit cài, `rules/qd87.json` qua `check_rules.py`, `PLAN.md`, `contracts.ts`, tag `pre-hackathon`. Mã app/backend do các sub agent viết dở đã bị dừng, chưa chạy `tsc`/pytest, coi là bản nháp chưa kiểm chứng cho đến khi qua lệnh cổng.
