# EcoHanoi — rà soát backend trước deploy (14/11/2026)

Phạm vi: kit v11, profile `mobile-ai`; đọc `AGENTS.md`, `PLAN.md`, vai `ml_engineer` và bảng chủ file. Kiểm tra local FastAPI, bộ phân loại, nhóm, timeout, giới hạn đồng thời và hợp đồng kết quả. Không gọi nhà cung cấp thật, không deploy, không commit/push.

## Lỗi đã tái hiện và sửa

| Mức | Lỗi trước sửa | Thay đổi | Bằng chứng |
|---|---|---|---|
| HIGH | `/classify` chỉ đổi tên khóa; hệ thống trả `{}` hoặc trường sai kiểu vẫn được gắn `source: ai` và tăng thống kê AI. `confidence: Infinity` gây HTTP 500 khi serialize sau khi đã tăng thống kê. | `ml/serve/app_llm.py:199`: kiểm đủ trường, kiểu text/boolean và confidence hữu hạn trong [0,1] trước khi gắn nhãn thành công. Sai dạng trả `fallback`, `items: []`, `error: bad_output`. | 8 trường hợp regression `tests/test_waste_api.py:154`; tất cả FAIL trước sửa, PASS sau sửa. |
| MEDIUM | Bộ hậu kiểm nhận `Infinity` hoặc chuỗi `Infinity` rồi ép thành confidence 1.0, giữ nhóm như thể rất chắc chắn. | `ml/examples/waste_classifier.py:143`: giá trị không hữu hạn thành 0.0, nhóm `unknown`. | 4 ca regression `tests/test_waste_classifier.py:133`; 2 FAIL và 2 PASS trước sửa, tất cả PASS sau sửa. |

`items: []` hợp lệ vẫn có thể là `source: ai` khi model thực sự không thấy rác; không biến trường hợp này thành nhãn giả.

## Lệnh và kết quả thực chạy

Đứng tại `TEAM-5SS/ml`:

```text
python -X utf8 -m pytest -q --basetemp=.cache/pt-backend
143 passed, 4 skipped, 1 warning in 41.59s
```

Warning baseline chỉ là quyền ghi `.pytest_cache`; các test vẫn chạy. Lần sau tắt plugin cache, không dùng cache để thay thế chạy test.

```text
python -X utf8 -m pytest -q --basetemp=.cache/pt-backend-red tests/test_waste_classifier.py tests/test_waste_api.py -k 'non_finite or invalid_system_item'
10 failed, 2 passed, 26 deselected, 2 warnings in 1.20s

python -X utf8 -m pytest -q --basetemp=.cache/pt-backend-green tests/test_waste_classifier.py tests/test_waste_api.py tests/test_groups.py -p no:cacheprovider
51 passed in 1.51s

python -X utf8 -m pytest -q --basetemp=.cache/pt-backend-final -p no:cacheprovider -rs
155 passed, 4 skipped in 35.55s
```

4 file bị skip do thiếu thư viện: `test_biosignal.py`, `test_metrics.py`, `test_tabular.py` thiếu `sklearn`; `test_serve.py` thiếu `onnx`. Đây là các đường kit training/ONNX, không phải backend LLM đang dùng. Không gọi chúng là đã kiểm chứng.

Các test đã chạy bao phủ: camelCase; prompt lấy từ luật; nhóm lạ/độ tin cậy thấp; JSON lỗi; fallback không giả AI; giới hạn ảnh; mode không hợp lệ; timeout truyền xuống client; request quá tải trả 503 ngay; chỗ đang chạy giữ tới khi tác vụ thực sự kết thúc; phục hồi sau timeout; thống kê chỉ đếm theo nguồn trả về; id máy được băm; chuẩn hóa mã nhóm; cap XP, rank và cộng điểm đồng thời.

## Giới hạn và việc phải hoàn thành trước demo thật

- Kết quả test dùng mock provider hoặc hệ thống giả của kit. **NOT VERIFIED:** tài khoản/key/model thật, độ chính xác trên ảnh tự chụp, latency thật, cold start Render, APK/điện thoại thật và 4G.
- Đường deploy đang hỗ trợ trong cấu hình gốc là root `render.yaml` và nhóm RAM. Stats và nhóm RAM mất khi restart; lưu ảnh `/stats`/log trước khi restart hoặc redeploy.
- Nhánh Postgres chỉ có test giả. Trong lúc rà soát, một phiên khác đã thêm `psycopg[binary]>=3.1` vào `requirements-llm.txt`; nhận định thiếu khai báo dependency trước đó đã được giải quyết. Việc cài driver, migration, kết nối và giữ dữ liệu qua restart trên Postgres thật vẫn **NOT VERIFIED**. Cấu hình Render gốc chưa bật `DATABASE_URL`.
- `POST /groups/score` nhận XP do client báo; `X-Device-Id` cũng do client gửi. Điểm nhóm và số thiết bị không phải số người dùng được xác thực; public endpoint chưa có cơ chế chống spam/throttle theo người dùng. Không dùng chúng làm chứng cứ chống gian lận hoặc số người dùng đã xác minh.
- `/predict` generic smoke với chữ không chứng minh `/classify` nhận ảnh thật thành công. Cần smoke đúng endpoint ảnh, rồi `demo_check.py --repeat 3` trên hai máy như plan.

Kết luận: các đường backend LLM local đã PASS sau sửa; **chưa đủ bằng chứng GO deploy/demo** cho hệ thống thật.

## Rà soát thay đổi đồng thời sau vòng kiểm thử trên

Đọc diff mới của `ml/requirements-llm.txt`, `ml/serve/groups.py`, `ml/tests/test_groups.py` và `render.yaml`; không sửa code của phiên khác.

- Dependency Postgres đã được khai báo như trên. Test RAM capacity mới kiểm đúng việc nhóm cũ vẫn cộng điểm khi đầy và nhóm mới nhận 503; kết quả full suite sau các thay đổi này do Điều phối chạy lại, không dùng con số 155 ở trên để đại diện snapshot mới.
- **MEDIUM, nhánh Postgres:** `serve/groups.py:164` kiểm tồn tại rồi `COUNT(*)` trước `INSERT`, không khóa tài nguyên chung giữa các transaction. Hai mã nhóm mới có thể cùng đọc số nhóm nhỏ hơn cap rồi cùng được thêm. Test Postgres hiện mới kiểm tuần tự; không chứng minh hard cap khi đồng thời.
- Mô phỏng read committed bằng fake connection và barrier trong process đã chạy cả hai request với `MAX_GROUPS=1`, đầu ra nguyên văn: `SIMULATED_PG_CONCURRENCY max_groups=1 final_count=2 accepted=2`. Đây là bằng chứng tái hiện interleaving ở code, **không phải test PostgreSQL thật**. Cần khóa chung ở DB hoặc cơ chế serializable và xử lý tranh chấp trước khi claim giới hạn PG là atomic. Không ảnh hưởng nhánh RAM hiện tại vì RAM giữ `_lock` xuyên suốt kiểm và thêm nhóm.
- `render.yaml` thêm `OPENAI_REASONING_EFFORT` dạng `sync: false`; adapter chỉ gửi `reasoning` khi giá trị không rỗng. Model/effort có tương thích và có đủ output tokens trên provider thật vẫn **NOT VERIFIED**.
