# EcoHanoi — gói việc cho sub agent

Tên agent ghi theo Codex (`fullstack_dev`); Claude Code và Antigravity dùng dấu gạch ngang (`fullstack-dev`).
Đường dẫn theo repo `hanoi-waste-app`: app ở `app/`, backend ở `ml/`, luật ở `rules/qd87.json`. Repo khác thì đổi ở `PLAN.md` một lần.

**Quy ước cho mọi gói:**
- Agent chỉ sửa file trong cột "Chủ file". Cần sửa file ngoài phạm vi → dừng, báo điều phối.
- Xong = lệnh ở "Nghiệm thu" chạy ra đúng kết quả, dán nguyên văn dòng kết quả vào báo cáo. Không viết "đã xong" khi chưa chạy.
- Không thêm thư viện native mới sau khi APK #2 đã build (thêm = phải build lại).
- Không viết tay tên nhóm rác, màu, hướng dẫn. Lấy từ file luật qua `rules.ts`.
- Chữ trên giao diện: tiếng Việt, ngắn, không dùng "hữu cơ", "vô cơ", "4 thùng".
- API key chỉ ở biến môi trường server. Trong `app/` không có key nào.

## Bảng chủ file (tránh hai agent đụng nhau)
| File / thư mục | Gói | Agent |
|---|---|---|
| `PLAN.md`, `app/src/lib/contracts.ts` | WP-00 | điều phối + `fullstack_dev` |
| `ml/serve/`, `ml/examples/waste_classifier.py`, `ml/tests/test_waste*.py` | WP-01 | `ml_engineer` |
| `ml/configs/llm_eval_image.yaml`, `ml/data/` | WP-02 | `ml_engineer` |
| `app/src/lib/rules.ts`, `app/src/lib/waste.ts`, `app/scripts/sync-rules.mjs`, `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx` | WP-03 | `fullstack_dev` (A) |
| `app/src/app/(tabs)/scan.tsx`, `app/src/components/scan/*`, `app/src/lib/scanQueue.ts` | WP-04 | `fullstack_dev` (B) |
| `app/src/lib/store.ts`, `app/src/app/review.tsx`, `app/src/components/review/*` | WP-05 | `fullstack_dev` (C) |
| `app/src/app/(tabs)/index.tsx`, `app/src/components/tree/*`, `app/src/lib/tree.ts` | WP-06 | `fullstack_dev` (A) |
| `app/src/app/(tabs)/stats.tsx`, `app/src/components/stats/*` | WP-07 | `fullstack_dev` (C) |
| `ml/serve/groups.py`, `ml/tests/test_groups.py`, `app/src/lib/groupApi.ts` | WP-08 | `ml_engineer` rồi `fullstack_dev` (B) |
| `app/eas.json`, `app/app.json`, build, cài máy | WP-09 | `devops_deployer` |
| `app/src/app/selftest.tsx`, `app/scripts/smoke-test.mjs` | WP-10 | `fullstack_dev` (B) |
| (chỉ đọc) | WP-11 | `code_reviewer`, `security_reviewer` |
| `PITCH.md`, `profiles/codex-hanoi/evidence-log.csv` | WP-12 | `pitch_coach` |

Nếu cấu trúc thư mục thật khác (ví dụ không có `(tabs)`), điều phối sửa bảng này trong `PLAN.md` ở WP-00 rồi mới giao việc.

---

## WP-00 · Hợp đồng chung · 11:00–11:20 · P0
**Agent:** điều phối + `fullstack_dev`. **Chặn:** mọi gói khác.
**Việc:**
1. Viết `PLAN.md` ≤ 15 dòng: một luồng demo, bảng chủ file đã chỉnh theo repo, giờ các cổng.
2. Tạo `app/src/lib/contracts.ts` — kiểu dữ liệu dùng chung, không có logic:
   ```ts
   export type GroupId = string;                 // id nhóm trong rules/qd87.json
   export type ScanMode = 'item' | 'bag';
   export interface ClassifiedItem {
     name: string;            // tên món, tiếng Việt, ≤ 40 ký tự
     groupId: GroupId | 'unknown';
     confidence: number;      // 0..1
     reason: string;          // 1 câu, ≤ 120 ký tự
     tip?: string;            // mẹo xử lý, ≤ 80 ký tự
     hazardous?: boolean;     // pin, bóng đèn...: hiện hướng dẫn riêng từ rules.hazardous
     sellable?: boolean;      // bán ve chai được
     misplaced?: boolean;     // chỉ ở chế độ 'bag': món nằm sai túi
   }
   export interface ClassifyResponse { items: ClassifiedItem[]; source: 'ai' | 'fallback'; latencyMs: number; }
   export interface ScanEntry {
     id: string; uri: string; mode: ScanMode; createdAt: number;
     status: 'pending' | 'done' | 'error';
     items: ClassifiedItem[];
     corrected?: boolean;     // người dùng đã sửa nhãn ở màn Xem lại
   }
   export interface Progress { xp: number; streakDays: number; lastScanDay?: string; totalItems: number; correctedItems: number; }
   ```
