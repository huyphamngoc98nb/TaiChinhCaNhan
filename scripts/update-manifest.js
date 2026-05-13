'use strict';

// =============================================================
// scripts/update-manifest.js
// Cập nhật server/data/bundle-manifest.json sau mỗi CI build
//
// Cách dùng:
//   node scripts/update-manifest.js --version 0.1.0-b2 --checksum abc123...
//
// Env vars:
//   CDN_BASE_URL  (mặc định: https://cdn.example.com/bundles)
// =============================================================

const fs   = require('fs');
const path = require('path');

// ─── Parse arguments ────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--version'  && argv[i + 1]) { args.version  = argv[++i]; }
    if (argv[i] === '--checksum' && argv[i + 1]) { args.checksum = argv[++i]; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.version || !args.checksum) {
  console.error('[ERROR] Thiếu argument bắt buộc.');
  console.error('  Cách dùng: node scripts/update-manifest.js --version <bundleVersion> --checksum <sha256hash>');
  process.exit(1);
}

// ─── Paths ───────────────────────────────────────────────────
const ROOT_DIR     = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'server', 'data', 'bundle-manifest.json');
const VERSION_CONFIG_PATH = path.join(ROOT_DIR, 'version.config.json');

// ─── Đọc version.config.json ─────────────────────────────────
if (!fs.existsSync(VERSION_CONFIG_PATH)) {
  console.error('[ERROR] Không tìm thấy version.config.json tại: ' + VERSION_CONFIG_PATH);
  process.exit(1);
}
const versionConfig = JSON.parse(fs.readFileSync(VERSION_CONFIG_PATH, 'utf8'));
const minNativeVersion = versionConfig.minNativeVersion
  || versionConfig.nativeVersionName
  || '0.1.0';

// ─── CDN base URL ────────────────────────────────────────────
const CDN_BASE_URL = (process.env.CDN_BASE_URL || 'https://cdn.example.com/bundles')
  .replace(/\/$/, ''); // bỏ trailing slash nếu có

// ─── Đọc manifest hiện tại (tạo mới nếu chưa có) ────────────
let manifest;
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Hỗ trợ cả 2 format: array trực tiếp hoặc { bundles: [] }
    if (Array.isArray(parsed)) {
      manifest = { bundles: parsed };
    } else if (parsed && Array.isArray(parsed.bundles)) {
      manifest = parsed;
    } else {
      console.warn('[WARN] bundle-manifest.json có format không hợp lệ, reset về mảng rỗng.');
      manifest = { bundles: [] };
    }
  } catch (e) {
    console.warn('[WARN] Không parse được bundle-manifest.json, reset về mảng rỗng. Lỗi: ' + e.message);
    manifest = { bundles: [] };
  }
} else {
  console.log('[INFO] bundle-manifest.json chưa tồn tại, tạo mới.');
  // Tạo thư mục nếu chưa có
  const dataDir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[INFO] Đã tạo thư mục: ' + dataDir);
  }
  manifest = { bundles: [] };
}

// ─── Tạo entry mới ───────────────────────────────────────────
const bundleVersion = args.version;
const url    = CDN_BASE_URL + '/' + bundleVersion + '.zip';
const sigUrl = url + '.sig';

const newEntry = {
  bundleVersion : bundleVersion,
  url           : url,
  sha256        : args.checksum,
  sigUrl        : sigUrl,
  minNativeVersion : minNativeVersion,
  releaseNotes  : 'Auto-built from CI \u2014 ' + bundleVersion,
  disabled      : false,
  createdAt     : new Date().toISOString(),
};

// ─── Kiểm tra duplicate ──────────────────────────────────────
const existingIdx = manifest.bundles.findIndex(
  function(b) { return b.bundleVersion === bundleVersion; }
);
if (existingIdx !== -1) {
  console.warn('[WARN] bundleVersion "' + bundleVersion + '" đã tồn tại tại index ' + existingIdx + ', sẽ ghi đè.');
  manifest.bundles.splice(existingIdx, 1);
}

// ─── Unshift (newest first) ───────────────────────────────────
manifest.bundles.unshift(newEntry);

// ─── Ghi lại file ────────────────────────────────────────────
// Giữ nguyên format array nếu file ban đầu là array
const outputData = Array.isArray(JSON.parse(
  fs.existsSync(MANIFEST_PATH + '.bak') ? '[]' : '[]'
))
  ? manifest.bundles  // luôn ghi ra array để tương thích với server/
  : manifest.bundles;

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(outputData, null, 2) + '\n', 'utf8');

// ─── Log kết quả ─────────────────────────────────────────────
console.log('\n[SUCCESS] Đã thêm entry vào bundle-manifest.json:');
console.log(JSON.stringify(newEntry, null, 2));
console.log('\n[INFO] Tổng số bundles trong manifest: ' + manifest.bundles.length);
console.log('[INFO] Manifest path: ' + MANIFEST_PATH);
