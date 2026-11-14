# EcoHanoi — Rà soát UI/UX trước deploy

Ngày: 14/11/2026. Vai: fullstack_dev, hackathon kit v11, profile mobile-ai. Phạm vi: các màn hình và component mobile hiện có; giữ luồng quét → xem lại → lưu → nuôi cây, không thêm thư viện native.

## Đã sửa

| Vấn đề | Thay đổi |
|---|---|
| Mở Xem lại khi còn ảnh pending khiến snapshot thiếu ảnh; clear toàn phiên còn xóa cả ảnh lỗi cần retry | Scan khóa Xem lại khi còn pending và hiện trạng thái chờ; Review chặn lưu snapshot có pending; sau lưu chỉ `remove(entry.id)` các entry đã review, giữ ảnh lỗi khác. |
| Chụp trước khi camera sẵn sàng, không có thông báo lỗi mount | Khóa shutter đến `onCameraReady`; lỗi camera có hướng dẫn thử lại; status bar sáng trên camera. |
| Primary trắng chỉ đạt 4.38:1, nhóm Thực phẩm và Còn lại khó đọc | Primary dùng `#166B3B`; warning dùng `#945000`; `textOn` chọn màu chữ bằng tương phản luminance thực, giữ nguyên màu nhóm trong file luật. |
| Nút retry/bỏ ảnh/đóng/chế độ quá nhỏ | Các nút này có kích thước tối thiểu 48dp; thẻ scan rộng 180dp; nhãn lỗi và nhóm không bị cắt một dòng. |
| Sheet chọn nhóm không cuộn và không chừa safe area | Sheet cuộn, chừa inset trên/dưới; tên nhóm đầy đủ; có nút đóng 48dp, Android Back qua `onRequestClose`, backdrop đóng; thêm semantic modal. |
| Hai cột Review khó đọc ở màn nhỏ hoặc font lớn | Chuyển một cột khi width <360 hoặc fontScale >1.25; nhãn nhóm xuống dòng. |
| Lỗi đọc tiến độ/lịch sử hiển thị giống dữ liệu rỗng | Cây/Thống kê có loading, thông báo lỗi và nút tải lại; không hiện số 0 giả khi đọc storage thất bại. |
| TeamCard có unhandled storage rejection, Đổi mã vẫn xóa UI nếu storage lỗi | Bắt lỗi đọc/lưu mã, thông báo tách biệt lỗi định dạng; chỉ đổi UI sau khi ghi storage thành công, có trạng thái đang lưu. |
| Nhãn XP khi nhận diện trông như đã cộng điểm | Đổi thành “Lưu để nhận +… XP”; chỉ lưu mới cộng điểm. |
| Nội dung quyền camera khẳng định quá mức về lưu trữ | Giải thích đúng bước gửi ảnh để gợi ý, xem lại và sửa trước lưu; màn quyền cuộn và chừa safe area. |

## Kiểm chứng đã thực hiện

- `cd app; npm.cmd run typecheck`: PASS, `tsc --noEmit` exit 0 sau các sửa UI.
- Chạy trực tiếp hàm `textOn` bằng TypeScript transpile + Node VM; tính đối chứng bằng công thức relative luminance độc lập trên mã màu đọc từ JSON luật:

| Nền | Chữ | Contrast |
|---|---|---|
| Tái chế `#1E6FD9` | `#FFFFFF` | 4.85:1 |
| Thực phẩm `#2E9E4F` | `#14261A` | 4.63:1 |
| Còn lại `#7A7F87` | `#000000` | 5.21:1 |
| Primary `#166B3B` | `#FFFFFF` | 6.56:1 |
| Warning `#945000` | `#FFFFFF` | 6.16:1 |

- `git diff --check`: exit 0; Git cảnh báo chuyển LF/CRLF ở một số file, không có lỗi whitespace.
- Đọc lại code review/pending, camera, sheet, storage error và các kích thước nút. Đây là kiểm tra source và tính toán màu, không phải tương tác trên điện thoại.

## Chưa kiểm chứng

- Chưa render bản APK hoặc chụp màn hình runtime trong lượt này; chưa có `adb` khả dụng trong PATH sandbox.
- Chưa xác nhận touch ở mép nút, TalkBack/focus modal, zoom font hệ thống, màn nhỏ/landscape, từ chối camera, mất mạng hoặc cold-start trên thiết bị thật.
- Các semantic và kích thước source không đủ để claim WCAG đầy đủ hoặc device readiness. Cần `demo_check.py --repeat 3` trên 2 máy và checklist QA của profile mobile-ai trước kết luận demo GO.
- Có thay đổi đồng thời từ phiên khác tại `review.tsx`/saveLock trong lúc kiểm tra; điều phối cần chạy lại typecheck/test/export trên snapshot cuối.