3. Chốt hợp đồng HTTP với backend (ghi vào `PLAN.md`): `POST /classify` body `{image: <base64 jpeg>, mode: 'item'|'bag'}`, header `X-Device-Id`; trả `ClassifyResponse` (khóa JSON dạng camelCase như trên).
**Nghiệm thu:** `cd app && npx tsc --noEmit` không lỗi; `PLAN.md` có bảng chủ file.

## WP-01 · Backend phân loại theo file luật · 11:20–12:30 · P0
**Agent:** `ml_engineer`. **Cần:** WP-00. Đây là **tính năng AI làm trong ngày** — viết mới, không chép hàm cũ.
**Việc:**
1. `ml/examples/waste_classifier.py`: hàm `run(input)` theo hợp đồng `mlkit/result.py`, dựa trên `openai_system_template.py`:
   - Đọc `rules/qd87.json` **một lần lúc khởi động** (đường dẫn qua biến `RULES_PATH`); thiếu file hoặc còn TODO → raise ngay, server không khởi động với luật hỏng.
   - Dựng system prompt từ file luật: liệt kê `id` + `name` + ví dụ + ngoại lệ của từng nhóm, phần `hazardous`, và `hard_items`. Không có tên nhóm nào viết tay trong prompt.
   - Yêu cầu model trả JSON: `{"items":[{"name","group_id","confidence","reason","tip","hazardous","sellable","misplaced"}]}`. Chế độ `item`: đúng 1 món (món chiếm phần lớn khung hình). Chế độ `bag`: tối đa 8 món, `misplaced=true` cho món khác nhóm với đa số.
   - Ảnh không phải rác / quá mờ → `items: []` (app hiện "Chưa thấy rõ món, chụp lại gần hơn").
2. **Hậu kiểm bằng code, không tin model:** `group_id` không có trong file luật → đổi thành `unknown`; `confidence` ép về [0,1]; `confidence < 0.5` → `unknown`; cắt độ dài chuỗi; bỏ món trùng tên.
3. Endpoint `POST /classify` trong `ml/serve/` (bọc `run`, đổi khóa sang camelCase, ghi `_record` để `/stats` đếm). Giữ nguyên timeout, giới hạn đồng thời, `source: fallback` khi lỗi.
4. Test bằng client giả (không gọi mạng): prompt chứa đủ id của file luật; id lạ → `unknown`; JSON hỏng → fallback; chế độ `bag` giữ cờ `misplaced`; file luật còn TODO → lỗi khởi động.
5. Deploy Render (biến `OPENAI_API_KEY`, `OPENAI_MODEL`, `RULES_PATH`).
**Nghiệm thu:** `cd ml && python -m pytest tests/test_waste*.py -q` qua; `python scripts/smoke_test.py <URL>` in `RESULT: PASS source=ai`; một lệnh `curl` gửi ảnh chai nhựa trả về `groupId` có trong file luật.
**Không làm:** không lưu ảnh xuống đĩa; không log nội dung ảnh; không tự thêm nhóm thứ tư.

## WP-02 · Đo độ chính xác trên ảnh thật · 13:15–14:15 · P0 (cho điểm mục 2)
**Agent:** `ml_engineer`. **Cần:** WP-01, ảnh ở Cổng 0.8.
**Việc:** chạy `python -m mlkit.tasks.llm_eval train --config configs/llm_eval_image.yaml` với `system` trỏ vào `examples.waste_classifier:run` (cách ghi dataset ở đầu file cấu hình); in bảng đúng/sai theo nhóm; liệt kê 5 ảnh sai kèm lý do; nếu một loại lỗi lặp lại → sửa prompt **một lần**, chạy lại, ghi cả hai con số.
**Nghiệm thu:** một dòng dạng `accuracy 41/50 = 82%` + tên file báo cáo; con số được ghi vào `evidence-log.csv`.
**Không làm:** không sửa nhãn của ảnh test cho khớp model; không bỏ ảnh khó ra khỏi bộ test.

