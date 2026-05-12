/**
 * appVersion.ts
 * Đọc bundle version tại runtime từ web layer.
 * Native version (versionCode, versionName) đọc qua Capacitor App plugin.
 *
 * KHÔNG import trực tiếp version.config.json vào đây vì file đó
 * chỉ dùng cho build tooling & CI, không phải runtime web.
 */

export interface BundleVersionInfo {
  bundleVersion: string;
  nativeVersionName: string;
  minNativeVersionCode: number;
  builtAt: string;
  mandatory: boolean;
  notes: string;
}

/**
 * Lấy bundle version info từ file bundle-version.json được inject lúc build.
 * File này được sinh ra bởi build pipeline (xem docs/versioning.md).
 */
export async function getBundleVersionInfo(): Promise<BundleVersionInfo> {
  const response = await fetch('/bundle-version.json');
  if (!response.ok) {
    throw new Error(`Failed to load bundle-version.json: ${response.status}`);
  }
  return response.json() as Promise<BundleVersionInfo>;
}

/**
 * So sánh hai bundle version string theo dạng "MAJOR.MINOR.PATCH-bN".
 * Trả về:
 *  < 0 nếu a cũ hơn b
 *  = 0 nếu bằng nhau
 *  > 0 nếu a mới hơn b
 */
export function compareBundleVersions(a: string, b: string): number {
  // Tách phần semver và phần build revision
  const parseBundle = (v: string) => {
    const [semver, buildPart] = v.split('-b');
    const [major, minor, patch] = semver.split('.').map(Number);
    const buildRev = buildPart ? parseInt(buildPart, 10) : 0;
    return { major, minor, patch, buildRev };
  };

  const va = parseBundle(a);
  const vb = parseBundle(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  return va.buildRev - vb.buildRev;
}
