# Review Report — Lần 1 (WP-11)

## Chặn
- `app/eas.json:12` (Điều phối): Thay URL mẫu `https://TEN-BACKEND.onrender.com` bằng URL Render thật trước khi build APK #2.

## Nên sửa
- `ml/serve/groups.py:64` (AG-02): Chỉ chạy chế độ RAM cho demo hoặc nhờ Điều phối thêm `psycopg[binary]` vào `ml/requirements-llm.txt` nếu bật `DATABASE_URL`.
- `app/src/components/stats/TeamCard.tsx:39` (AG-08): Phân biệt mã nhóm chưa có dữ liệu (404) với lỗi mạng trong `groupApi.ts` để hiển thị thông báo đúng hơn.
- `rules/qd87.json:3` (Điều phối): Hai người đối chiếu PDF và cập nhật `review_status` trước khi chốt bản nộp.

## Bỏ qua được
- `app/src/app/review.tsx:124` (AG-06): Gọi `clear()` của `scanQueue.ts` thay vì `clearSession()` để dọn luôn `waiting` và `sizes`.
- `app/src/app/selftest.tsx:112` (AG-05): Bỏ `insets.top` hoặc tắt header ở `_layout.tsx:22` để tránh khoảng trống kép ở đỉnh màn hình.
- `app/src/lib/aiClient.ts:40` (AG-04): Hạ giới hạn `cut` từ `160`/`120` về `120`/`80` cho khớp `contracts.ts:12-13`.
