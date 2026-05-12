# OTA Update Roadmap — Chiến lược B+A

> Tài liệu này mô tả thứ tự triển khai thực tế hệ thống OTA Update cho app TaiXiuCaNhan.
> Chiến lược B (Web OTA bundle) xử lý ~90% trường hợp.
> Chiến lược A (APK full update) xử lý khi native shell thay đổi.

---

## Sprint 1 — Nền tảng OTA

### 1.1 ✅ Chuẩn hoá Versioning

- **Mục tiêu**: Xây mô hình 3 lớp version (`nativeVersionName`, `nativeVersionCode`, `bundleVersion`)
- **File chính**: `version.config.json`, `android/app/build.gradle`, `package.json`
- **Kết quả**: `0.1.0 / versionCode=100 / bundle=0.1.0-b1`
- **PR**: `feat/sprint-1-1-versioning`

### 1.2 ✅ Dựng Bundle API

- **Mục tiêu**: Backend trả metadata OTA update, quyết định chiến lược B hay A
- **Endpoints**: `GET /api/health`, `GET /api/updates/bundle/latest`
- **Logic**: so sánh `nativeVersion` vs `minNativeVersion`, `bundleVersion` vs manifest
- **PR**: `feat/sprint-1-2-bundle-api`

### 1.3 🔲 Dựng pipeline build zip bundle + checksum + ký số

- **Mục tiêu**: CI/CD tự động build `.zip` bundle sau mỗi merge vào `main`
- **Việc cần làm**:
  - [ ] Script `scripts/build-bundle.sh`: `vite build` → zip `dist/` → tính SHA-256 → ký bằng private key
  - [ ] Upload `.zip` + `.sig` lên CDN
  - [ ] Cập nhật `bundle-manifest.json` tự động qua API hoặc commit
  - [ ] GitHub Actions workflow: `.github/workflows/build-bundle.yml`
- **Artifact**: `<bundleVersion>.zip`, `<bundleVersion>.zip.sha256`, `<bundleVersion>.zip.sig`

### 1.4 🔲 Tạo UpdateCoordinator

- **Mục tiêu**: Điều phối toàn bộ luồng kiểm tra — gọi API → quyết định → dispatch chiến lược
- **Vị trí**: `src/services/updateCoordinator.ts`
- **Interface**:

```typescript
interface UpdateCoordinator {
  checkAndUpdate(): Promise<UpdateResult>;
  // UpdateResult: { strategy: 'B' | 'A' | 'none'; status: string }
}
```

- **Việc cần làm**:
  - [ ] Gọi Bundle API với headers `x-native-version`, `x-bundle-version`
  - [ ] Nếu `nativeRequired` → dispatch chiến lược A
  - [ ] Nếu `hasUpdate` → dispatch chiến lược B
  - [ ] Throttle: không check quá 1 lần / 24h (lưu lastCheckAt vào SQLite)

### 1.5 🔲 Tạo BundleUpdateService (Chiến lược B)

- **Mục tiêu**: Tải `.zip` bundle OTA trong background, verify, giải nén, đổi path
- **Vị trí**: `src/services/bundleUpdateService.ts`
- **Việc cần làm**:
  - [ ] Tải `.zip` qua `@capacitor/filesystem` (hỗ trợ resume qua Range header)
  - [ ] Verify SHA-256 sau khi tải xong
  - [ ] Verify chữ ký `.sig` bằng public key nhúng cứng trong APK
  - [ ] Giải nén vào `app-private/bundles/<bundleVersion>/`
  - [ ] Ghi `activeBundlePath` vào bảng `app_config` trong SQLite
  - [ ] Hiển thị toast “Cập nhật sẵn sàng, khởi động lại?”
- **Healthcheck**: theo dõi 5 giây sau khi load bundle mới; nếu crash → rollback tự động

### 1.6 🔲 Tạo rollback và last-good-bundle

