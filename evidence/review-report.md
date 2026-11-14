# Rà soát bảo mật & logic (server-voice & rewards)
## Chặn
- Không có lỗi mức Chặn.
## Nên sửa
- `ml/serve/rewards.py:228-232`: `observe` vẫn thêm hash vào `seen` dù `observed >= MAX_ITEMS_PER_DAY`, gây phình JSONB/RAM nếu gửi nhiều ảnh lạ; thêm `if st["observed"] >= MAX_ITEMS_PER_DAY: return None` trước khi thêm `seen`.
- `ml/serve/rewards.py:127`: `_run_pg` mở kết nối Postgres mới mỗi request, dễ chạm giới hạn kết nối và chậm khi tải cao; dùng `psycopg_pool.ConnectionPool` dùng chung.
- `app/src/lib/voice.ts:91-98,131`: `playAi` gọi `fetch(uri)` kiểm tra rồi bỏ body và gọi `createAudioPlayer({ uri })` tải lại lần 2, tốn 2 lượt request/rate-limit và để stream treo; tải về file tạm bằng `expo-file-system` hoặc bỏ bước `fetch` thừa.
- `app/src/lib/voice.ts:91-99,128`: `cancelCurrent` chưa gán khi `fetch` đang chạy nên `stopSpeaking()` không hủy được câu sắp phát nếu `enabled` vẫn `true`; lưu `ctrl.abort` vào `cancelCurrent` trước `fetch`.
## Bỏ qua được
- `ml/serve/speak.py:101-120`: Hai request đồng thời cùng câu chưa cache đều gọi `_synthesize` trả phí 2 lần; chấp nhận được ở quy mô demo, sau có thể khóa theo `key`.
- `app/src/lib/voice.ts:43-55`: `loadVoicePref` đọc AsyncStorage bất đồng bộ có thể ghi đè `setVoiceOn(true)` nếu người dùng bấm rất sớm; rủi ro thấp.
- `app/src/lib/rewardsApi.ts:7-12,77`: Hàm `baseUrl()` lặp lại từ `voice.ts` và `deviceId` (UUID ngẫu nhiên, không PII) đi qua query string; có thể gom helper chung sau.
