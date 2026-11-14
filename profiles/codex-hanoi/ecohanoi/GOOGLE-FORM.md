# Thiết kế Google Form: "Bạn phân loại rác đúng đến đâu?"

Mục tiêu của form không phải hỏi ý kiến, mà là **đo**: người ta làm bài test và sai bao nhiêu. Đó là bằng chứng cho mục 2.
Ý kiến ("bạn có thấy khó không?") chỉ là phụ.

## Cài đặt form
| Cài đặt | Chọn | Vì sao |
|---|---|---|
| Biến thành bài kiểm tra (Cài đặt > Bài kiểm tra) | Bật; công bố điểm **ngay sau khi nộp**; cho xem câu sai + đáp án đúng | Người làm thấy điểm → tò mò → chia sẻ; nhóm có sẵn điểm trung bình và tỉ lệ sai từng câu |
| Thu thập email | Tắt | Ẩn danh, nhiều người trả lời hơn |
| Giới hạn 1 lần trả lời | Tắt (bật thì bắt đăng nhập Google) | |
| Xáo thứ tự câu hỏi | Bật **chỉ ở phần bài test** | Tránh đoán theo thứ tự |
| Thanh tiến trình | Bật | |
| Thông báo xác nhận | "Cảm ơn bạn! Bấm 'Xem điểm' để biết bạn đúng mấy món. Gửi cho bạn cùng phòng thử xem ai cao điểm hơn nhé." | Tạo lan truyền |
| Chia 3 phần (section) | Bài test đặt **trước**, câu hỏi về bản thân sau | Người ta bỏ dở ở phần hỏi thông tin, không bỏ dở ở phần chơi |

## Tiêu đề và mô tả
**Tiêu đề:** Thử thách 2 phút: 10 món rác, bạn bỏ đúng mấy món?
**Mô tả:** Từ đầu năm 2026 Hà Nội bắt buộc phân loại rác thành 3 nhóm (QĐ 87/2025). Thử xem bạn đúng được mấy món — nộp xong có điểm và đáp án ngay. Ẩn danh, không cần email. Nhóm sinh viên UET dùng kết quả tổng hợp cho một cuộc thi.

## Phần 1 — Bài test 10 món (mỗi câu 1 điểm)
Mỗi câu: **ảnh món rác tự chụp** + "Theo quy định mới, món này bỏ vào nhóm nào?"
Lựa chọn giống hệt nhau ở mọi câu, đúng tên trong `rules/qd87.json`:
- Chất thải có khả năng tái sử dụng, tái chế
- Chất thải thực phẩm
- Chất thải rắn sinh hoạt khác
- Mình không biết

"Mình không biết" tính là sai, nhưng để riêng để phân biệt *đoán sai* với *không biết*.
Với pin: thêm lựa chọn theo đúng cách QĐ 87 quy định cho chất thải nguy hại (điền sau khi đọc phụ lục).

| # | Món | Vì sao chọn món này | Đáp án + câu giải thích hiện sau khi nộp |
|---|---|---|---|
| 1 | Chai nước nhựa đã uống hết | Câu dễ, khởi động | TODO theo phụ lục |
| 2 | Hộp cơm nhựa còn dính thức ăn | Bẫy "nhựa = tái chế" | TODO |
| 3 | Vỏ chuối | Câu dễ | TODO |
| 4 | Hộp sữa giấy | Bao bì nhiều lớp | TODO |
| 5 | Giấy ăn dính dầu mỡ | Bẫy "giấy = tái chế" | TODO |
| 6 | Pin AA đã hết | Chất thải nguy hại | TODO |
| 7 | Túi nilon đựng đồ ăn | Rất phổ biến, hay sai | TODO |
| 8 | Lon nước ngọt | Câu dễ | TODO |
| 9 | Bã trà / bã cà phê | Kiểm tra nhóm thực phẩm | TODO |
| 10 | Thùng carton giao hàng | Câu dễ | TODO |

