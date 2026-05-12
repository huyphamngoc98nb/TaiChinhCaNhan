# Scripts — OTA Bundle Pipeline

## generate-keypair.sh

**Mục đích**: Tạo RSA 4096-bit keypair để ký và verify OTA bundle.

### Cách chạy

```bash
bash scripts/generate-keypair.sh
```

### Output

| File | Vị trí | Mô tả |
|------|--------|-------|
| `private_key.pem` | Root (KHÔNG commit) | Ký bundle trong CI |
| `public_key.pem` | Root (commit được) | Nguồn để copy sang APK |

### Sau khi generate — Việc cần làm thủ công

#### 1. Copy public key vào project

```bash
# Dùng cho JS/TypeScript (BundleUpdateService)
cp public_key.pem src/assets/ota_public_key.pem

# Dùng cho Android native (nếu cần verify ở Java/Kotlin layer)
cp public_key.pem android/app/src/main/assets/ota_public_key.pem
```

#### 2. Upload private key lên GitHub Secret

```bash
# macOS — copy nội dung vào clipboard
cat private_key.pem | pbcopy

# Linux
cat private_key.pem | xclip -selection clipboard
```

Sau đó vào: **GitHub repo → Settings → Secrets and variables → Actions**
→ New repository secret → Name: `BUNDLE_SIGNING_KEY` → Paste nội dung.

#### 3. Verify keypair thủ công (optional)

```bash
# Ký test data
echo -n "test-payload" | openssl dgst -sha256 -sign private_key.pem -out /tmp/test.sig

# Verify bằng public key
echo -n "test-payload" | openssl dgst -sha256 -verify public_key.pem -signature /tmp/test.sig
# Kết quả mong đợi: Verified OK
```

### Vị trí public key trong APK

```
TaiXiuCaNhan/
├── src/
│   └── assets/
│       └── ota_public_key.pem   ← BundleUpdateService đọc file này (Sprint 1.5)
├── android/
│   └── app/
│       └── src/main/assets/
│           └── ota_public_key.pem   ← Native layer (nếu cần)
└── scripts/
    ├── generate-keypair.sh
    └── build-bundle.sh
```

> ⚠️ `private_key.pem` đã được thêm vào `.gitignore`. Không bao giờ commit file này.

---

## build-bundle.sh

**Mục đích**: Build OTA bundle, tính SHA-256 checksum và ký số bằng RSA private key.

### Prerequisites

- `node` + `npm` đã cài
- `openssl` đã cài
- `zip` đã cài
- `private_key.pem` tồn tại ở root (tạo bằng `generate-keypair.sh`)

### Cách chạy

```bash
# Chạy đầy đủ (local dev)
bash scripts/build-bundle.sh

# Bỏ qua bước npm build (CI đã build trước rồi)
SKIP_NPM_BUILD=true bash scripts/build-bundle.sh

# Dùng private key ở vị trí khác
KEY_PATH=/tmp/ci_key.pem bash scripts/build-bundle.sh
```

### Biến môi trường hỗ trợ

| Biến | Mặc định | Mô tả |
|------|-----------|-------|
| `KEY_PATH` | `./private_key.pem` | Đường dẫn đến RSA private key |
| `SKIP_NPM_BUILD` | `false` | `true` = bỏ qua bước `npm run build` |

### Artifacts output

```
artifacts/
├── 0.1.0-b1.zip          ← Web bundle (nội dung dist/)
├── 0.1.0-b1.zip.sha256   ← Checksum SHA-256 (plain text)
└── 0.1.0-b1.zip.sig      ← Chữ ký RSA-SHA256 (binary)
```

### Verify artifact sau khi build

```bash
# Verify chữ ký
openssl dgst -sha256 -verify public_key.pem \
  -signature artifacts/0.1.0-b1.zip.sig \
  artifacts/0.1.0-b1.zip
# Kết quả mong đợi: Verified OK

# Verify checksum
echo "$(cat artifacts/0.1.0-b1.zip.sha256)  artifacts/0.1.0-b1.zip" | sha256sum --check
# Kết quả mong đợi: artifacts/0.1.0-b1.zip: OK
```

### Sơ đồ luồng

```
version.config.json
      ↓ đọc bundleVersion
npm run build
      ↓ tạo dist/
zip dist/ → artifacts/<bundleVersion>.zip
      ↓
sha256sum → artifacts/<bundleVersion>.zip.sha256
      ↓
openssl dgst -sign → artifacts/<bundleVersion>.zip.sig
```

---

## update-manifest.js _(Sprint 1.3 — Bước 5)_

> Sẽ được tạo ở bước tiếp theo của Sprint 1.3.
