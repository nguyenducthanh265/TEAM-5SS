# EcoHanoi — mobile QA trước deploy, 14/11/2026

Phạm vi: vai `code-reviewer` + `security-reviewer`, hackathon kit v11, profile `mobile-ai`. Chỉ đọc source; báo cáo này là file duy nhất reviewer sửa. Các lỗi dưới đây được gửi Điều phối để chủ file sửa. Không gọi provider thật, không deploy, không build APK cloud.

## Kết quả baseline đã chạy

| Lệnh trong `app/` | Kết quả |
|---|---|
| `npm.cmd run typecheck` | Exit 0, `tsc --noEmit` sạch |
| `npm.cmd test -- --runInBand` | `Test Suites: 4 passed, 4 total`; `Tests: 34 passed, 34 total` |
| `npm.cmd run smoke` | `RESULT: PASS`, nhưng **`SKIP POST /classify (SMOKE_API_URL not set)`**; chỉ chứng minh cấu trúc local |
| `npm.cmd ls --depth=0` | Exit 0; không thiếu package ở cây dependency trực tiếp |
| `EXPO_OFFLINE=1 expo install --check` | `Dependencies are up to date`, kèm `Dependency validation is unreliable in offline-mode`; không thay cho kiểm tra registry online |
| `CI=1 EXPO_OFFLINE=1 expo export --platform android --output-dir ../.cache/qa-android-export` | Exit 0; `Android Bundled 19270ms ... (1749 modules)`; HBC khoảng 4.3 MB |
| `EXPO_OFFLINE=1 expo config --type prebuild --json` (chỉ in metadata đã lọc) | Exit 0; scheme `ecohanoi`, package `com.fivess.ecohanoi`, SDK `58.0.0`; config plugin resolve thành công |

Android export chỉ kiểm tra Metro/bundle/assets. Chưa chứng minh APK/native build, camera, AsyncStorage native, logcat release hay UI trên điện thoại.

`rules/qd87.json` và `app/src/assets/qd87.json` cùng SHA-256 `33E61E42F687BFFCD13E0AD9E2CD2C2CD528B16A4325023475BE41D2E6220131` tại baseline.

Quét source/config bằng regex cho provider key và `EXPO_PUBLIC_*KEY*`: không thấy secret thực trong phạm vi kiểm tra. Bốn hit đều là fixture trong `ml/tests/test_preflight.py:53,64,68,69`; không in giá trị. Không kiểm chứng secret trong cloud settings, lịch sử git hoặc máy khác.

## Findings baseline

### P1 — Mất kết quả quét khi mở Xem lại trước khi hàng chờ hoàn tất

Vị trí baseline: `app/src/app/(tabs)/scan.tsx:222`, `app/src/app/review.tsx:33`, `app/src/app/review.tsx:133`.

Tái hiện theo source: chụp A và B; A đã `done`, B còn `pending`; nút Xem lại bật vì `reviewItems > 0`; màn review chụp snapshot chỉ các entry `done`. B hoàn tất trong nền khi người dùng xem A. Bấm Lưu: chỉ A được lưu, `clearSession()` xóa toàn bộ gồm B. Entry lỗi cũng mất mà chưa được người dùng quyết định.

Khắc phục: ngăn chuyển vào review khi còn pending và tránh xóa các entry không nằm trong tập đã lưu; đồng bộ thao tác dọn queue/session. Điều phối đã chuyển chủ file UI xử lý.

### P1 — Lỗi đọc storage tạm thời có thể ghi đè XP/lịch sử thật

Vị trí baseline: `app/src/lib/store.ts:105` (`readItem` nuốt lỗi I/O), `app/src/lib/store.ts:131` và `:135` (`saveSession` coi null như chưa có dữ liệu).

Đã tái hiện bằng Node, TypeScript transpile trực tiếp source, VM và storage stub: storage ban đầu có 100 XP và lịch sử `[old]`; mọi `getItem` ném lỗi đọc tạm thời nhưng `multiSet` thành công. Lưu một món mới trả:

