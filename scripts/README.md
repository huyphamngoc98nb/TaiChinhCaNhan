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
    └── generate-keypair.sh
```

> ⚠️ `private_key.pem` đã được thêm vào `.gitignore`. Không bao giờ commit file này.

---

## build-bundle.sh _(Sprint 1.3 — Step 2)_

> Sẽ được tạo ở bước tiếp theo của Sprint 1.3.
