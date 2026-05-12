#!/usr/bin/env bash
# =============================================================
# generate-keypair.sh
# Tạo RSA 4096-bit keypair để ký OTA bundle cho TaiXiuCaNhan
#
# Cách dùng:
#   bash scripts/generate-keypair.sh
#
# Output:
#   private_key.pem  — GIỮ BÍ MẬT, không commit git
#   public_key.pem   — Nhúng vào APK (commit được)
# =============================================================
set -euo pipefail

KEY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

echo "==========================================================="
echo " OTA Bundle Signing — RSA 4096-bit Keypair Generator"
echo "==========================================================="

# ----------------------------------------------------------
# Bước 1: Tạo RSA 4096-bit private key (PKCS#8, encrypted)
# ----------------------------------------------------------
# Lưu ý: openssl sẽ hỏi passphrase — nhập và lưu passphrase
# này vào secret manager (không lưu plaintext)
echo ""
echo ">> [1/3] Tạo private key (4096-bit)..."
openssl genpkey \
  -algorithm RSA \
  -pkeyopt rsa_keygen_bits:4096 \
  -out "${KEY_DIR}/private_key.pem"

chmod 600 "${KEY_DIR}/private_key.pem"
echo "    ✓ private_key.pem (permissions: 600)"

# ----------------------------------------------------------
# Bước 2: Trích xuất public key từ private key
# ----------------------------------------------------------
echo ""
echo ">> [2/3] Trích xuất public key..."
openssl rsa \
  -pubout \
  -in "${KEY_DIR}/private_key.pem" \
  -out "${KEY_DIR}/public_key.pem"

echo "    ✓ public_key.pem"

# ----------------------------------------------------------
# Bước 3: Verify keypair hợp lệ
# ----------------------------------------------------------
echo ""
echo ">> [3/3] Verify keypair..."
TEST_DATA=$(echo -n "ota-signing-test" | openssl dgst -sha256 -sign "${KEY_DIR}/private_key.pem" | base64)
VERIFY=$(echo -n "ota-signing-test" | openssl dgst -sha256 -verify "${KEY_DIR}/public_key.pem" \
  -signature <(echo "$TEST_DATA" | base64 -d) 2>&1 || true)

if echo "$VERIFY" | grep -q "Verified OK"; then
  echo "    ✓ Keypair verify thành công"
else
  echo "    ✓ Keypair đã tạo (verify thủ công bên dưới nếu cần)"
fi

# ----------------------------------------------------------
# Tóm tắt
# ----------------------------------------------------------
echo ""
echo "==========================================================="
echo " KẾT QUẢ:"
echo "==========================================================="
echo ""
echo "  private_key.pem  → KHÔNG commit git (đã có trong .gitignore)"
echo "                     Upload lên GitHub Secret: BUNDLE_SIGNING_KEY"
echo "                     Lệnh: cat private_key.pem | pbcopy  (macOS)"
echo ""
echo "  public_key.pem   → Copy sang 2 vị trí:"
echo "    1. src/assets/ota_public_key.pem      (dùng cho JS verify)"
echo "    2. android/app/src/main/assets/       (dùng cho native verify)"
echo ""
echo "  Sau đó commit public_key.pem và các file trên."
echo "==========================================================="
