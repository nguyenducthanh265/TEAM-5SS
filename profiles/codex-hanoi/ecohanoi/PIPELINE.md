# EcoHanoi — pipeline từ tối 13/11 đến hết pitch 14/11

Đọc kèm: `../EVENT-RULES.md` (luật, lịch), `WORK-PACKAGES.md` (việc từng agent), `CODEX-PROMPTS.md` (câu lệnh dán vào Codex),
`EVIDENCE-PLAN.md` (điểm mục 2–3), `PITCH-SCRIPT.md`, `GOOGLE-FORM.md`.

Nguyên tắc xuyên suốt:
1. **Thứ tự ưu tiên = thứ tự điểm.** Luồng quét AI chạy trên APK (40) → bằng chứng vấn đề (35) → người dùng và mở rộng (25). Hiệu ứng đẹp không có điểm riêng.
2. **Mỗi cổng có một lệnh kiểm tra.** Chưa qua cổng thì không làm việc của cổng sau. Qua cổng thì commit.
3. **Một nguồn luật.** Mọi tên nhóm, màu, hướng dẫn lấy từ `rules/qd87.json`. Không viết tay tên nhóm trong code.
4. **Mỗi file một chủ.** Hai agent không sửa cùng một file trong cùng một đợt (bảng chủ file ở `WORK-PACKAGES.md`).
5. **Luôn có một APK chạy được trong túi.** APK mới chỉ thay APK cũ sau khi qua `demo_check.py`.

## Vai của người (3–4 người)
| Vai | Việc | Không làm |
|---|---|---|
| **Điều phối** (ngồi máy chạy Codex) | Giao gói việc cho sub agent, đọc báo cáo, chạy lệnh cổng, commit | Không tự code tay khi agent đang làm cùng file |
| **Thiết bị** | 2 máy Android, build/cài APK, `demo_check.py`, đánh thức backend, 4G | Không sửa code tính năng |
| **Bằng chứng + pitch** | Form, phỏng vấn, mời dùng thử, `evidence-log.csv`, slide, kịch bản | Không ngồi xem code |
| **Kiểm thử + giao diện** (nếu đủ 4 người; không thì Thiết bị kiêm) | Cầm máy thử từng APK, ghi lỗi thành dòng trong `PLAN.md`, soát chữ theo QĐ 87 | |

## Tối 13/11 (trước khi ngủ) — Cổng 0: sẵn sàng
| # | Việc | Ai | Xong khi |
|---|---|---|---|
| 0.1 | Điền hết ô TODO trong `rules/qd87.json` từ văn bản gốc; chốt đáp án 10 món | Bằng chứng + 1 người soát chéo | `python ml/scripts/check_rules.py rules/qd87.json` in `RESULT: PASS` |
| 0.2 | Tạo Google Form theo `GOOGLE-FORM.md`, gửi 3 kênh | Bằng chứng | Có link, có ≥ 1 câu trả lời thử |
| 0.3 | Cài kit v11 vào repo: `python tools_install.py <repo> --profile mobile-ai`; cài plugin Expo (`README` mục "Skill Expo") | Điều phối | Codex `/skills` thấy `android-apk-device`; `/agents` thấy 6 vai |
| 0.4 | `git add -A && git commit && git tag pre-hackathon` | Điều phối | `git tag` có `pre-hackathon` |
| 0.5 | Điền `../DISCLOSURE.md` phần "Có trước ngày 14/11" (gồm cả app cũ 1 màn và hàm phân loại cũ nếu có) | Điều phối | File không còn ngoặc vuông ở phần "có trước" |
| 0.6 | Backend: `python ml/scripts/smoke_test.py <URL Render>` | Thiết bị | `RESULT: PASS source=ai` |
| 0.7 | APK hiện có cài trên 2 máy, `demo_check.py` chạy được | Thiết bị | `RESULT: PASS` trên cả 2 máy; ghi lại số phút một lần build |
| 0.8 | Chụp 30–50 ảnh rác thật (đủ 3 nhóm + món dễ sai), ghi nhãn đúng vào `ml/data/image_eval.jsonl` | Kiểm thử | Đủ ảnh, nhãn do người gán theo file luật |
| 0.9 | Đóng đồ (danh sách cuối file) | Thiết bị | Đủ |

Nếu 0.1 chưa xong trước khi ngủ: đó là việc đầu tiên sáng mai, **trước 10:40**. Không có file luật đúng thì mọi thứ phía sau sai.