```json
{"case":"storage read failure then write success","gained":10,"afterXP":10,"afterHistoryNames":["new"]}
```

Đây là lỗi logic source; stub chỉ mô phỏng trường hợp read fail/write recover. Khắc phục: thao tác đọc trước ghi phải giữ lỗi I/O và từ chối ghi; phân biệt key chưa tồn tại với đọc thất bại. Điều phối nhận sửa và thêm regression test.

### P1 — URL build preview vẫn là placeholder

Vị trí baseline: `app/eas.json:12`.

`EXPO_PUBLIC_API_URL` đang trỏ host mẫu. APK build bằng cấu hình này không đủ điều kiện demo AI thật. Cần URL HTTPS backend đã deploy, smoke ảnh `/classify` nhận `source: ai`, rồi build APK đúng URL. Điều phối chuẩn bị guard để build không vô tình dùng placeholder.

### P2 — Client nhận envelope có `error` thành kết quả AI thành công

Vị trí baseline: `app/src/lib/aiClient.ts:112`.

Đã tái hiện bằng source transpile + mock fetch: response có `source: ai`, `error: provider_down` và một item hợp lệ vẫn trả `kind: ai`. Selftest cũng có thể coi kết quả đó đạt. Backend hiện có kiểm hợp đồng chặt hơn, nhưng client phải từ chối envelope lỗi để tránh drift hoặc proxy trả dữ liệu sai.

Mẫu khác: confidence `0.1` với group hợp lệ được giữ nguyên ở client; nên hạ về `unknown` như backend. Response AI rỗng không được tính là lỗi ở đây: UI có trạng thái không nhận ra món; selftest vẫn đòi ít nhất một món hợp lệ.

### P2 — Dockerfile kit không đóng gói luật EcoHanoi

Vị trí: `ml/Dockerfile:6`–`:10`, `ml/examples/waste_classifier.py` đường mặc định `rules/qd87.json`.

Build context `ml/` không có file luật tại root repo; Dockerfile không copy luật. Dùng `SYSTEM=examples.waste_classifier:run` trong image này sẽ thiếu luật khi chạy. Root `render.yaml` dùng context repo và giữ file luật nên finding này áp dụng đường Docker. Chưa chạy Docker engine/image build.

## Cổng còn NOT VERIFIED

- URL backend public thật; `/health`, request provider thật và smoke ảnh `/classify`.
- APK cài thẳng trên hai điện thoại, `demo_check.py --repeat 3`, force-stop/mở lại, 4G và cold start.
- Quyền camera từ chối/cấp lại, thao tác chụp nhanh, touch targets, font lớn và màn nhỏ trên thiết bị.
- Giữ XP/lịch sử qua đóng app trên AsyncStorage native.
- Độ chính xác trên 30–50 ảnh tự chụp; nội dung luật được hai người soát; số người dùng thật.

Baseline verdict: **NO-GO cho release/demo** cho đến khi sửa P1 và hoàn tất các cổng thật. Local typecheck/Jest/bundle PASS không chứng minh deploy hay thiết bị.

## Rà soát sau sửa — kết quả hiện tại

Đã đọc lại các diff mobile, script và ghép nối sau mốc Điều phối xác nhận UI/lib/script hoàn tất. Trong phạm vi này không thấy thêm P0/P1 source chưa xử lý. Hai lần typecheck giữa lúc worker còn sửa từng báo lỗi typing mock fetch và export `fetchGroupResult` chưa ghép; bản hiện tại đã sửa cả hai, kiểm tra cuối PASS.

