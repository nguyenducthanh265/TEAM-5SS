# Tích hợp UI EcoHanoi

Thiết kế được người dùng chọn: rêu #173D2B, chanh #D5EF77, nền #F7F8F2; thẻ cây rêu, cây chậu SVG, 4 mục điều hướng và nút Quét giữa. Repo clone baseline `183b319` đã có Expo/FastAPI nên tích hợp trực tiếp bằng React Native, không nhúng HTML/WebView.

## Kiến trúc
- Một nguồn luật `rules/qd87.json` → `app/scripts/sync-rules.mjs` → `src/assets/qd87.json`; UI không tự đặt nhóm hay màu nhóm.
- Giữ `aiClient.ts`, `scanQueue.ts`, `session.ts`, `store.ts`, `progress.ts`, selftest và FastAPI. Camera → enqueue → POST /classify → review → saveSession → tiến độ/lịch sử thật.
- `theme.ts` thêm semantic tokens; các component tái dùng trong `components/ui/`, cây trong `components/tree/`.
- Routes: index/Home, guide/Cẩm nang, scan/Quét, garden/Cây xanh, stats/Thống kê. Route review đọc cùng phiên quét của backend.
- Home/garden đọc AsyncStorage bằng focus hook, có loading/error/retry. Dữ liệu thật bắt đầu từ 0; mẫu ở stats giữ nhãn riêng và không ghi điểm.
- Giữ ngưỡng cây của repo 0/50/150/400 XP và tên giai đoạn hiện có; khác bản phác thảo 300 XP cuối để không thay quy tắc sản phẩm đã có test.
- Sheet sửa nhóm dùng 3 ô có icon/nhãn, unknown phải xác nhận trước khi lưu; nguy hại luôn để riêng. Giữ khóa chống bấm lưu lặp và xử lý lỗi lưu.
- Quét giữ camera thật, trạng thái quyền/lỗi/hàng chờ; thêm khung ngắm, toolbar/quay lại, hình thức chanh/rêu và khay sáng.
- Cẩm nang mới đọc ví dụ/mẹo/cảnh báo từ luật, tìm tiếng Việt có/không dấu và hiển thị trạng thái luật đang chờ soát.

## Kiểm tra
Chạy baseline Jest/typecheck trước; thêm test failing cho logic trình bày/tìm kiếm/sửa nhóm. Sau ghép chạy Jest, tsc, cổng rules và Android export. Web export chỉ để kiểm tra hình ảnh component thật; không thay kiểm chứng APK/AI.

## Kết nối backend
`app/.env`: `EXPO_PUBLIC_API_URL=https://<backend>`. POST `/classify` nhận `{image,mode}`, header X-Device-Id. Chỉ source ai thật mới thành công; không đưa API key vào frontend. Chưa có URL thì kiểm local/config lỗi rõ ràng; cần URL thật và điện thoại để xác nhận demo cuối.
