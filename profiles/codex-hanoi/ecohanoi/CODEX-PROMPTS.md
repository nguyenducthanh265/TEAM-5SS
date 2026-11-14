# Câu lệnh dán vào Codex (người điều phối dùng)

Mỗi câu là một lần giao việc. Thay `<...>` trước khi dán. Giữ nguyên phần "Báo cáo".
Chụp màn hình vài phiên làm việc: đó là bằng chứng "dùng Codex thực chất".

## Mở đầu phiên (11:00)
```
Đọc AGENTS.md, profiles/codex-hanoi/EVENT-RULES.md, profiles/codex-hanoi/ecohanoi/PIPELINE.md và WORK-PACKAGES.md.
Bạn là người điều phối. Chưa viết code. Việc đầu tiên: so bảng "chủ file" trong WORK-PACKAGES.md với cấu trúc thư mục
thật của repo này, liệt kê chỗ lệch, rồi đề xuất bảng đã chỉnh. Sau đó làm WP-00 và dừng lại chờ tôi duyệt.
```

## Cổng 2 — giao song song (11:20)
```
Giao song song cho sub agent, mỗi agent đúng một gói trong profiles/codex-hanoi/ecohanoi/WORK-PACKAGES.md:
- ml_engineer: WP-01
- fullstack_dev (A): WP-03
- fullstack_dev (B): WP-04 (dùng hàm giả cho tới khi WP-01 có URL, sau đó nối thật và XÓA hàm giả)
- fullstack_dev (C): WP-05
Ràng buộc cho mọi agent: chỉ sửa file trong cột "Chủ file" của gói mình; không thêm thư viện native ngoài
expo-camera, expo-haptics, react-native-reanimated, expo-image-manipulator, @react-native-async-storage/async-storage
(cài bằng `npx expo install`); không viết tay tên nhóm rác.
Báo cáo của mỗi agent, tối đa 8 dòng: file đã sửa · lệnh nghiệm thu đã chạy và NGUYÊN VĂN dòng kết quả · việc chưa xong · rủi ro.
Khi cả bốn xong, bạn chạy lệnh kiểm tra Cổng 2 trong PIPELINE.md và dán kết quả. Không tự nhận là xong nếu chưa chạy.
```

## Rà soát (13:00 và 14:30)
```
Chạy song song code_reviewer và security_reviewer theo WP-11 trên toàn bộ thay đổi từ tag pre-hackathon
(git diff pre-hackathon --stat để lấy phạm vi). Chỉ đọc, không sửa.
Mỗi agent trả tối đa 10 dòng chia: Chặn / Nên sửa / Bỏ qua được, mỗi dòng có file:dòng.
Sau đó bạn đề xuất thứ tự sửa các lỗi "Chặn" và agent nào sửa. Chờ tôi duyệt rồi mới sửa.
```

## Cổng 3 — giao song song (13:15)
```
Cổng 2 đã qua. Giao song song:
- fullstack_dev (A): WP-06 (bản tối thiểu trước, cây nhóm chỉ làm nếu WP-08 xong)
- fullstack_dev (C): WP-07
- ml_engineer: WP-02 trước, xong mới làm phần API của WP-08
- fullstack_dev (B): WP-10, sau đó phần app của WP-08 khi API có
Quy tắc báo cáo như cũ. 14:30 là chốt tính năng: gói nào chưa xong lúc đó thì dừng, khôi phục file về trạng thái chạy được.
```

## Sửa một lỗi trên máy thật
```
Lỗi trên APK (máy thật): <mô tả 1 câu, bước tái hiện>. Log:
<dán 20–40 dòng adb logcat>
Dùng skill systematic-debugging. Tìm nguyên nhân gốc trước, nêu giả thuyết và cách kiểm, rồi mới sửa. Chỉ sửa file
của gói <WP-xx>. Báo cáo: nguyên nhân · file:dòng đã sửa · cách tôi kiểm lại trên máy · có cần build lại APK không.
```

## Build (devops_deployer)
```
devops_deployer: nạp skill android-apk-device. Chạy `npx tsc --noEmit` và
`python ml/scripts/check_rules.py rules/qd87.json --scan-src app/src`. Cả hai đạt thì bấm build APK profile preview
(--no-wait), trả link build. Không đạt thì dừng và báo lỗi, KHÔNG build.
```

## Chốt (14:45)
```
pitch_coach: làm WP-12. Nguồn số liệu duy nhất: profiles/codex-hanoi/evidence-log.csv, báo cáo llm_eval mới nhất,
và số /stats tôi dán dưới đây: <dán JSON /stats>. Không dùng con số nào khác. Câu nào thiếu bằng chứng thì đưa vào mục
"Thiếu bằng chứng" và bỏ khỏi lời nói.
Song song, fullstack_dev: cập nhật profiles/codex-hanoi/DISCLOSURE.md phần "Làm trong ngày" từ
`git log pre-hackathon..HEAD --oneline`, ghi rõ phần nào do Codex viết.
```

## Mẹo điều phối
- Một câu lệnh = một cổng. Đừng dán cả ngày vào một lần.
- Agent báo "xong" mà không có dòng kết quả lệnh nghiệm thu → yêu cầu chạy lại lệnh.
- Hai agent cần cùng một file → không giao song song; giao nối tiếp.
- Sau mỗi cổng: `git add -A && git commit -m "Cổng N: <việc>"`. Lịch sử commit là bằng chứng phần làm trong ngày.
- Ngữ cảnh phiên dài quá thì mở phiên mới và dán lại câu "Mở đầu phiên" + trạng thái trong `PLAN.md`.
