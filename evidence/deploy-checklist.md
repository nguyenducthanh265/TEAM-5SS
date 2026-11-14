# EcoHanoi — các bước còn lại trước bản demo thật

Ngày 14/11/2026. Chỉ chạy các bước sau khi báo cáo `predeploy-review.md` đã chốt kiểm thử local.

## 1. Backend Render

- Dùng **`render.yaml` ở gốc TEAM-5SS**, giữ build context ở gốc để có `rules/qd87.json`.
- `SYSTEM=examples.waste_classifier:run`. Nhập `OPENAI_API_KEY`, `OPENAI_MODEL` trong biến môi trường riêng của Render; không đưa key vào app hoặc git.
- Chỉ đặt `OPENAI_REASONING_EFFORT` khi model đã chọn hỗ trợ và đã gọi thử thành công.
- Lấy URL HTTPS sau khi Render chạy; kiểm `/health`, rồi kiểm ảnh qua `/classify`. `/health` hoặc `/predict` riêng lẻ không chứng minh luồng quét ảnh.
- Nhánh mặc định không có `DATABASE_URL` dùng RAM: nhóm và `/stats` mất khi server restart. Không dùng số đếm này như người dùng đã xác thực.
- `ml/Dockerfile` và `ml/deploy/render.yaml` là mẫu kit; chúng chưa đóng gói file luật EcoHanoi và chưa được nghiệm thu cho deploy sản phẩm này. Không thay thế Blueprint ở gốc bằng hai file đó.

## 2. Smoke ảnh thật trước build

Trong PowerShell tại `TEAM-5SS/app`, sau khi thay URL dưới đây bằng URL thật:

```powershell
$env:SMOKE_API_URL = 'https://URL-RENDER-THAT'
npm.cmd run predeploy
```

Phải có `RESULT: PASS source=ai`. Đây là kiểm API với ảnh chai nhựa minh họa đóng kèm, chưa phải kiểm độ chính xác trên ảnh rác thật và chưa phải kiểm điện thoại.

## 3. APK

- Thay `EXPO_PUBLIC_API_URL` trong `app/eas.json` profile preview bằng **cùng URL đã smoke thành công**. Hook EAS từ chối URL rỗng/mẫu/local; hook này chỉ kiểm cấu hình, không gọi AI.
- Đăng nhập EAS, build `eas build -p android --profile preview` từ `app/`. Đăng nhập, credentials/signing và build Android chưa được phiên local xác minh.
- Cài APK độc lập trên hai máy Android, cài platform-tools, xác nhận `adb devices`.
- Từ gốc TEAM-5SS, chạy với đường dẫn APK thật:

```powershell
python -X utf8 ml/scripts/demo_check.py --package com.fivess.ecohanoi --scheme ecohanoi --apk 'DUONG-DAN-APK-THAT.apk' --repeat 3
```

- Chỉ thay APK đã biết hoạt động sau khi bản mới PASS trên cả hai máy.
- Tự thử: 4G, force-stop rồi mở lại, chụp đồ thật, mất mạng, từ chối quyền camera, AI bận/timeout/fallback, lưu rồi mở lại vẫn còn lịch sử.
- Kiểm trực quan màn nhỏ/font lớn và chạm các nút, sheet chọn nhóm, camera. TypeScript/Android bundle không chứng minh các thao tác này.

## 4. Bằng chứng theo plan

- Hai người soát `rules/qd87.json` với PDF và tự cập nhật `review_status`; agent không thay người ký soát.
- Đo bằng 30–50 ảnh rác tự chụp có nhãn; không dùng ảnh selftest hoặc mock để tuyên bố độ chính xác.
- Ghi số thật và nguồn vào `evidence/`, cập nhật pitch/disclosure, giữ bằng chứng dùng Codex.
- Tổng duyệt hai lần theo plan. Chưa qua các mục này thì trạng thái vẫn **chưa đủ bằng chứng cho demo/nộp bài**.
