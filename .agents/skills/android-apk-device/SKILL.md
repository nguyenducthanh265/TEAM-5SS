---
name: android-apk-device
description: "Dùng khi cần đưa app Expo/React Native lên điện thoại Android thật dưới dạng APK độc lập: build bằng EAS, cài bằng adb, kiểm tra đóng hẳn rồi mở lại, đọc log khi app trắng màn hình hoặc không gọi được backend. Dùng trước mọi buổi demo chấm trên máy thật."
---

# Đưa APK lên máy Android thật

Mục tiêu duy nhất: một file APK cài trên máy thật, tắt laptop vẫn mở được, đóng hẳn rồi mở lại vẫn gọi được AI.
Expo Go và bản dev client KHÔNG đạt mục tiêu này (chúng cần máy tính đang chạy server).

Lệnh Expo/EAS thay đổi theo phiên bản. Khi một lệnh dưới đây báo lỗi cú pháp, chạy `<lệnh> --help` và làm theo
đó, đừng đoán. Nếu đã cài plugin Expo chính thức thì nạp skill tổng quan của plugin đó (expo-overview) trước.

## 0. Kiểm tra một lần (trước ngày thi)

```bash
node -v && npx expo --version && npx eas-cli --version
npx eas-cli whoami          # phải ra tên tài khoản; chưa thì: npx eas-cli login
adb version && adb devices  # máy phải hiện "device", không phải "unauthorized"
```

Máy hiện `unauthorized`: mở khóa điện thoại, bấm "Cho phép gỡ lỗi USB". Không hiện gì: đổi cáp (nhiều cáp chỉ sạc),
bật Tùy chọn nhà phát triển > Gỡ lỗi USB, chọn chế độ USB "Truyền tệp".

## 1. Cấu hình build ra APK

`eas.json` cần một profile cho APK (mặc định EAS ra AAB, không cài trực tiếp được):

```json
{ "build": { "preview": { "distribution": "internal", "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://<backend>.onrender.com" } } } }
```

- Biến `EXPO_PUBLIC_*` bị **đóng cứng vào APK lúc build**. Đổi URL backend = build lại. Không bao giờ để API key ở đây.
- `app.json` phải có `android.package` (ví dụ `com.nhom.ecohanoi`) và `scheme` (cho deep link selftest).
- Backend phải là `https://`. Bản release của Android chặn `http://` thường.
- Quyền camera: khai trong plugin `expo-camera` ở `app.json`, và xin quyền lúc chạy trước khi mở camera.

## 2. Build

```bash
npx eas-cli build -p android --profile preview --non-interactive --no-wait   # trả về link build
npx eas-cli build:list -p android --limit 3                                   # xem trạng thái
```

- Build trên cloud phải **xếp hàng**; gói miễn phí có thể chờ lâu vào giờ cao điểm. Đo thời gian thật ở lần build đầu
  và lên lịch theo số đó. Luôn bắt đầu build sớm rồi làm việc khác.
- Dự phòng khi hàng chờ quá dài (cần Android SDK + JDK cài sẵn trên laptop, phải thử trước ngày thi):
  `npx expo run:android --variant release` (build và cài thẳng vào máy đang cắm cáp).
- Không build khi `npx tsc --noEmit` còn lỗi: build hỏng là mất nguyên một lượt chờ.

## 3. Cài vào máy

```bash
curl -L -o app.apk "<link .apk từ trang build>"
adb devices                          # nhiều máy: thêm -s <serial> vào mọi lệnh adb
adb install -r app.apk               # -r: ghi đè bản cũ, giữ dữ liệu
```

- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`: bản cũ ký bằng khóa khác → `adb uninstall <package>` rồi cài lại (mất dữ liệu app).
- Không có cáp: mở link build bằng trình duyệt trên điện thoại, tải APK, cho phép "Cài ứng dụng không rõ nguồn gốc".
- Cho người khác dùng thử: gửi link build (hoặc mã QR của link) để họ tự cài.

## 4. Kiểm tra đóng hẳn rồi mở lại

```bash
python ml/scripts/demo_check.py --package <package> --scheme <scheme> --repeat 3
```

Script này tự: buộc dừng app, mở lại, gọi deep link `<scheme>://selftest`, chờ dòng `HACKCHECK SELFTEST PASS` trong log,
chụp màn hình. Dòng cuối phải là `RESULT: PASS`. Chạy trên **cả hai** máy demo, sau **mỗi** lần cài APK mới.

Kiểm tay thêm một lần: tắt Wi-Fi, bật 4G, vuốt tắt app trong đa nhiệm, mở lại, chạy luồng chính.

## 5. App lỗi trên máy thật

```bash
adb logcat -c && adb shell monkey -p <package> -c android.intent.category.LAUNCHER 1
adb logcat -d | grep -i -E "ReactNativeJS|AndroidRuntime|FATAL|HACKCHECK" | tail -40
```

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Mở ra màn hình trắng / thoát ngay | Lỗi JS lúc khởi động, thiếu biến `EXPO_PUBLIC_*`, thư viện native mới chưa có trong APK | Đọc `FATAL`/`ReactNativeJS` trong log; thêm thư viện native thì phải build lại |
| Chạy trên Expo Go được, APK thì không gọi được API | URL `http://`, URL localhost, biến env không có trong profile build | Sửa `env` trong `eas.json`, build lại |
| Camera đen | Chưa xin quyền hoặc người dùng từ chối | Xin quyền lúc chạy; Cài đặt > Ứng dụng > Quyền |
| Request đầu rất chậm | Backend Render đang ngủ | Gọi `/health` 2–3 phút trước khi demo |
| Hiệu ứng giật | Animation chạy trên luồng JS | Dùng Reanimated (worklet), chỉ animate `transform`/`opacity` |

## Không làm

- Không demo bằng Expo Go hay dev client.
- Không đổi `android.package` giữa các lần build trong ngày thi.
- Không bật EAS Update / OTA lần đầu trong ngày thi nếu chưa từng tập trước.
- Không cài APK mới vào máy demo chính trong 30 phút cuối mà chưa qua `demo_check.py` trên máy phụ.
