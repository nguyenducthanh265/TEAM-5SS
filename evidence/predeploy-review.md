# EcoHanoi — kết quả rà soát trước deploy

Ngày 14/11/2026, múi giờ Asia/Saigon. Kiểm theo `PLAN.md`, `MASTERPLAN.md` và hackathon-kit v11, profile `mobile-ai`.

**Kết luận: PASS các kiểm tra local dưới đây; NO-GO cho phát hành APK/demo thật.** Người dùng xác nhận chưa có URL Render. Chưa có bằng chứng provider thật hoặc hai điện thoại. Không push, deploy, gọi provider hay tạo bản APK trong phiên này.

## Phạm vi và phân công

Ba sub-agent chạy độc lập: AI engineer kiểm backend; code/security reviewer kiểm mobile và cấu hình; fullstack developer sửa UI/UX. Điều phối ghép nối, sửa storage/client và cổng build/smoke, chạy lại kiểm thử. Báo cáo chi tiết:

- `backend-audit.md`: backend, hợp đồng kết quả, timeout/503 và giới hạn Postgres.
- `mobile-audit.md`: lỗi mobile tái hiện, kiểm bảo mật, kết quả QA sau sửa.
- `ui-ux-audit.md`: UI đã sửa, phép tính tương phản và các thao tác thiết bị còn chưa kiểm.

Workspace có sửa đổi đồng thời từ phiên khác, gồm nhóm/Postgres, saveLock và API nhóm. Đã giữ và review bản ghép. `source-manifest.json` ghi SHA-256 của 82 file source/config/test liên quan; so sánh trước/sau lượt kiểm thử và sau Android export không thấy thay đổi. Đây là snapshot local, chưa phải commit/release được ký.

## Các lỗi đã xử lý và kiểm lại

| Vấn đề | Trạng thái bản cuối |
|---|---|
| Lỗi đọc AsyncStorage bị coi là dữ liệu rỗng, lần lưu sau ghi đè lịch sử/XP | Truyền lỗi lên UI và dừng ghi; test bảo toàn dữ liệu cũ, retry thành công. |
| Mở Review lúc ảnh còn pending rồi lưu làm mất ảnh | Scan khóa Review khi pending; route Review cũng chặn lưu snapshot thiếu; chỉ xóa các entry đã review sau lưu, giữ ảnh lỗi để retry. |
| Bấm lưu đôi có thể cộng điểm hai lần | Khóa ref đồng bộ; test hai lệnh đồng thời chỉ chạy lưu một lần và lỗi thì nhả khóa. |
| Client nhận `source: ai` kèm `error` hoặc danh sách item hỏng một phần | Từ chối; không chuyển thành kết quả AI thành công. |
| Confidence không hữu hạn hoặc dưới 0.5 vẫn giữ nhóm chắc chắn | Backend loại giá trị không hữu hạn; client hạ confidence không an toàn/nhóm không hợp lệ về unknown. |
| Backend nhận item sai schema rồi báo AI thành công, Infinity gây lỗi JSON sau khi tăng stats | Kiểm schema trước source/counters; có test hồi quy. |
| Smoke báo PASS dù không gọi HTTP; mẫu URL có thể bị đóng vào APK | Smoke local ghi rõ LOCAL-ONLY; `npm.cmd run predeploy` bắt buộc API; EAS pre-install từ chối URL rỗng/mẫu/local. |
| Nhóm chưa có dữ liệu bị lẫn với lỗi mạng; storage promise không được catch | API nhóm phân biệt 404/lỗi; giữ wrapper cũ; UI có thông báo lỗi và chỉ đổi mã sau khi lưu thành công. |

Những phép thử dùng mock SDK/fetch/fixture chỉ chứng minh xử lý hợp đồng và lỗi local; không được tính thành lượt gọi AI hoặc người dùng thật.

## Kết quả điều phối chạy lại trên bản cuối