- **Mục tiêu**: Đảm bảo app luôn có bundle hợp lệ để quay lại
- **Việc cần làm**:
  - [ ] Giữ tối đa 2 bundle: `active` và `last-good`
  - [ ] Ghi `lastGoodBundlePath` vào SQLite sau khi healthcheck pass
  - [ ] Nếu healthcheck fail: restore `lastGoodBundlePath`, xóa bundle lỗi
  - [ ] Expose `rollbackCount` cho analytics (Sprint 3)
- **Schema SQLite**:

```sql
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: 'activeBundlePath', 'lastGoodBundlePath',
--       'activeBundleVersion', 'lastCheckAt', 'rollbackCount'
```

### 1.7 🔲 Test OTA trên internal environment

- **Mục tiêu**: Xác nhận toàn bộ luồng hoạt động trước khi mở rộng
- **Test cases**:
  - [ ] Happy path: bundle mới → tải → verify → apply → app hoạt động bình thường
  - [ ] SHA-256 sai: tải xong nhưng checksum sai → tự động xóa, không apply
  - [ ] Bundle lỗi JS: app crash < 5s sau healthcheck → rollback về last-good
  - [ ] Mất mạng giữa chừng: resume tải từ đúng byte tiếp theo
  - [ ] Native quá thấp: API trả `nativeRequired` → không tải bundle

---

## Sprint 2 — Chiến lược A: APK Update

### 2.1 🔲 Tạo APK metadata API

- **Mục tiêu**: Endpoint trả metadata APK mới khi native version thay đổi
- **Endpoint**: `GET /api/updates/apk/latest`
- **Response**:

```json
{
  "versionCode": 200,
  "versionName": "0.2.0",
  "apkUrl": "https://cdn.example.com/apk/0.2.0.apk",
  "sha256": "abc123...",
  "fileSize": 15728640,
  "releaseNotes": "Thêm Bluetooth plugin",
  "mandatory": true
}
```

### 2.2 🔲 Tạo native bridge/plugin để mở installer

- **Mục tiêu**: Capacitor plugin (Java/Kotlin) mở Android Package Installer
- **Việc cần làm**:
  - [ ] Capacitor Plugin `ApkInstallerPlugin` (đạt tại `android/app/src/main/java`)
  - [ ] Mở `Intent.ACTION_VIEW` với `FileProvider` URI
  - [ ] Expose `installApk(filePath: string): Promise<void>` cho TypeScript

### 2.3 🔲 Cấu hình FileProvider và permission cài đặt

- **Mục tiêu**: Android yêu cầu FileProvider URI để chia sẻ file APK an toàn
- **Việc cần làm**:
  - [ ] Khai báo `<provider>` trong `AndroidManifest.xml`
  - [ ] Tạo `res/xml/file_paths.xml`
  - [ ] Thêm `REQUEST_INSTALL_PACKAGES` permission
  - [ ] Runtime permission request flow (Android 8+)

### 2.4 🔲 Thêm progress UI và resume download

- **Việc cần làm**:
  - [ ] Progress bar UI khi tải APK (không block UI chính)
  - [ ] Resume: lưu `downloadedBytes` vào SQLite mỗi 1MB
  - [ ] Gửi `Range: bytes=<offset>-` nếu tải bị gán đoạn
  - [ ] Xử lý `forceUpdate=true`: block UI, không có nút “Để sau”

### 2.5 🔲 Test trên Android 8, 10, 12, 14

- **Lý do**: Mỗi phiên bản Android thay đổi hành vi với package install
- **Matrix**:

| Android | API | Điểm kiểm tra |
|---------|-----|----------------|
| 8.0 (Oreo) | 26 | `REQUEST_INSTALL_PACKAGES` lần đầu xuất hiện |
| 10 (Q) | 29 | Scoped storage |
| 12 (S) | 31 | `MANAGE_MEDIA` thay đổi |
| 14 (U) | 34 | Partial photo access, install restrictions |

---

## Sprint 3 — Giám sát & Kiểm soát

### 3.1 🔲 Analytics / Audit log

- **Mục tiêu**: Đo lường hiệu quả và phát hiện sựm vấn đề
- **Metrics cần thu thập**:

| Metric | Mô tả |
|--------|---------|
| `check_success_rate` | % thiết bị gọi API thành công |
| `download_fail_rate` | % lần tải bị lỗi (timeout, lỗi mạng) |
| `verify_fail_rate` | % lần checksum / chữ ký không khớp |
| `rollback_count` | Số lần rollback về last-good-bundle |

- **Lưu ý bảo mật**: Không log dữ liệu tài chính trong luồng update; chỉ log metadata kỹ thuật.

### 3.2 🔲 Staged rollout

- **Mục tiêu**: Giảm blast radius khi bundle mới có lỗi
- **Cơ chế**:
  - Bundle API nhận thêm field `rolloutPercent` trong manifest
  - Server tính hash `deviceId % 100 < rolloutPercent` để quyết định
  - Lịch rollout đề nghị: **5% → 20% → 100%**, mỗi bước cách nhau 24h
- **Việc cần làm**:
  - [ ] Thêm `rolloutPercent` và `rolloutDeviceSeed` vào manifest
  - [ ] App gửi `x-device-id` header (hash từ Android ID, không phải ID thật)
  - [ ] Server filter theo rollout trước khi trả update

### 3.3 🔲 Kill-switch

- **Mục tiêu**: Vô hiệu hoá bundle xấu ngay lập tức không cần deploy
- **Cơ chế**:
  - Thêm field `disabled: true` vào manifest entry
  - Server bỏ qua entry `disabled=true` khi tìm latest
  - Client nhận `hasUpdate: false` và không tải
- **Việc cần làm**:
  - [ ] Thêm field `disabled` vào `BundleManifest` type
  - [ ] Lọc `disabled !== true` trong `bundleService.ts`
  - [ ] Test: đánh dấu entry hiện tại là disabled → API trả `hasUpdate: false`

---

## Nguyên Tắc Bảo Mật Bắt Buộc

> ⚠️ Vi phạm bất kỳ nguyên tắc nào là **blocker**, không release.

### Transport

- ❌ **Không cho phép update qua HTTP** — bắt buộc HTTPS cho mọi endpoint API và CDN
- ✅ **Certificate Pinning** cho Update API: nhúng cứng public key SHA-256 vào APK, reject kết nối nếu không khớp

### Artifact

- ❌ **Không apply bundle/APK nếu chưa verify checksum và chữ ký** — xóa file và abort nếu fail
- ❌ **Không lưu artifact update ở vùng public** nếu không cần thiết — dùng app-private storage
- ✅ **Signed manifest**: manifest JSON có trường `signature`; client verify trước khi parse

### Rollout

- ❌ **Không rollout 100% ngay lần đầu** — staged rollout (5% → 20% → 100%) giảm blast radius
- ✅ Giữ lại `last-good-bundle` — rollback tự động nếu healthcheck fail trong 5s

### Logging (App tài chính)

- ❌ **Không log dữ liệu tài chính** trong luồng update (số dư, giao dịch, tên tài khoản)
- ✅ Chỉ log metadata kỹ thuật: `bundleVersion`, `nativeVersion`, `status`, `durationMs`
- ✅ **Audit trail** của sự kiện update lưu local vào SQLite (không gửi remote nếu không cần)

---

## Tổng quan tiến độ

```
Sprint 1          Sprint 2          Sprint 3
──────────────────  ──────────────────  ──────────────────
1.1 ✅ Versioning   2.1 APK API       3.1 Analytics
1.2 ✅ Bundle API   2.2 Native plugin  3.2 Staged rollout
1.3 🔲 Pipeline     2.3 FileProvider   3.3 Kill-switch
1.4 🔲 Coordinator  2.4 Progress UI
1.5 🔲 BundleSvc    2.5 Multi-Android
1.6 🔲 Rollback
1.7 🔲 Internal test
```

> ✅ = Done &nbsp; 🔲 = Backlog

---

*Cập nhật lần cuối: Sprint 1.2 — Tài liệu này cập nhật sau mỗi sprint.*