Trộn 4 câu dễ + 6 câu dễ sai: toàn câu khó thì bị nói là cố tình gài, toàn câu dễ thì không thấy vấn đề.
**Người điền đáp án phải đọc phụ lục QĐ 87, và một người thứ hai soát lại.** Đáp án sai thì cả con số bằng chứng sai.

## Phần 2 — Sau khi làm bài (4 câu)
1. Trước khi làm bài này, bạn đã nghe về quy định phân loại rác bắt buộc của Hà Nội chưa? *(Chưa nghe / Có nghe nhưng không rõ nội dung / Biết rõ)*
2. Ở chỗ bạn ở, rác hiện được bỏ thế nào? *(Bỏ chung một túi / Tách riêng đồ bán ve chai, còn lại bỏ chung / Tách đủ các nhóm / Không rõ)*
3. Lần gần nhất bạn phân vân không biết một món bỏ vào đâu, bạn đã làm gì? *(Bỏ đại / Hỏi người khác / Tra Google / Hỏi AI / Chưa bao giờ phân vân)*
4. Điều gì khiến bạn ngại phân loại nhất? *(chọn nhiều: Không biết món nào vào đâu / Không có đủ túi, thùng / Mất thời gian / Người ở chung không làm theo / Nghĩ là cuối cùng vẫn bị đổ chung / Khác)*

## Phần 3 — Về bạn và app (4 câu)
5. Bạn đang ở đâu? *(KTX / Nhà trọ / Chung cư / Nhà riêng cùng gia đình / Khác)*
6. Nếu có app chỉ cần đưa món rác qua camera là biết bỏ vào nhóm nào theo đúng quy định, bạn có dùng không? *(Thang 1–5: 1 = chắc chắn không, 5 = chắc chắn có)*
7. Bạn có muốn cài bản thử trên điện thoại Android trong tuần tới không? *(Có / Không / Mình dùng iPhone)*
8. Nếu có, để lại Facebook/Zalo/email để nhóm gửi link *(trả lời ngắn, không bắt buộc)*

Không hỏi họ tên, MSSV, số điện thoại bắt buộc.

## Gửi ở đâu, lúc nào
| Kênh | Lời nhắn mẫu |
|---|---|
| Nhóm lớp, nhóm Liên chi/CLB | "Thử thách 2 phút: 10 món rác theo luật mới của Hà Nội, mình làm được [điểm thật của bạn]/10. Ai trên 8 điểm không? [link]" |
| Nhóm phòng/nhà KTX, nhóm khu trọ | "Cả phòng thử xem ai cao điểm nhất: [link]" |
| Story Facebook/Instagram cá nhân của từng thành viên | Ảnh chụp điểm của chính mình + link |
| Tại sự kiện 14/11 | Mã QR in sẵn để trên bàn |

Gửi tối 13/11 (21:00–23:30 là lúc sinh viên online) và nhắc lại 7:30 sáng 14/11. Nói điểm thật của mình; đừng nhờ người quen trả lời bừa cho đủ số.

## Đọc kết quả (10:30 và 14:30 ngày 14/11)
Trong tab "Câu trả lời" của Google Form:
- **Điểm trung bình** và **phân bố điểm** → "trung bình đúng [x]/10".
- **Câu hỏi thường bị trả lời sai** → món sai nhiều nhất và tỉ lệ.
- Câu 1 phần 2 → % chưa nghe hoặc không rõ quy định.
- Câu 6 → % chọn 4–5. Câu 7 → số người muốn cài.
Chụp màn hình các biểu đồ này cho slide. Ghi vào `../evidence-log.csv` kèm số người trả lời (n) và giờ chốt số.
Dưới 30 câu trả lời vẫn dùng được, nhưng nói rõ n; không quy ra phần trăm khi n < 20 (nói "13 trong 18 người").