## WP-03 · Nguồn luật duy nhất + khung 3 tab · 11:20–12:15 · P0
**Agent:** `fullstack_dev` (A). **Cần:** WP-00.
**Việc:**
1. `app/scripts/sync-rules.mjs`: chép `../rules/qd87.json` vào `app/src/assets/qd87.json`; thêm vào `package.json` script `prebuild`/`prestart` để luôn đồng bộ. Một nguồn: file ở gốc repo.
2. `app/src/lib/rules.ts`: `getGroups()`, `getGroup(id)`, `getHazardous()`, `groupColor(id)`, `UNKNOWN_GROUP` (nhãn "Chưa chắc — chọn tay"). Mọi màn chỉ đọc qua file này.
3. Viết lại `app/src/lib/waste.ts`: bỏ 5 `WasteGroupId` cũ, `GroupId` lấy từ file luật. Xóa `WasteBinLegend.tsx` kiểu 4 thùng (hoặc viết lại để vẽ từ `getGroups()`).
4. Thanh đáy 3 tab bằng expo-router: **Cây** (`index`) · **Quét** (`scan`) · **Thống kê** (`stats`); màn `review` và `selftest` nằm ngoài tab. Đổi tab ≤ 200 ms, không hiệu ứng rèm.
5. Màn tạm cho 3 tab (chỉ tiêu đề) để các gói khác ghép vào.
**Nghiệm thu:** `npx tsc --noEmit` sạch; `python ../ml/scripts/check_rules.py ../rules/qd87.json --scan-src src` in `RESULT: PASS`; mở app thấy 3 tab.

## WP-04 · Màn Quét: chụp liên tiếp, phân tích song song · 11:20–13:00 · P0 (trọng tâm 40 điểm)
**Agent:** `fullstack_dev` (B). **Cần:** WP-00; ghép backend khi WP-01 xong (trước đó dùng hàm giả trả sau 1,5 giây, **xóa hàm giả trước Cổng 2**).
**Việc:**
1. `scan.tsx`: camera toàn màn hình (`expo-camera`), xin quyền lúc vào màn; từ chối → màn giải thích + nút mở Cài đặt.
2. Nút chụp to ở đáy; bấm liên tiếp được, không khóa trong lúc chờ. Công tắc **1 món / Cả túi**.
3. `scanQueue.ts`: mỗi ảnh → thu nhỏ cạnh dài ~512 px, JPEG chất lượng ~0,6 → gọi `classify` (dựa trên `aiClient.ts`, timeout 20 giây). Tối đa **3 request cùng lúc**, phần còn lại xếp hàng. Mỗi ảnh là một `ScanEntry`.
4. Khay đáy: mỗi ảnh hiện thẻ nhỏ ngay khi chụp (trạng thái "đang soi…"); có kết quả thì thẻ đổi màu theo nhóm, hiện tên món + tên ngắn của nhóm.
5. Khoảnh khắc nhận diện: nhãn nhóm + "+XP" bay lên ~250 ms (Reanimated, chỉ `transform`/`opacity`), rung nhẹ (`expo-haptics`). Món `hazardous` rung kiểu cảnh báo và hiện câu hướng dẫn từ `rules.hazardous`.
6. Chế độ Cả túi: thẻ có huy hiệu "N món sai túi" khi có `misplaced`.
7. Lỗi: hết thời gian / mất mạng / `source: fallback` → thẻ "Chưa phân tích được" + nút thử lại. Không bao giờ hiện nhãn giả.
8. Nút **Xem lại N món** (N = số thẻ đã xong) → màn `review`.
**Nghiệm thu:** trên máy thật: chụp 4 ảnh trong 5 giây, cả 4 đều ra kết quả, thứ tự hiển thị theo ảnh nào xong trước; tắt mạng → thẻ lỗi có nút thử lại; `npx tsc --noEmit` sạch.
**Không làm:** không nhận diện theo từng khung hình; không tự chụp theo hẹn giờ ở bản đầu (thêm sau nếu dư giờ); không gọi OpenAI trực tiếp từ app.