| Kiểm tra sau sửa | Kết quả thực đo |
|---|---|
| `npm.cmd run typecheck` | Exit 0; không lỗi TypeScript |
| `npm.cmd test -- --runInBand` | `Test Suites: 7 passed, 7 total`; `Tests: 53 passed, 53 total` |
| `npm.cmd run test:checks` | 10 passed, 0 failed; server trong các test là fixture localhost, không phải provider thật |
| `npm.cmd run smoke` | `RESULT: PASS LOCAL-ONLY (AI NOT VERIFIED)`; HTTP bị SKIP vì không có URL |
| `npm.cmd run predeploy` | Exit 1 đúng thiết kế: `RESULT: FAIL POST /classify required: SMOKE_API_URL not set` |
| `CI=1 EXPO_OFFLINE=1 expo export --platform android --output-dir ../.cache/qa-android-final` | Exit 0; `Android Bundled 9891ms ... (1750 modules)`; 46 assets, HBC khoảng 4.4 MB |
| `python -X utf8 ml/scripts/check_rules.py rules/qd87.json --scan-src app/src` | `RESULT: PASS` |
| `git diff --check` | Exit 0; chỉ cảnh báo chuyển LF/CRLF, không lỗi whitespace |
| Quét secret source/config lần cuối | Vẫn chỉ 4 fixture test; không tìm thấy secret thực trong phạm vi regex |

Bundle local sau sửa: `.cache/qa-android-final/_expo/static/js/android/entry-e03929b9fe31a76b6ecfd0b2605294c4.hbc`, SHA-256 `F905EAFE4A096C697195D43866AFEB3CEF4837893FC33D3C343515C34256D981`. Đây là artifact QA local, chưa phải APK. Hash hai file luật sau sửa vẫn trùng baseline.

### Tình trạng findings

- **Đã sửa P1 mất kết quả pending:** scan chặn vào review khi pending; direct-link review cũng chặn lưu nếu có pending lúc mở (`review.tsx:43,112`); sau lưu chỉ `remove(entry.id)` trong tập đã xem (`review.tsx:132`), giữ các thẻ lỗi để retry. Không dọn toàn bộ phiên ngoài ý muốn.
- **Đã sửa P1 storage:** `store.ts:91` truyền lỗi I/O lên caller; test chứng minh save thất bại không ghi đè history/progress và retry thành công. Tree/Stats có trạng thái lỗi/tải lại; TeamCard bắt lỗi storage (`TeamCard.tsx:50`).
- **Đã sửa P2 client:** `aiClient.ts:35,102,111` hạ confidence không an toàn về unknown, từ chối envelope có error và danh sách món hỏng một phần; có regression test.
- **Đã bổ sung chống lưu đôi:** khóa ref đồng bộ ở `components/review/saveLock.ts`; test nhấn đôi không gọi save hai lần, lỗi thì nhả khóa cho retry.
- **Đã ghép API nhóm:** `fetchGroupResult` phân biệt `404/not_found` và lỗi mạng/server; `fetchGroup` cũ vẫn trả `GroupInfo | null`; UI TeamCard không biến network error thành nhóm rỗng.
- **URL preview còn placeholder, đã có guard:** `app/eas.json:12` chưa đổi vì chưa có URL thật. `eas-build-pre-install` gọi `scripts/check-build-env.mjs` để từ chối URL trống/mẫu/local; 10 test guard/smoke PASS. Vẫn cần URL thật và request provider thật, guard không thay cho bằng chứng đó.
- **Docker path còn giới hạn:** finding Dockerfile thiếu luật vẫn chưa xử lý trong phạm vi mobile; Render root config là đường deploy hiện định dùng. Không xác nhận Docker image hoạt động.

UI/UX ở mức source: target chính tối thiểu 48, cảnh báo/permission/camera readiness rõ hơn, loading/error/retry cho dữ liệu, review một cột trên màn nhỏ/font lớn, sheet cuộn có safe area, tương phản chữ nhãn tốt hơn. Chưa kiểm thao tác tay, layout thực tế hay screen reader trên điện thoại; các mục thiết bị ở trên vẫn **NOT VERIFIED**.

Kết luận hiện tại: **PASS QA local cho các sửa mobile được review; NO-GO release/demo thật** vì URL/provider/APK/hai thiết bị và các bằng chứng plan chưa được kiểm chứng. Không deploy, push hay gọi provider trong lượt QA này.