| Lệnh | Kết quả |
|---|---|
| Trong `ml/`: `python -X utf8 -m pytest -q --basetemp=.cache/pt-root-final -p no:cacheprovider -rs` | **157 passed, 4 skipped in 28.64s**, exit 0 |
| Trong `app/`: `npm.cmd run typecheck` | **PASS**, exit 0 |
| `npm.cmd test -- --runInBand` | **7 suites, 53 tests passed**, exit 0 |
| `npm.cmd run test:checks` | **10 passed, 0 failed**, exit 0; HTTP server là fixture local |
| `python -X utf8 ml/scripts/check_rules.py rules/qd87.json --scan-src app/src` | **RESULT: PASS**, exit 0 |
| `npm.cmd run smoke` | **RESULT: PASS LOCAL-ONLY (AI NOT VERIFIED)**; HTTP SKIP |
| `npm.cmd run predeploy` khi chưa có URL | **Exit 1 đúng thiết kế**: `RESULT: FAIL POST /classify required: SMOKE_API_URL not set` |
| `node scripts/check-build-env.mjs` khi chưa có URL | **Exit 1 đúng thiết kế**; không cho build dùng URL trống |
| `EXPO_OFFLINE=1`, `node node_modules/expo/bin/cli export --platform android --output-dir ../.cache/root-android-final` | **PASS**, exit 0; 1.750 modules, 46 assets, HBC khoảng 4.4 MB |
| `git diff --check` | Exit 0; chỉ cảnh báo LF/CRLF |
| Review secret source/config | Không phát hiện secret thực trong phạm vi đã quét; không thay thế kiểm lịch sử repo/tài khoản |

Bốn skip: `test_biosignal.py`, `test_metrics.py`, `test_tabular.py` thiếu `sklearn`; `test_serve.py` thiếu `onnx`. Không gọi các đường training/ONNX này là đã kiểm thử.

Artifact Android local: `.cache/root-android-final/_expo/static/js/android/entry-e03929b9fe31a76b6ecfd0b2605294c4.hbc`.

SHA-256: `614CD5DF96BAD91E017786D13A626D0B6D43E5432947B8C311399D21F9703A7F`.

Artifact này **chưa phải APK**, chưa chạy Gradle/signing và chưa mở trên điện thoại. HBC của lượt export khác có thể khác; không dùng hash artifact khác thay cho lượt điều phối này.

## UI/UX đã sửa trong source

- Vùng chạm chính tối thiểu 48dp, nhãn lỗi và nhóm có thể xuống dòng.
- Sheet chọn nhóm cuộn, có safe area, nút đóng và Android Back; Review chuyển một cột khi màn nhỏ/font lớn.
- Camera có trạng thái sẵn sàng/lỗi; không chụp trước khi sẵn sàng.
- Cây/Thống kê có loading/lỗi/tải lại; lỗi đọc storage không hiển thị số 0 như dữ liệu thật.
- Tương phản chữ nhóm theo phép tính luminance: 4.85 / 4.63 / 5.21:1; primary 6.56:1. Màu nhóm vẫn từ file luật.

Chưa render/kiểm tương tác APK: touch ở mép nút, layout runtime, TalkBack, font hệ thống, cấp/từ chối camera và persistence native vẫn **NOT VERIFIED**. Không tuyên bố đã đạt WCAG đầy đủ.

## Điểm chặn và giới hạn còn lại

1. **URL/backend thật:** `app/eas.json` còn URL mẫu. `OPENAI_API_KEY`, `OPENAI_MODEL`, `EXPO_PUBLIC_API_URL` chưa có trong môi trường kiểm tra này. Cần deploy backend theo root `render.yaml`, smoke ảnh qua `/classify`, sau đó build cùng URL. Không đưa key vào app/git.
2. **APK/hai điện thoại:** chưa có `adb` trong PATH của phiên kiểm tra; chưa EAS build/signing, force-stop/mở lại, ba lượt AI qua 4G, cold start, mất mạng, 503/fallback hay từ chối camera trên máy thật.
3. **Luật và bằng chứng:** `review_status` còn chờ hai người soát; chưa đo trên 30–50 ảnh thật, chưa xác nhận bằng chứng người dùng và tổng duyệt pitch. Ảnh selftest là chai nhựa minh họa, không phải tập đánh giá độ chính xác.
4. **Docker mẫu:** `ml/Dockerfile` chưa mang theo luật EcoHanoi. `ml/deploy/render.yaml` là mẫu kit. Đường được chuẩn bị cho dự án là **`render.yaml` tại gốc repo**; chưa xác nhận Docker image hoạt động.
5. **Postgres, MEDIUM:** kiểm capacity mới có race giữa COUNT và INSERT cho hai transaction khác mã nhóm. Tái hiện interleaving bằng fake connection, chưa kiểm DB thật. Không bật/claim hard cap Postgres trước khi sửa và kiểm đồng thời. Nhánh RAM mặc định có khóa chung; nhóm/stats RAM mất khi restart. Dependency psycopg đã khai báo, nhưng cài driver/kết nối/migration thật chưa xác minh.
6. **Thống kê:** XP nhóm và device id do client báo; không phải người dùng được xác thực hoặc số liệu chống gian lận.

Các bước tiếp theo và lệnh chạy nằm trong `deploy-checklist.md`. Sau khi có URL thật, phải chạy lại gate API và gate thiết bị; kết quả local này không tự chuyển thành GO.