## Ngày 14/11 — giờ thi 11:00–16:00
| Giờ | Cổng | Việc (gói việc) | Lệnh kiểm tra cổng |
|---|---|---|---|
| 11:00–11:20 | **1. Hợp đồng** | Điều phối + Codex viết `PLAN.md` và `app/src/lib/contracts.ts` (WP-00). Thiết bị bấm build APK #1 từ code hiện có để chắc pipeline build còn sống. | `npx tsc --noEmit` sạch; build #1 đã vào hàng |
| 11:20–13:00 | **2. Luồng quét chạy đầu–cuối** | Song song: WP-01 (backend `/classify`), WP-03 (nguồn luật + 3 tab), WP-04 (màn Quét), WP-05 (kho dữ liệu + Xem lại). Ăn trưa lệch giờ. | `smoke_test.py` PASS trên URL thật; `check_rules.py --scan-src app/src` PASS; `npx tsc --noEmit` sạch; quét được 1 món trên máy dev |
| 13:00–13:15 | — | WP-10 (selftest + smoke), WP-11 lần 1 (review + bảo mật). Thiết bị bấm **build APK #2**. | Review không còn lỗi mức "chặn" |
| 13:15–14:30 | **3. Đủ bản demo** | Song song: WP-06 (Cây), WP-07 (Thống kê), WP-02 (đo độ chính xác), WP-08 (nhóm + bảng xếp hạng, chỉ khi Cổng 2 đã qua). APK #2 về thì cài máy phụ, chạy `demo_check.py`. | `demo_check.py --repeat 3` PASS trên máy phụ với APK #2 |
| 14:00–15:15 | (song song) | Người Bằng chứng mời 10–20 người tham dự dùng APK #2 (EVIDENCE-PLAN mục B). | `/stats` có `devices_ai` ≥ 10; chụp màn hình |
| **14:30** | **CHỐT TÍNH NĂNG** | Từ đây chỉ sửa lỗi. Gói P1 chưa xong thì cắt, ghi vào slide định hướng. | — |
| 14:30–14:45 | — | WP-11 lần 2. Sửa lỗi chặn. Thiết bị bấm **build APK cuối** (muộn nhất 14:45). | `tsc` sạch, `check_rules.py` PASS, smoke PASS |
| 14:45–15:30 | **4. Đóng gói** | WP-12 (pitch-coach điền số thật vào kịch bản), slide, `DISCLOSURE.md` phần "làm trong ngày". APK cuối về: cài máy phụ → `demo_check.py` → mới cài máy chính. | `demo_check.py --repeat 3` PASS trên **cả 2 máy** |
| 15:30–15:55 | **5. Tổng duyệt** | Tập pitch 2 lần có bấm giờ với đồ thật, 4G, đóng hẳn/mở lại. Nộp bài trước 15:55. | Hai lần tập đều ≤ 4:50 |
| 16:00 | | Dừng code. Không đụng vào máy demo nữa ngoài việc sạc. | |
| 16:05 | | Gọi `/health`, chụp `/stats` lần cuối. Lặp lại 3 phút trước lượt pitch của nhóm. | |

### Nếu trượt giờ (quyết định sẵn, không bàn lại lúc đó)
| Tình huống | Quyết định |
|---|---|
| 13:00 chưa qua Cổng 2 | Bỏ WP-08, WP-07. Toàn bộ agent dồn vào luồng quét. Cây chỉ cần 1 hình + số XP. |
| APK #2 lỗi trên máy thật | Giữ APK #1/APK tối hôm trước ở máy chính. Sửa trên máy phụ. |
| 14:45 build cuối chưa bấm được | Không bấm nữa. Demo bằng APK #2. |
| Hàng chờ EAS > 25 phút | Chuyển sang build cục bộ (`android-apk-device` mục 2) nếu đã thử trước; nếu chưa thì chờ và demo bằng APK gần nhất. |
| Wi-Fi quán chập chờn | Máy demo dùng 4G riêng từ đầu, không đợi tới lúc lỗi. |
| OpenAI lỗi/hết credit | Backend đã có timeout + trả `source: fallback`; app hiện "Chưa phân tích được, chọn nhóm bằng tay". Không giả kết quả AI. |
| Một agent treo > 5 phút không ra gì | Dừng agent đó, giao lại gói việc với phạm vi nhỏ hơn (1 file). |

## Đồ mang theo
- 2 điện thoại Android (bật gỡ lỗi USB, sạc đầy), 2 cáp truyền dữ liệu, sạc dự phòng, ổ cắm kéo dài
- 1 điện thoại phát 4G
- Giá đỡ điện thoại (để lướt rác qua camera bằng hai tay)
- Đồ demo **sạch, khô**: chai PET, lon, hộp cơm nhựa có vệt bẩn (giả bằng nước tương), vỏ chuối bọc màng, pin AA, hộp sữa giấy, túi nilon, 1 túi "hỗn hợp" có món đặt sai
- Khăn giấy, túi đựng rác sau demo
- Laptop: đã đăng nhập Codex, Expo/EAS, Render, GitHub; `adb`, Node, Python + `ml/requirements-llm.txt`
- Mã QR in sẵn: link Form, link tải APK (dán sau khi có APK #2)
