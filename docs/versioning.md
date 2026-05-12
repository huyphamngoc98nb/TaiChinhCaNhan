# Versioning Policy – TaiXiuCaNhan

> **Phiên bản tài liệu:** 1.0 | **Cập nhật:** 2026-05-12

## Nguồn sự thật

Tất cả version được quản lý tại **`version.config.json`** ở root project.  
Không sửa version trực tiếp ở `android/app/build.gradle` hay `package.json` – các file đó đọc từ `version.config.json` thông qua build script.

---

## Mô hình 3 lớp

| Lớp | Biến | Ví dụ | Mục đích |
|-----|------|-------|----------|
| **Native Shell** | `nativeVersionName` | `0.1.0` | Hiển thị cho người dùng, Play/store-like display |
| **Native Build** | `nativeVersionCode` | `100` | Android so sánh để biết có APK mới không |
| **OTA Bundle** | `bundleVersion` | `0.1.0-b1` | Backend/client biết bundle OTA hiện tại là gì |

---

## Công thức sinh versionCode

```
versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
```

| versionName | versionCode |
|-------------|-------------|
| 0.1.0       | 100         |
| 0.1.1       | 101         |
| 0.2.0       | 200         |
| 1.0.0       | 10000       |
| 1.2.3       | 10203       |

**Quy tắc:** `versionCode` chỉ được tăng, không bao giờ giảm.

---

## Format bundleVersion

```
bundleVersion = {nativeVersionName}-b{revision}
```

Ví dụ:
- `0.1.0-b1` – bundle đầu tiên cho native `0.1.0`
- `0.1.0-b2` – hotfix OTA thứ 2 trên cùng native
- `0.2.0-b1` – bundle đầu tiên cho native `0.2.0`

**Quy tắc:** `revision` tăng từ 1, reset về 1 khi `nativeVersionName` tăng.

---

## Bảng quyết định khi nào tăng version

| Loại thay đổi | bundleVersion | nativeVersionName | nativeVersionCode |
|---------------|:---:|:---:|:---:|
| Sửa text, màu, spacing | ✅ tăng | ❌ | ❌ |
| Sửa bug logic React (tính toán, validation) | ✅ tăng | ✅ PATCH | ❌ |
| Thêm tính năng mới (web only) | ✅ tăng | ✅ MINOR | ❌ |
| Sửa bug nghiêm trọng cần APK mới | ✅ tăng | ✅ PATCH | ✅ tăng |
| Thêm native permission mới | ✅ tăng | ✅ MINOR/MAJOR | ✅ tăng |
| Nâng Capacitor / native plugin | ✅ tăng | ✅ MINOR | ✅ tăng |
| Thay đổi AndroidManifest | ✅ tăng | ✅ | ✅ tăng |
| Thay đổi signing / keystore | ✅ tăng | ✅ MAJOR | ✅ tăng |

---

## Quy trình bump version

### Release OTA (chỉ web thay đổi)

1. Sửa `version.config.json`: tăng `bundleVersion` (tăng revision `-bN`)
2. Chạy `npm run build` → sinh `dist/`
3. CI zip `dist/` → upload lên storage server
4. Cập nhật metadata bundle trên server
5. Cập nhật `public/bundle-version.json` theo `version.config.json`
6. Commit + tag: `bundle/0.1.0-b2`

### Release APK (có thay đổi native)

1. Sửa `version.config.json`: tăng `nativeVersionName`, `nativeVersionCode`, reset `bundleVersion` revision về 1
2. `android/app/build.gradle` tự đọc từ config (xem hướng dẫn bên dưới)
3. Cập nhật `package.json version` bằng script hoặc tay
4. Cập nhật `public/bundle-version.json`
5. Build APK release: `npx cap build android`
6. Ký APK bằng release keystore
7. Upload APK lên server phân phối
8. Cập nhật metadata APK trên server
9. Commit + tag: `native/0.2.0`

---

## Cách android/app/build.gradle đọc version.config.json

Thêm đoạn sau vào đầu `build.gradle` để đọc từ file JSON (Groovy):

```groovy
import groovy.json.JsonSlurper

def versionConfig = new JsonSlurper().parse(
    file("${rootProject.projectDir}/../version.config.json")
)

// Trong defaultConfig:
defaultConfig {
    versionCode versionConfig.nativeVersionCode
    versionName versionConfig.nativeVersionName
    // ...
}
```

> ⚠️ Bước này được thực hiện trong Sprint 1.1. Hiện tại `build.gradle` đã được cập nhật thủ công.

---

## Release checklist

```
[ ] Xác định loại thay đổi: OTA bundle hay APK native?
[ ] Sửa version.config.json đúng theo bảng quyết định
[ ] Cập nhật public/bundle-version.json tương ứng
[ ] Cập nhật package.json nếu có native release
[ ] android/app/build.gradle phản ánh đúng versionCode/Name
[ ] Chạy build và kiểm tra màn hình About hiển thị đúng 3 giá trị
[ ] Không còn version 0.0.0 hoặc 1.0 mặc định
[ ] Tag commit: bundle/X.Y.Z-bN hoặc native/X.Y.Z
[ ] Upload artifact lên đúng server trước khi push metadata
```

---

## Lưu ý bảo mật

- Không commit `keystore` file lên git
- Không commit `google-services.json` lên git (đã có trong `.gitignore`)
- `version.config.json` chỉ chứa metadata công khai, không chứa secret
- Bundle và APK phải được ký trước khi upload