## WP-05 · Kho dữ liệu trên máy + màn Xem lại · 11:20–12:45 · P0
**Agent:** `fullstack_dev` (C). **Cần:** WP-00.
**Việc:**
1. `store.ts` (AsyncStorage): `getProgress()`, `saveSession(entries)`, `getHistory(days)`, `getDeviceId()` (id ngẫu nhiên tạo một lần, gửi làm `X-Device-Id`), `getGroupCode()/setGroupCode()`. Mọi số bắt đầu từ 0. Ghi theo kiểu đọc–sửa–ghi có khóa đơn giản để hai lần lưu liền nhau không mất dữ liệu.
2. Quy tắc điểm (hằng số ở đầu file, dễ đổi): mỗi món xác nhận +10 XP; món `misplaced` được người dùng nhận ra +5; chuỗi ngày tăng khi có ít nhất 1 lần lưu trong ngày.
3. `review.tsx`: lưới các món vừa quét (ảnh nhỏ, tên, nhóm). Chạm vào món → chọn lại nhóm từ `getGroups()` (+ "Bỏ món này"). Món đã sửa đánh dấu `corrected`.
4. Nút **Lưu & Nuôi cây**: ghi vào kho, cộng XP, quay về tab Cây kèm tham số `gained=<XP>` để cây chạy hiệu ứng lớn lên.
5. Bật "Dữ liệu mẫu" (công tắc trong Cài đặt, mặc định tắt): khi bật, mọi màn hiện nhãn "Dữ liệu mẫu".
**Nghiệm thu:** test đơn vị cho `store.ts` (cộng XP, chuỗi ngày qua nửa đêm, hai lần lưu liên tiếp không mất); lưu xong **đóng hẳn app, mở lại** vẫn còn XP và lịch sử; `tsc` sạch.

## WP-06 · Tab Cây · 13:15–14:15 · P0 (bản tối thiểu) / P1 (cây nhóm)
**Agent:** `fullstack_dev` (A). **Cần:** WP-05.
**Việc:**
1. `tree.ts`: 4 giai đoạn theo XP (ngưỡng là hằng số: 0 / 50 / 150 / 400), tên giai đoạn: Mầm non → Cây non → Tán xanh → Đại thụ. Trạng thái "khát nước" khi hôm nay chưa quét.
2. `index.tsx`: cây ở giữa (ảnh tĩnh từng giai đoạn; có Lottie hợp lệ giấy phép thì dùng), XP, chuỗi ngày, nút **QUÉT RÁC** to dẫn sang tab Quét.
3. Khi vào với `gained`: giọt nước bay vào cây, số XP đếm lên, đổi giai đoạn nếu vượt ngưỡng (≤ 600 ms tổng).
4. (P1) Tab phụ "Cây nhóm": ô nhập mã nhóm; đã có mã thì hiện cây chung + bảng xếp hạng từ WP-08; chưa có API thì ẩn hẳn tab phụ, không hiện số giả.
**Nghiệm thu:** lưu 5 món ở màn Xem lại → cây đổi từ Mầm non sang Cây non có hiệu ứng; mở lại app cây giữ nguyên giai đoạn.

## WP-07 · Tab Thống kê · 13:15–14:00 · P1
**Agent:** `fullstack_dev` (C). **Cần:** WP-05.
**Việc:** từ `getHistory(30)`: số món theo từng nhóm (thanh ngang, màu theo file luật), tổng món, số món đã tự sửa nhãn, số món "bán ve chai được". Trạng thái trống: "Chưa có lượt quét nào" + nút sang Quét. Không biểu đồ phức tạp.
**Nghiệm thu:** người dùng mới thấy trạng thái trống; sau 1 phiên lưu thấy đúng số món theo nhóm.

## WP-08 · Nhóm bằng mã + bảng xếp hạng · 13:30–14:30 · P1 (cắt đầu tiên nếu trễ)
**Agent:** `ml_engineer` (API) rồi `fullstack_dev` (B) (ghép app). **Cần:** Cổng 2 đã qua.
**Việc:**
1. `ml/serve/groups.py`: `POST /groups/score` `{code, deviceId, xpDelta, items}` → cộng điểm; `GET /groups/{code}` → `{code, xp, members, rank, top:[{code,xp}]}`. Mã nhóm: 3–20 ký tự chữ/số/gạch ngang, chuẩn hóa chữ hoa. `xpDelta` giới hạn ≤ 200 mỗi lần gọi.
2. Lưu trữ: Postgres nếu đã có sẵn `DATABASE_URL`; nếu không thì RAM + ghi rõ "mất khi server khởi động lại" trong báo cáo (đủ cho demo trong ngày).
3. `groupApi.ts` + gọi khi Lưu ở màn Xem lại (lỗi mạng thì bỏ qua, không chặn việc lưu cục bộ).
**Nghiệm thu:** `pytest tests/test_groups.py` qua; hai máy cùng mã nhóm thấy XP nhóm cộng dồn.

