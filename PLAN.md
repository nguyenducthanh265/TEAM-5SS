# EcoHanoi — PLAN (ngày thi 14/11/2026, code 11:00–16:00)

Một luồng demo: mở app → tab Cây → QUÉT RÁC → chụp món → AI trả 1 trong 3 nhóm QĐ 87 (tên, lý do, mẹo) → Xem lại, sửa nhãn → Lưu & Nuôi cây → cây lớn. Đóng hẳn app, mở lại vẫn còn dữ liệu và AI vẫn chạy.

Thứ tự ưu tiên = thứ tự điểm: quét AI trên APK (40) → bằng chứng vấn đề (35) → người dùng + mở rộng (25).
Chi tiết từng gói: `profiles/codex-hanoi/ecohanoi/WORK-PACKAGES.md`. Luật giải: `profiles/codex-hanoi/EVENT-RULES.md`.

## Cấu trúc repo
- `rules/qd87.json` — nguồn luật duy nhất (3 nhóm, nguy hại, cồng kềnh, 10 món dễ sai)
- `ml/` — backend FastAPI (`serve/app_llm.py` của kit + `/classify`), `examples/waste_classifier.py`
- `app/` — Expo + expo-router, mã ở `app/src/` (`src/app` là route, `src/lib`, `src/components`)
- `render.yaml` — deploy backend lên Render
- `evidence/` — nhật ký bằng chứng, ảnh chụp `/stats`

## Hợp đồng
- `POST /classify` body `{image: <base64 jpeg>, mode: 'item'|'bag'}`, header `X-Device-Id` → `{items[], source: 'ai'|'fallback', latencyMs, error?}` (camelCase). Quá tải: 503 `{source:'busy'}`.
- `GET /health`, `GET /stats` (của kit). `POST /groups/score`, `GET /groups/{code}` (WP-08).
- Kiểu dữ liệu: `app/src/lib/contracts.ts`.
- `app/src/lib/rules.ts`: `getGroups(): RuleGroup[]`, `getGroup(id): RuleGroup|undefined`, `getHazardous(): {note, color_hex, examples}`, `groupColor(id): string`, `groupShort(id): string`, `UNKNOWN_GROUP` (`{id:'unknown', short:'Chưa chắc — chọn tay', color_hex}`), `isValidGroupId(id)`.
- `app/src/lib/store.ts`: `getProgress()`, `saveSession(entries: ScanEntry[]): Promise<{gained:number, progress:Progress}>`, `getHistory(days): Promise<SavedItem[]>`, `getDeviceId()`, `getGroupCode()`, `setGroupCode(code)`, `getSampleMode()`, `setSampleMode(on)`.
- `app/src/lib/scanQueue.ts`: `useScanQueue()` → `{entries, enqueue(uri, mode), retry(id), clear(), doneCount}`; `classifyImage(base64, mode): Promise<ClassifyResult>` (selftest dùng lại đúng hàm này).
- `app/src/lib/session.ts`: giữ phiên quét hiện tại trong bộ nhớ để màn Xem lại đọc (`getSessionEntries()`, `setSessionEntries()`, `clearSession()`), chủ: WP-04.
- Biến build: `EXPO_PUBLIC_API_URL`. Trong `app/` không có key nào. `scheme`: `ecohanoi`, package: `com.fivess.ecohanoi`.

