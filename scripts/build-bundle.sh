#!/usr/bin/env bash
# =============================================================
# build-bundle.sh
# Build OTA bundle cho TaiXiuCaNhan (React/Vite + Capacitor)
#
# Cách dùng (local):
#   bash scripts/build-bundle.sh
#
# Cách dùng trong CI (GitHub Actions):
#   env SKIP_NPM_BUILD=true bash scripts/build-bundle.sh
#   (khi CI đã chạy npm run build trước rồi)
#
# Prerequisites:
#   - Node.js, npm
#   - openssl
#   - zip
#   - private_key.pem tồn tại ở root (hoặc được set qua biến KEY_PATH)
#
# Artifacts output (artifacts/<bundleVersion>.*):
#   - .zip        : Web bundle (nội dung dist/)
#   - .zip.sha256 : Checksum SHA-256
#   - .zip.sig    : Chữ ký RSA-SHA256 (binary)
# =============================================================
set -euo pipefail

# ------------------------------------------------------------------
# Config — override bằng env nếu cần
# ------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERSION_FILE="${ROOT_DIR}/version.config.json"
DIST_DIR="${ROOT_DIR}/dist"
ARTIFACT_DIR="${ROOT_DIR}/artifacts"
KEY_PATH="${KEY_PATH:-${ROOT_DIR}/private_key.pem}"
SKIP_NPM_BUILD="${SKIP_NPM_BUILD:-false}"
USE_SHASUM=false   # fix: declare global trước khi dùng set -u

# ------------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------------
log()  { echo ">> $*"; }
fail() { echo "[ERROR] $*" >&2; exit 1; }

check_dependencies() {
  local missing=()
  for cmd in node openssl zip sha256sum; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done

  # fix: macOS dùng shasum thay sha256sum — filter đúng phần tử rỗng
  if [[ ${#missing[@]} -gt 0 ]] && [[ "${missing[*]}" == *"sha256sum"* ]]; then
    if command -v shasum &>/dev/null; then
      local filtered=()
      for item in "${missing[@]}"; do
        [[ "$item" != "sha256sum" ]] && filtered+=("$item")
      done
      missing=("${filtered[@]+"${filtered[@]}"}")  # safe khi filtered rỗng
      USE_SHASUM=true
    fi
  fi

  [[ ${#missing[@]} -eq 0 ]] || fail "Thiếu dependency: ${missing[*]}"
}

compute_sha256() {
  local file="$1"
  if [[ "${USE_SHASUM}" == true ]]; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    sha256sum "$file" | awk '{print $1}'
  fi
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
echo ""
echo "============================================================"
echo " OTA Bundle Builder — TaiXiuCaNhan"
echo "============================================================"

check_dependencies

# ------------------------------------------------------------------
# Bước 1: Đọc bundleVersion từ version.config.json
# ------------------------------------------------------------------
log "[1/5] Đọc bundleVersion từ version.config.json..."

[[ -f "${VERSION_FILE}" ]] || fail "Không tìm thấy: ${VERSION_FILE}"

BUNDLE_VERSION=$(node -e "
  const v = require('${VERSION_FILE}');
  if (!v.bundleVersion) { process.stderr.write('Thiếu field bundleVersion\\n'); process.exit(1); }
  process.stdout.write(v.bundleVersion);
")

[[ -n "${BUNDLE_VERSION}" ]] || fail "bundleVersion rỗng"
log "    bundleVersion = ${BUNDLE_VERSION}"

# ------------------------------------------------------------------
# Bước 2: Build web assets (npm run build)
# ------------------------------------------------------------------
log "[2/5] Build web assets..."

if [[ "${SKIP_NPM_BUILD}" == "true" ]]; then
  log "    SKIP_NPM_BUILD=true — bỏ qua bước npm run build"
  [[ -d "${DIST_DIR}" ]] || fail "dist/ không tồn tại và SKIP_NPM_BUILD=true"
else
  # fix: wrap subshell để không thay đổi working directory của session hiện tại
  (cd "${ROOT_DIR}" && npm run build)
  [[ -d "${DIST_DIR}" ]] || fail "npm run build thành công nhưng dist/ vẫn không tồn tại"
fi

DIST_FILE_COUNT=$(find "${DIST_DIR}" -type f | wc -l | tr -d ' ')
log "    dist/ có ${DIST_FILE_COUNT} files"

# ------------------------------------------------------------------
# Bước 3: Zip dist/ thành artifacts/<bundleVersion>.zip
# ------------------------------------------------------------------
log "[3/5] Tạo zip bundle..."

mkdir -p "${ARTIFACT_DIR}"

ZIP_NAME="${BUNDLE_VERSION}.zip"
ZIP_PATH="${ARTIFACT_DIR}/${ZIP_NAME}"

# Xóa zip cũ nếu có (idempotent)
rm -f "${ZIP_PATH}"

# Zip từ trong dist/ ra — không include đường dẫn tuyệt đối
(cd "${DIST_DIR}" && zip -r "${ZIP_PATH}" .)

ZIP_SIZE=$(du -sh "${ZIP_PATH}" | awk '{print $1}')
log "    ${ZIP_NAME} (${ZIP_SIZE})"

# ------------------------------------------------------------------
# Bước 4: Tính SHA-256 checksum
# ------------------------------------------------------------------
log "[4/5] Tính SHA-256 checksum..."

SHA_NAME="${ZIP_NAME}.sha256"
SHA_PATH="${ARTIFACT_DIR}/${SHA_NAME}"

CHECKSUM=$(compute_sha256 "${ZIP_PATH}")
echo "${CHECKSUM}" > "${SHA_PATH}"

log "    ${SHA_NAME}"
log "    SHA-256: ${CHECKSUM}"

# ------------------------------------------------------------------
# Bước 5: Ký số bằng RSA private key
# ------------------------------------------------------------------
log "[5/5] Ký số bundle..."

# fix: tách fail() thành 2 echo riêng để xuống dòng đúng
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "[ERROR] Không tìm thấy private key: ${KEY_PATH}" >&2
  echo "        Hãy chạy: bash scripts/generate-keypair.sh" >&2
  exit 1
fi

SIG_NAME="${ZIP_NAME}.sig"
SIG_PATH="${ARTIFACT_DIR}/${SIG_NAME}"

openssl dgst \
  -sha256 \
  -sign "${KEY_PATH}" \
  -out "${SIG_PATH}" \
  "${ZIP_PATH}"

SIG_SIZE=$(du -sh "${SIG_PATH}" | awk '{print $1}')
log "    ${SIG_NAME} (${SIG_SIZE})"

# ------------------------------------------------------------------
# Kết quả
# ------------------------------------------------------------------
echo ""
echo "============================================================"
echo " ARTIFACTS đã tạo trong artifacts/"
echo "============================================================"
printf "  %-40s %s\n" "${ZIP_NAME}" "(web bundle)"
printf "  %-40s %s\n" "${SHA_NAME}" "(SHA-256 checksum)"
printf "  %-40s %s\n" "${SIG_NAME}" "(RSA-SHA256 signature)"
echo "------------------------------------------------------------"
echo "  bundleVersion : ${BUNDLE_VERSION}"
echo "  sha256        : ${CHECKSUM}"
echo "------------------------------------------------------------"
echo ""
echo "  Nếu muốn verify thủ công:"
echo "  openssl dgst -sha256 -verify public_key.pem \\"
echo "    -signature artifacts/${SIG_NAME} \\"
echo "    artifacts/${ZIP_NAME}"
echo "  Kết quả mong đợi: Verified OK"
echo "============================================================"
