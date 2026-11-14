# UI Audit — TEAM-5SS-latest (46754a5)
## Bước 0
- `npm ci`: `NPM_CI_EXIT=0` | `npx tsc --noEmit`: `TSC_EXIT=0`
- `npx jest --ci`: `Test Suites: 8 passed, 8 total` | `Tests: 59 passed, 59 total` | `JEST_EXIT=0`
- `npm run smoke`: `RESULT: PASS LOCAL-ONLY (AI NOT VERIFIED)` | `SMOKE_EXIT=0`
- `pytest`: `157 passed, 4 skipped in 35.34s` | `check_rules.py --scan-src app/src`: `RESULT: PASS`
## CHẶN
- `app/package.json:26`: Đã thêm thư viện native mới `react-native-svg@15.16.0` so với `183b319` nên không cài đè lên APK cũ được. Cách sửa: Build lại APK mới hoàn toàn bằng `eas build` sau khi có URL backend thật.
- `app/eas.json:12`: `EXPO_PUBLIC_API_URL` (cùng `app/.env.example:1`) vẫn là URL mẫu `https://TEN-BACKEND.onrender.com`. Cách sửa: Deploy Render xong thì điền URL thật vào `app/eas.json` (tuyệt đối không bịa URL).
- `evidence/native-ui/browser-tests.txt:1-12`: Ảnh chụp và log hiện tại chỉ chạy trên trình duyệt (0 điểm tiêu chí 1), chưa có bằng chứng trên điện thoại thật. Cách sửa: Build APK mới và chạy `demo_check.py --repeat 3` trên 2 điện thoại thật.
## NÊN SỬA
- `app/src/app/(tabs)/_layout.tsx:14,20`: Nút Quét giữa `76dp` hơi tràn ô `72dp` trên màn `360dp` và nhãn tab thiếu `numberOfLines={1}`. Cách sửa: Thu `scanIcon` về `68–70dp` và thêm `numberOfLines={1}` cho `Text` nhãn tab.
- `app/src/app/(tabs)/guide.tsx:4`: File này (cùng `presentation.ts:1` và `RuleSheet.tsx:7`) import trực tiếp `@/assets/qd87.json` thay vì qua `rules.ts`. Cách sửa: Export `getHardItems()` và `getReviewStatus()` từ `app/src/lib/rules.ts`.
- `ml/tests/test_deploy_bundle.py:35-40`: Mới kiểm tra `ml/deploy/render.yaml` mẫu của kit, chưa kiểm `render.yaml` ở gốc repo. Cách sửa: Thêm test kiểm `render.yaml` gốc với `rules/qd87.json` và `OPENAI_API_KEY` `sync: false`.
## BỎ QUA ĐƯỢC
- `app/src/app/(tabs)/garden.tsx:29`: Một số mã màu `#` viết cục bộ cho badge, hộp cảnh báo (`guide.tsx:24`, `RuleSheet.tsx:22`) và nét SVG (`TreeIllustration.tsx:7-16`), không phải màu nhóm rác. Cách sửa: Giữ nguyên hoặc gom vào `app/src/lib/theme.ts`.
- `app/app.json:13-22`: Không khai báo tường minh mảng `android.permissions`, dựa vào plugin `expo-camera` (`recordAudioAndroid: false`). Cách sửa: Giữ nguyên hoặc thêm `permissions: ["android.permission.CAMERA"]`.
CHƯA SẴN SÀNG: 3
