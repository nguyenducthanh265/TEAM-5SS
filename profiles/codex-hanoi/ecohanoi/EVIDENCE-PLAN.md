# Kế hoạch lấy điểm mục 2 (35) và mục 3 (25)

Giám khảo chấm **bằng chứng**. Mỗi câu nói trong pitch phải trỏ được tới một dòng trong `../evidence-log.csv`
(ngày, nguồn, con số hoặc trích nguyên văn). Không có dòng → không nói câu đó.

## Mục 2 — vấn đề thật (35 điểm): cần 4 loại bằng chứng
| # | Bằng chứng | Cách lấy | Khi nào | Câu dùng trong pitch |
|---|---|---|---|---|
| A1 | Luật có thật, đang áp dụng | Link văn bản QĐ 87 + 2 bài báo (đã có trong tài liệu ý tưởng). Chụp màn hình trang đầu văn bản. | Tối 13/11 | "Từ 8/1 năm nay, Hà Nội bắt buộc…" |
| A2 | Người dân phân loại sai | **Bài test 10 món** trong Google Form (`GOOGLE-FORM.md`). Con số chính: điểm trung bình x/10, % người sai ≥ 4 món, món bị sai nhiều nhất. | Gửi tối 13/11, chốt số 10:30 và 14:30 ngày 14/11 | "[n] người làm bài test, trung bình đúng [x]/10. Món sai nhiều nhất là [món]: [y]% bỏ sai." |
| A3 | Tiếng nói người thật | 3 cuộc hỏi 5 phút (bạn cùng phòng, cô/chú thu gom rác hoặc bảo vệ tòa nhà, 1 người trong gia đình). Hỏi: "Lần gần nhất anh/chị phân vân một món rác là món gì? Rồi anh/chị làm gì?" Ghi **nguyên văn** 1 câu, xin phép dùng tên gọi (hoặc "một bạn sinh viên năm 2"). | Tối 13/11 hoặc sáng 14/11 | Một câu trích trong phần mở đầu |
| A4 | Ảnh hiện trường | Tự chụp điểm tập kết rác ở KTX/khu trọ của mình: các túi lẫn lộn. Không lấy ảnh mạng. | Tối 13/11 / sáng 14/11 | Slide 1 |

Lưu ý trung thực: người trả lời Form phần lớn là sinh viên quen biết → nói rõ "khảo sát [n] sinh viên", không nói "người dân Hà Nội".

## Mục 3 — người dùng đầu tiên và mở rộng (25 điểm)
| # | Bằng chứng | Cách lấy | Khi nào |
|---|---|---|---|
| B1 | **Người dùng thật dùng APK trong ngày** | 14:00–15:15 và giờ nghỉ 15:00: mời người tham dự/khách ở quán quét 3 món trên máy nhóm, hoặc tự cài qua mã QR. Mục tiêu 10–20 người. Hỏi 1 câu sau khi thử: "Có món nào kết quả làm bạn bất ngờ không?" | Ngày thi |
| B2 | Số liệu từ hệ thống | `GET /stats`: `devices_ai` (số máy), `ai_requests` (lượt quét). Chụp màn hình có giờ. Từ app: tỉ lệ món người dùng phải sửa nhãn. | 15:15 và ngay trước pitch |
| B3 | Kênh 100 người dùng đầu tiên — **có tên, có người gật đầu** | Nhắn 1 người phụ trách thật (Bí thư Liên chi, trưởng nhà KTX, trưởng nhóm lớp, quản lý khu trọ): "Tuần sau bọn em muốn chạy thử 'Phòng xanh' 7 ngày ở [nơi], anh/chị cho phép được không?" Chụp tin nhắn đồng ý. Ghi số thành viên của nhóm/kênh đó. | Tối 13/11 – sáng 14/11 |
| B4 | Người chờ dùng | Câu cuối Form: số người chọn "Có" cài bản thử + số người để lại liên hệ. | Chốt 14:30 |
| B5 | Mở rộng bằng cấu hình | Cho thấy file `rules/qd87.json`: "thêm thành phố = thêm một file". Nêu lộ trình: KTX → phường ở Hà Nội → TP HCM (dự kiến bắt buộc phân loại từ 2027) → thành phố khác có luật phân loại. Chỉ demo đổi thành phố nếu đã có file luật thứ hai **đúng văn bản thật**; không thì chỉ nói. | Slide 3 |
| B6 | Ai trả tiền | 1 câu: ban quản lý KTX/chung cư và phường cần công cụ tuyên truyền và con số tỉ lệ phân loại đúng. Nếu B3 có người hỏi lại "bao giờ dùng được" → trích câu đó. | Slide 3 |

## Kịch bản mời người dùng thử (B1) — 60 giây mỗi người
1. "Bạn cho mình xin 1 phút thử app phân loại rác theo luật mới của Hà Nội nhé. Bạn nghĩ hộp sữa này bỏ vào nhóm nào?" (để họ đoán trước)
2. Đưa máy, để **họ tự cầm món** lướt qua camera. Không cầm hộ.
3. Hỏi: "Có khác bạn đoán không?" → ghi câu trả lời nguyên văn nếu hay.
4. "Bạn muốn cài thử thì quét mã này." (mã QR link APK)
5. Ghi một dòng vào `evidence-log.csv`: giờ, "dùng thử tại sự kiện", đoán đúng/sai, câu trích.

Con số rất đắt cho pitch: "**[k]/[n] người đoán sai trước khi quét**" — vừa là bằng chứng vấn đề, vừa là bằng chứng có người dùng.

## Sau mỗi mốc, ghi vào `evidence-log.csv`
| Mốc | Dòng cần có |
|---|---|
| Tối 13/11 | link QĐ 87, 2 bài báo, tin nhắn đồng ý B3, số thành viên kênh |
| 10:30 14/11 | số câu trả lời Form, điểm trung bình bài test, món sai nhiều nhất |
| 14:15 | độ chính xác AI trên ảnh thật (WP-02) |
| 15:15 | `/stats`, số người dùng thử, số người đoán sai trước khi quét, tỉ lệ phải sửa nhãn |

## Không làm
- Không làm tròn đẹp, không nói "hàng triệu", "đa số" khi chưa có số.
- Không dựng số người dùng bằng cách tự bấm nhiều lần trên máy nhóm: `/stats` đếm theo máy, và giám khảo có thể hỏi.
- Không ghi âm/chụp mặt người thử khi chưa xin phép.
