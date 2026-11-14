# EcoHanoi — TEAM-5SS

App Expo/React Native đã ghép giao diện rêu/chanh/trắng ngà với backend FastAPI và kho dữ liệu gốc.

## Chạy local

Terminal 1, tại gốc repo:

```powershell
$env:SYSTEM='examples.waste_classifier:run'
cd ml
python -m uvicorn serve.app_llm:app --host 127.0.0.1 --port 8001
```

Terminal 2, tại gốc repo:

```powershell
cd app
npm ci
cd ..
powershell -ExecutionPolicy Bypass -File scripts/start-ui.ps1
```

Mở web Expo ở port 8081 để duyệt component thật. Script nhận `-ApiUrl` và `-Port`; thêm `-Native` để mở Metro cho thiết bị/Expo Go. Trong workspace hiện tại script nhận Node portable của thư mục cha, không cần cài Node toàn hệ thống. Chạy trên máy khác cần Node LTS.

Điện thoại không dùng `127.0.0.1` của máy tính: dùng URL backend hoặc IP LAN phù hợp, cấu hình server lắng nghe LAN khi cần. Bản demo cuối phải là APK độc lập trên thiết bị thật; export Android/web không thay thế bước đó.

## Những gì đã ghép

- Home đọc tiến độ/lịch sử thật; thẻ cây nền rêu, CTA chanh, ba nhóm từ file luật.
- Bốn mục Trang chủ/Cẩm nang/Cây xanh/Thống kê và nút Quét nổi ở giữa.
- Camera, hàng chờ, retry và API `/classify` của repo; thêm khung ngắm và toolbar quay về.
- Kết quả có ảnh/lý do/mẹo; sửa nhóm bằng ba ô; unknown phải xác nhận, nguy hại giữ riêng, lưu chống lặp.
- Cây chậu SVG bốn giai đoạn theo mốc hiện có 0/50/150/400 XP.
- Cẩm nang tìm tiếng Việt có/không dấu; thống kê/lịch sử 7 ngày hoặc tất cả; nhóm cộng đồng vẫn dùng API gốc.

Không đưa dữ liệu mẫu từ prototype vào tiến độ thật. Công tắc mẫu của Thống kê chỉ xem bố cục, không cộng XP.

## Backend

Chưa có URL deploy theo xác nhận của người dùng. Local API chạy được nhưng nhận diện thật cần `OPENAI_API_KEY` và `OPENAI_MODEL` ở biến môi trường backend. Không đặt key trong `EXPO_PUBLIC_*` hoặc commit `.env`. Khi có URL, đặt `EXPO_PUBLIC_API_URL` hoặc truyền `-ApiUrl` cho script.

## Kiểm tra

```powershell
cd app
npm run typecheck
npm test -- --runInBand
npm run test:checks
node scripts/sync-rules.mjs
cd ..
python ml/scripts/check_rules.py rules/qd87.json --scan-src app/src
```

Thiết kế/kiến trúc: `docs/UI-INTEGRATION.md`. Kế hoạch: `docs/UI-PLAN.md`. Kết quả kiểm chứng mới nằm trong `evidence/ui-integration.md`; các báo cáo audit cũ là baseline trước lần ghép UI này.
