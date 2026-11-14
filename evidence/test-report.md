# Test Report — Lần 1 (WP-11)

## 1. `cd ml && python -X utf8 -m pytest -q --basetemp=.cache/pt`
```text
........................................................................ [ 50%]
.......................................................................  [100%]
143 passed, 4 skipped in 41.50s
```
(4 skipped là các test kit yêu cầu `sklearn`/`onnx`: `test_biosignal.py`, `test_metrics.py`, `test_serve.py`, `test_tabular.py`; toàn bộ `test_waste_api.py`, `test_waste_classifier.py`, `test_groups.py` đều pass.)

## 2. `python -X utf8 ml/scripts/check_rules.py rules/qd87.json`
```text
RESULT: PASS
```

## 3. `python -X utf8 ml/scripts/check_rules.py rules/qd87.json --scan-src app/src`
```text
RESULT: PASS
```

## 4. `cd app && npx tsc --noEmit`
```text
(exit code 0, không có lỗi)
```

## 5. `cd app && npx jest --ci`
```text
PASS src/lib/__tests__/store.test.ts
PASS src/lib/__tests__/progress.test.ts
PASS src/lib/__tests__/tree.test.ts
PASS src/lib/__tests__/rules.test.ts

Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        1.448 s
Ran all test suites.
```

## 6. `cd app && npm run smoke`
```text
> ecohanoi@1.0.0 smoke
> node scripts/smoke-test.mjs

PASS file src/app/(tabs)/index.tsx
PASS file src/app/(tabs)/scan.tsx
PASS file src/app/(tabs)/stats.tsx
PASS file src/app/review.tsx
PASS file src/app/selftest.tsx
PASS file src/lib/rules.ts
PASS file assets/selftest.jpg
PASS app.json scheme === 'ecohanoi' (got "ecohanoi")
PASS app.json android.package === 'com.fivess.ecohanoi' (got "com.fivess.ecohanoi")
PASS no API key in src/
SKIP POST /classify (SMOKE_API_URL not set)
RESULT: PASS
```

## 7. `python -X utf8 ml/scripts/smoke_test.py <URL> --kind json`
Chưa chạy vì `app/eas.json` vẫn đang để URL mẫu `https://TEN-BACKEND.onrender.com` (chưa có URL Render thật).

## 8. Kiểm tra WP-11 bổ sung
- `git ls-files` lọc `env`: chỉ có `app/.env.example` (chỉ chứa `EXPO_PUBLIC_API_URL=https://TEN-BACKEND.onrender.com`), không có `.env` bị theo dõi.
- Không có key/token hoặc `EXPO_PUBLIC_*KEY*` trong `app/src`, `app/app.json`, `app/eas.json`.
- Không có hàm giả hay `setTimeout` giả kết quả AI trong luồng quét (`setTimeout` chỉ dùng cho abort timeout ở `aiClient.ts`, `groupApi.ts` và watchdog ở `selftest.tsx`).
- Không có tên nhóm viết tay hay từ cấm (`hữu cơ`, `vô cơ`, `4 thùng`, `100%`) trong chữ hiển thị; `app/src/assets/qd87.json` trùng khớp 100% với `rules/qd87.json`.
- Mọi request (`aiClient.ts` 20s, `groupApi.ts` 8s, `waste_classifier.py` + `app_llm.py` `TIMEOUT_S=20`) đều có timeout và nhánh lỗi hiển thị cho người dùng.
- `store.ts` lưu bền vững bằng `AsyncStorage` với khóa tuần tự `withLock`; `app_llm.py` và `groups.py` không lưu ảnh xuống đĩa và băm SHA-256 `X-Device-Id` (`[:12]`) trước khi ghi log/lưu.
- Hợp đồng ghép nối ở `ANTIGRAVITY-PROMPTS.md` mục 1 (`rules.ts`, `scanQueue.ts`, `store.ts`, `gained`, `groupApi.ts`, router nhóm trong `app_llm.py`, công tắc `Dữ liệu mẫu`) đều giữ nguyên.

---

# Test Report — Lần 2 (FIX-08 / WP-11)

## 1. `cd ml && python -X utf8 -m pytest -q --basetemp=.cache/pt`
```text
........................................................................ [ 45%]
........................................................................ [ 91%]
.............                                                            [100%]
157 passed, 4 skipped in 28.41s
```

## 2. `python -X utf8 ml/scripts/check_rules.py rules/qd87.json`
```text
RESULT: PASS
```

## 3. `python -X utf8 ml/scripts/check_rules.py rules/qd87.json --scan-src app/src`
```text
RESULT: PASS
```

## 4. `cd app && npx tsc --noEmit`
```text
(exit code 0, không có lỗi)
```

## 5. `cd app && npx jest --ci`
```text
PASS src/components/stats/__tests__/groupApi.test.ts
PASS src/lib/__tests__/aiClient.test.ts
PASS src/lib/__tests__/rules.test.ts
PASS src/lib/__tests__/store.test.ts
PASS src/lib/__tests__/tree.test.ts
PASS src/components/review/__tests__/saveLock.test.ts
PASS src/lib/__tests__/progress.test.ts

Test Suites: 7 passed, 7 total
Tests:       53 passed, 53 total
Snapshots:   0 total
Time:        2.14 s
Ran all test suites.
```

## 6. `cd app && npm run smoke`
```text
> ecohanoi@1.0.0 smoke
> node scripts/smoke-test.mjs

PASS file src/app/(tabs)/index.tsx
PASS file src/app/(tabs)/scan.tsx
PASS file src/app/(tabs)/stats.tsx
PASS file src/app/review.tsx
PASS file src/app/selftest.tsx
PASS file src/lib/rules.ts
PASS file assets/selftest.jpg
PASS app.json scheme === 'ecohanoi' (got "ecohanoi")
PASS app.json android.package === 'com.fivess.ecohanoi' (got "com.fivess.ecohanoi")
PASS no API key in src/
PASS rules copy matches source
SKIP POST /classify (SMOKE_API_URL not set; local checks only)
RESULT: PASS LOCAL-ONLY (AI NOT VERIFIED)
```

## 7. Rà bảo mật & FIX-01..FIX-07
- `git ls-files` lọc `env`: chỉ có `app/.env.example`, không có `.env`.
- Quét `app/` (trừ `node_modules`): không có key `sk-` hay biến `EXPO_PUBLIC_*KEY*` (chỉ có chuỗi regex kiểm tra trong `app/scripts/smoke-test.mjs:77`).
- FIX-01..FIX-07 đã kiểm chứng đạt trong mã nguồn (`review.tsx`, `requirements-llm.txt`, `render.yaml`, `groups.py`, `app_llm.py`, `aiClient.ts`, `groupApi.ts`, `TeamCard.tsx`, `selftest.tsx`).