## Phân công sub agent (mỗi file một chủ)
| Agent | Vai kit | Gói | Chủ file |
|---|---|---|---|
| A-backend | ml-engineer | WP-01, sau đó WP-08 API | `ml/serve/`, `ml/examples/waste_classifier.py`, `ml/tests/test_waste*.py`, `ml/tests/test_groups.py`, `render.yaml` |
| B-shell | fullstack-dev | WP-03, sau đó WP-06 | `app/scripts/sync-rules.mjs`, `app/src/lib/rules.ts`, `app/src/lib/tree.ts`, `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `app/src/components/tree/*` |
| C-scan | fullstack-dev | WP-04, sau đó WP-10 | `app/src/app/(tabs)/scan.tsx`, `app/src/components/scan/*`, `app/src/lib/scanQueue.ts`, `app/src/lib/session.ts`, `app/src/lib/aiClient.ts`, `app/src/app/selftest.tsx` |
| D-data | fullstack-dev | WP-05, sau đó WP-07 | `app/src/lib/store.ts`, `app/src/lib/progress.ts`, `app/src/lib/__tests__/*`, `app/src/app/review.tsx`, `app/src/components/review/*`, `app/src/app/(tabs)/stats.tsx`, `app/src/components/stats/*`, `app/src/lib/groupApi.ts` |
| E-review | code-reviewer + security-reviewer | WP-11 (chỉ đọc) | — |
| F-test | kiểm thử | pytest, `tsc`, `check_rules --scan-src`, smoke | `evidence/test-report.md` |
| G-pitch | pitch-coach | WP-12 (khi có số thật) | `PITCH.md`, `evidence/evidence-log.csv` |
| Điều phối (agent chính) | — | WP-00, ghép nối, cổng, commit | `PLAN.md`, `app/src/lib/contracts.ts`, `app/package.json`, `app/app.json`, `app/eas.json`, `scripts/`, `DISCLOSURE.md` |

## Cổng và checklist
### Cổng 0 — nền (xong trước 11:00)
- [x] Cài kit v11 (profile mobile-ai) vào gốc repo
- [x] `rules/qd87.json` soạn từ PDF gốc; `check_rules.py` → `RESULT: PASS`
- [x] Thư viện Python backend đã cài
- [x] `git tag pre-hackathon`
- [ ] NGƯỜI: hai người soát chéo `rules/qd87.json` với văn bản, đổi `review_status`
- [ ] NGƯỜI: cài Node.js LTS + Android platform-tools (`adb`) trên máy này
- [ ] NGƯỜI: `OPENAI_API_KEY`, `OPENAI_MODEL` (chỉ đặt ở biến môi trường), tài khoản Render, Expo, GitHub

### Cổng 1 — hợp đồng (11:00–11:20)
- [x] `PLAN.md`, `app/src/lib/contracts.ts`
- [ ] Khung Expo: `powershell -File scripts/setup-app.ps1` (cần Node) → `npx tsc --noEmit` sạch

### Cổng 2 — luồng quét đầu–cuối (11:20–13:00)
- [ ] WP-01 backend `/classify` theo file luật + test (A-backend)
- [ ] WP-03 nguồn luật + 3 tab (B-shell)
- [ ] WP-04 màn Quét, hàng chờ 3 request (C-scan)
- [ ] WP-05 kho dữ liệu + Xem lại (D-data)
- [ ] Kiểm: `pytest ml/tests/test_waste*.py`; `check_rules.py --scan-src app/src` PASS; `tsc` sạch
- [ ] NGƯỜI: deploy Render, `smoke_test.py <URL>` → `RESULT: PASS source=ai`

### Cổng 3 — đủ bản demo (13:00–14:30)
- [ ] WP-10 selftest deep link `ecohanoi://selftest` (C-scan)
- [ ] WP-06 tab Cây (B-shell)
- [ ] WP-07 tab Thống kê (D-data)
- [ ] WP-08 nhóm + bảng xếp hạng (A-backend, D-data) — cắt đầu tiên nếu trễ
- [ ] WP-11 rà soát code + bảo mật lần 1 (E-review), sửa lỗi mức Chặn
- [ ] NGƯỜI: build APK #2 (`eas build -p android --profile preview`), cài 2 máy, `demo_check.py --repeat 3`
- [ ] NGƯỜI: WP-02 đo độ chính xác trên 30–50 ảnh rác tự chụp

### 14:30 CHỐT TÍNH NĂNG — từ đây chỉ sửa lỗi
### Cổng 4 — đóng gói (14:30–15:30)
- [ ] WP-11 lần 2, build APK cuối muộn nhất 14:45
- [ ] `DISCLOSURE.md` điền trung thực (gồm việc dùng Claude Code và Codex)
- [ ] WP-12 `PITCH.md` với số thật từ `evidence/`
### Cổng 5 — tổng duyệt (15:30–15:55)
- [ ] Tập pitch 2 lần ≤ 4:50, nộp trước 15:55

## Thứ tự cắt khi thiếu giờ
WP-08 → WP-07 → chế độ Cả túi → hiệu ứng cây. Không cắt: WP-01, WP-04 (1 món), WP-05, WP-10, WP-11, WP-02, WP-12.

## Nhật ký build (WP-09)
| APK | Giờ bấm | Giờ xong | demo_check máy 1 | demo_check máy 2 |
|---|---|---|---|---|