## WP-09 · Build, cài máy, giữ backend thức · suốt ngày · P0
**Agent:** `devops_deployer` + người Thiết bị. Nạp skill `android-apk-device`.
**Việc:**
1. 11:05 — build APK #1 từ code hiện có (kiểm pipeline). Ghi số phút.
2. 13:00 — `tsc` sạch thì build APK #2. Về → cài **máy phụ** → `demo_check.py --repeat 3` → đạt thì cài máy chính. Tạo mã QR link tải cho người dùng thử.
3. 14:45 (muộn nhất) — build APK cuối. Quy trình cài như trên. Không đạt → giữ APK #2.
4. Mỗi 10 phút từ 15:30 và 3 phút trước lượt pitch: `curl <URL>/health`.
5. Trước mỗi lần deploy lại backend: chụp `/stats` (số liệu nằm trong RAM).
6. Không đổi `android.package`, `scheme`, URL backend sau APK #2.
**Nghiệm thu:** bảng trong `PLAN.md`: giờ bấm build, giờ xong, kết quả `demo_check.py` từng máy.

## WP-10 · Selftest + smoke cho giao diện mới · 13:00–13:15 · P0
**Agent:** `fullstack_dev` (B).
**Việc:** `selftest.tsx` (deep link `<scheme>://selftest`) gọi `/classify` thật bằng một ảnh nhỏ đóng kèm trong app, kiểm `source === 'ai'` và `groupId` thuộc file luật, rồi `console.log('HACKCHECK SELFTEST PASS')` hoặc `FAIL <lý do>`. Cập nhật `scripts/smoke-test.mjs` theo 3 tab và hợp đồng mới.
**Nghiệm thu:** `npm run smoke` qua; `demo_check.py` thấy dòng PASS.

## WP-11 · Rà soát · 13:00 và 14:30 · P0
**Agent:** `code_reviewer` + `security_reviewer` (chỉ đọc, chạy song song).
**Danh sách kiểm:**
- Không có key/token trong `app/`, không có `EXPO_PUBLIC_*KEY*`; `.env` không bị commit.
- Không còn hàm giả/`setTimeout` giả kết quả AI trong luồng quét.
- Không còn chuỗi nhóm viết tay; `check_rules.py --scan-src` PASS.
- Mọi request có timeout và nhánh lỗi hiển thị cho người dùng.
- Dữ liệu sống sót sau khi đóng hẳn app (đọc `store.ts`).
- Backend không lưu ảnh; log không chứa ảnh hay id máy dạng gốc.
- Chữ trên giao diện không hứa "chính xác 100%".
**Báo cáo:** tối đa 10 dòng, chia **Chặn** (phải sửa trước build) / **Nên sửa** / **Bỏ qua được**. Không tự sửa code.

## WP-12 · Pitch với số thật · 14:45–15:30 · P0
**Agent:** `pitch_coach` + người Bằng chứng.
**Việc:** đọc `evidence-log.csv`, kết quả WP-02, ảnh chụp `/stats`; điền mọi ô `[...]` trong `PITCH-SCRIPT.md` thành `PITCH.md`; đánh dấu câu nào chưa có bằng chứng vào mục "Thiếu bằng chứng" và **xóa câu đó khỏi lời nói**; soạn 3 slide (vấn đề + số, người dùng thật, kênh + mở rộng); chuẩn bị 6 câu hỏi–đáp.
**Nghiệm thu:** `PITCH.md` không còn ngoặc vuông; đọc to ≤ 4:50; mỗi con số có nguồn ghi bên cạnh.

---

## Thứ tự cắt khi thiếu giờ (cắt từ trên xuống)
1. WP-08 nhóm + bảng xếp hạng → nói trong pitch là bước tiếp theo.
2. WP-07 thống kê → ẩn tab, còn 2 tab.
3. Chế độ Cả túi trong WP-04 → ẩn công tắc.
4. Hiệu ứng cây trong WP-06 → cây tĩnh + số XP.
Không bao giờ cắt: WP-01, WP-04 (chế độ 1 món), WP-05 (lưu), WP-09, WP-10, WP-11, WP-02, WP-12.
