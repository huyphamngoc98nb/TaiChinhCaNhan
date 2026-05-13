import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { checkBundleUpdate } from '../bundleService';
import type { BundleManifest } from '../../types/bundle';

// Mock toàn bộ module fs — không chạm đĩa cứng thật
vi.mock('fs');

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Bundle ổn định hiện tại (0.1.0-b1, cần native >= 0.1.0) */
const STABLE_BUNDLE: BundleManifest = {
  channel: 'stable',
  bundleVersion: '0.1.0-b1',
  bundleUrl: 'https://cdn.example.com/bundles/stable/0.1.0-b1.zip',
  sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  minNativeVersion: '0.1.0',
  mandatory: false,
  releaseNotes: 'Bản đầu tiên',
  publishedAt: 1_747_062_000_000,
};

/** Bundle mới hơn (0.1.1-b2), vẫn dùng native >= 0.1.0 */
const NEWER_BUNDLE: BundleManifest = {
  ...STABLE_BUNDLE,
  bundleVersion: '0.1.1-b2',
  bundleUrl: 'https://cdn.example.com/bundles/stable/0.1.1-b2.zip',
  releaseNotes: 'Sửa lỗi budget',
  publishedAt: 1_747_100_000_000, // mới hơn
};

/** Bundle yêu cầu native >= 0.2.0 (bắt buộc) */
const HIGH_NATIVE_BUNDLE: BundleManifest = {
  ...STABLE_BUNDLE,
  bundleVersion: '0.2.0-b1',
  minNativeVersion: '0.2.0',
  mandatory: true,
  releaseNotes: 'Thêm Bluetooth plugin, cần native mới',
  publishedAt: 1_747_200_000_000,
};

/** Bundle thuộc channel beta */
const BETA_BUNDLE: BundleManifest = {
  ...STABLE_BUNDLE,
  channel: 'beta',
  bundleVersion: '0.2.0-beta1',
  publishedAt: 1_747_300_000_000,
};

// ── Helper mock ─────────────────────────────────────────────────────────────

/** Set manifest trả về từ fs.readFileSync */
function mockManifest(entries: BundleManifest[]) {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(entries));
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  // Reset CDN_BASE_URL env
  process.env.CDN_BASE_URL = 'https://cdn.example.com';
});

describe('checkBundleUpdate — Chiến lược B: OTA bundle update', () => {
  it('trả hasUpdate=true khi bundleVersion khác và native tương thích', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle');

    expect(result.hasUpdate).toBe(true);
    expect(result.update).not.toBeNull();
    expect(result.update?.bundleVersion).toBe('0.1.0-b1');
    expect(result.nativeRequired).toBeNull();
  });

  it('chọn entry mới nhất (publishedAt lớn nhất) khi có nhiều entry', () => {
    // NEWER_BUNDLE có publishedAt lớn hơn STABLE_BUNDLE
    mockManifest([STABLE_BUNDLE, NEWER_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle');

    expect(result.hasUpdate).toBe(true);
    expect(result.update?.bundleVersion).toBe('0.1.1-b2');
  });

  it('trả hasUpdate=true ngay cả khi native version cao hơn minNativeVersion', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('1.5.0', 'old-bundle');

    expect(result.hasUpdate).toBe(true);
  });
});

describe('checkBundleUpdate — Không có update', () => {
  it('trả hasUpdate=false khi bundleVersion đã khớp manifest', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', '0.1.0-b1');

    expect(result.hasUpdate).toBe(false);
    expect(result.update).toBeNull();
    expect(result.nativeRequired).toBeNull();
  });

  it('bỏ qua khoảng trắng khi so sánh bundleVersion', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', '  0.1.0-b1  ');

    expect(result.hasUpdate).toBe(false);
  });

  it('trả hasUpdate=false khi manifest rỗng', () => {
    mockManifest([]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle');

    expect(result.hasUpdate).toBe(false);
    expect(result.update).toBeNull();
    expect(result.nativeRequired).toBeNull();
  });

  it('không trả beta bundle khi gọi stable channel', () => {
    mockManifest([BETA_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle', 'stable');

    expect(result.hasUpdate).toBe(false);
  });
});

describe('checkBundleUpdate — Chiến lược A: yêu cầu nâng APK', () => {
  it('trả nativeRequired khi native version thấp hơn minNativeVersion', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.0.9', 'old-bundle');

    expect(result.hasUpdate).toBe(false);
    expect(result.update).toBeNull();
    expect(result.nativeRequired).not.toBeNull();
    expect(result.nativeRequired?.minNativeVersion).toBe('0.1.0');
    expect(result.nativeRequired?.downloadUrl).toContain('/apk/0.1.0.apk');
  });

  it('gắn đúng CDN_BASE_URL vào downloadUrl', () => {
    process.env.CDN_BASE_URL = 'https://my-cdn.vn';
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.0.1', 'old-bundle');

    expect(result.nativeRequired?.downloadUrl).toBe('https://my-cdn.vn/apk/0.1.0.apk');
  });

  it('set mandatory=true khi bundle đánh dấu bắt buộc', () => {
    mockManifest([HIGH_NATIVE_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle');

    expect(result.nativeRequired?.mandatory).toBe(true);
  });

  it('native version 0.0.0 luôn bị chặn bởi minNativeVersion hợp lệ', () => {
    mockManifest([STABLE_BUNDLE]);
    const result = checkBundleUpdate('0.0.0', 'old-bundle');

    expect(result.nativeRequired).not.toBeNull();
  });
});

describe('checkBundleUpdate — Channel beta', () => {
  it('trả đúng beta bundle khi gọi channel=beta', () => {
    mockManifest([STABLE_BUNDLE, BETA_BUNDLE]);
    const result = checkBundleUpdate('0.1.0', 'old-bundle', 'beta');

    expect(result.hasUpdate).toBe(true);
    expect(result.update?.bundleVersion).toBe('0.2.0-beta1');
  });
});

describe('checkBundleUpdate — Lỗi hệ thống', () => {
  it('throw Error khi manifest file không tồn tại', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => checkBundleUpdate('0.1.0', 'old-bundle')).toThrow(
      'bundle-manifest.json not found',
    );
  });
});
