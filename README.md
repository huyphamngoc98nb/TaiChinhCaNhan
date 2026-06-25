# Expense Tracker

Ứng dụng quản lý tài chính cá nhân theo hướng **local-first**, chạy trên Web và được đóng gói cho Android bằng Capacitor. Dữ liệu nghiệp vụ được lưu trong SQLite trên thiết bị; ứng dụng không cần backend để sử dụng các chức năng chính.

## Tính năng hiện có

- Dashboard tổng hợp thu, chi, số dư, ngân sách và hóa đơn sắp đến hạn.
- Quản lý giao dịch thu, chi, chuyển khoản; lọc nâng cao và đính kèm ảnh hóa đơn.
- Quản lý nhiều loại ví: tiền mặt, ngân hàng, thẻ tín dụng, ví điện tử, đầu tư và loại khác.
- Theo dõi sao kê, dư nợ và thanh toán thẻ tín dụng.
- Quản lý danh mục thu/chi và mô tả danh mục.
- Ngân sách theo tuần/tháng, theo danh mục, ví hoặc loại tài khoản.
- Hóa đơn định kỳ và nhắc hạn trong ứng dụng.
- Theo dõi khoản vay/cho vay, lịch sử thanh toán và số tiền còn lại.
- Báo cáo dòng tiền, xu hướng và phân bổ chi tiêu theo danh mục.
- Xuất báo cáo PDF, CSV và error log JSON.
- Backup/restore JSON thủ công và tự động theo ngày, tuần hoặc tháng.
- Giao diện tiếng Việt/tiếng Anh, nhiều đơn vị tiền tệ, theme sáng/tối/hệ thống.
- Khóa ứng dụng bằng PIN; hỗ trợ mở khóa sinh trắc học trên thiết bị native.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| UI | React 18, TypeScript, Vite, Tailwind CSS |
| Điều hướng | React Router |
| Biểu đồ | Recharts |
| Dữ liệu | SQLite, `@capacitor-community/sqlite`, `jeep-sqlite`/IndexedDB trên Web |
| Mobile | Capacitor, Android |
| Export | jsPDF, jsPDF AutoTable, html2canvas |
| Kiểm thử | Vitest, Testing Library |

## Kiến trúc

```text
src/
  app/          # App shell, bootstrap, providers, layouts, router
  core/         # SQLite, migrations, auth, DI, file storage, telemetry
  modules/      # Các domain: transactions, wallets, budgets, loans, ...
  shared/       # Components, context, constants, hooks và utilities dùng chung
  tests/        # Integration/unit tests dùng chung
android/        # Android project và native plugins
server/         # Express health-check stub tùy chọn
docs/           # Tài liệu kiến trúc, security và state management
scripts/        # Script tạo icon và quản lý Android version
```

SQLite là source of truth cho dữ liệu nghiệp vụ. Mỗi module giữ domain model, repository, service/use case, hook và UI liên quan. React Context chỉ dùng cho các concern dạng provider như ngôn ngữ, tiền tệ, theme, toast và confirm dialog.

Luồng khởi động chính:

```text
AppUnlock -> SQLite connection -> migrations -> seed data -> auto backup -> router
```

## Yêu cầu

- Node.js và npm.
- Android Studio, Android SDK và JDK 17 nếu build Android.
- Thiết bị/emulator Android nếu cần kiểm tra chức năng native.

## Chạy Web

```bash
npm install
npm run dev
```

`npm install` tự copy `sql-wasm.wasm` vào `public/assets` thông qua script `postinstall`.

Trên Web, SQLite chạy qua `jeep-sqlite` và lưu vào IndexedDB. Web không có mức mã hóa SQLCipher tương đương bản native và một số chức năng camera, sinh trắc học, lưu/chia sẻ file cần được kiểm tra trên thiết bị thật.

## Kiểm tra chất lượng

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Các test bao phủ migrations/database, giao dịch, ví, thẻ tín dụng, ngân sách, hóa đơn định kỳ, khoản vay, backup/restore, export, báo cáo, auth và các UI flow chính.

## Build Android

Build web bundle và đồng bộ vào Android project:

```bash
npm run build
npx cap sync android
```

Build APK debug trên Windows:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK debug được tạo tại:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Để mở project native:

```bash
npx cap open android
```

Android dùng `minSdkVersion 22`, `compileSdkVersion 34`, `targetSdkVersion 34` và Java 17.

### Release Android

Release build cần cấu hình signing trong `android/keystore.properties`. File này không được commit.

```properties
storeFile=path/to/release-key.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Sau đó build:

```powershell
cd android
.\gradlew.bat assembleRelease
```

`assembleRelease` tự chạy script bump version trước khi build. Nguồn version native là `version.config.json`; không sửa trực tiếp `versionCode` hoặc `versionName` trong Gradle.

## Dữ liệu và migrations

- Database: `taixiu_db`.
- Migration runner nằm tại `src/core/db/migrations/migration-runner.ts`.
- Project hiện có migrations từ `001` đến `030`.
- Default categories được seed khi khởi tạo database.
- Native SQLite dùng SQLCipher; Web dùng SQLite không mã hóa qua IndexedDB.

Khi thay đổi schema:

1. Thêm migration SQL mới trong `src/core/db/migrations/`.
2. Đăng ký migration trong `migration-runner.ts`.
3. Cập nhật repository/model/backup schema liên quan.
4. Thêm test migration và restore tương ứng.

## Backup, restore và export

Backup JSON hiện bao gồm:

- wallets
- categories
- transactions
- recurring bills
- app settings
- budgets
- error logs
- loans và loan payments

Restore là thao tác ghi đè dữ liệu hiện tại và được thực hiện theo transaction. Luôn tạo backup mới trước khi restore.

Lưu ý:

- Backup JSON là plaintext, không được SQLCipher bảo vệ.
- Backup chỉ chứa đường dẫn ảnh hóa đơn, không đóng gói file ảnh vật lý.
- Export PDF/CSV được tạo theo khoảng ngày đã chọn.

## Security

- Trên native, database được mở với SQLCipher sau khi người dùng xác thực PIN.
- PIN không được lưu trực tiếp trong app hoặc local storage.
- Sinh trắc học có thể được bật để mở khóa trên thiết bị hỗ trợ.
- Web không cung cấp mức bảo vệ tương đương native.

Xem chi tiết và các hạng mục hardening còn lại tại [docs/security.md](docs/security.md).

## Server tùy chọn

Thư mục `server/` hiện là Express health-check stub độc lập, không phải dependency của app local-first.

```bash
cd server
npm install
npm run dev
```

Endpoint:

```text
GET http://localhost:3001/api/health
```

## Tài liệu liên quan

- [Hướng dẫn sử dụng](docs/user-guide.md)
- [Code graph](docs/codegraph.md)
- [Security notes](docs/security.md)
- [State management strategy](docs/state-management.md)

## Ghi chú phát triển

- Dùng repository/use case để đọc ghi dữ liệu, không truy cập SQLite trực tiếp từ UI.
- Không sao chép toàn bộ domain data vào global state; SQLite vẫn là source of truth.
- Khi thêm translation, cập nhật đồng thời cả `en` và `vi`.
- Database diagnostics chỉ hiển thị trong development mode.
