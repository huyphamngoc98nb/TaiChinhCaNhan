import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, 'scripts', 'generate-android-release-metadata.cjs');
const versionConfig = JSON.parse(
  readFileSync(join(repoRoot, 'version.config.json'), 'utf8').replace(/^\uFEFF/, ''),
);

function generateLatest(markdown) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'android-release-metadata-test-'));

  try {
    const apkPath = join(tempRoot, 'app-release.apk');
    const notesPath = join(tempRoot, 'RELEASE_NOTES.md');
    const outputDir = join(tempRoot, 'output');
    writeFileSync(apkPath, 'test apk');
    if (markdown !== null) writeFileSync(notesPath, markdown, 'utf8');

    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--apk-path',
        apkPath,
        '--github-repository',
        'owner/repository',
        '--release-tag',
        `v${versionConfig.nativeVersionName}`,
        '--release-notes-path',
        notesPath,
        '--output-dir',
        outputDir,
      ],
      { cwd: repoRoot, encoding: 'utf8' },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'Metadata generator failed.');
    }

    return JSON.parse(readFileSync(join(outputDir, 'latest.json'), 'utf8'));
  } finally {
    const resolvedRoot = resolve(tempRoot);
    const resolvedTempDir = `${resolve(tmpdir())}${process.platform === 'win32' ? '\\' : '/'}`;
    if (!resolvedRoot.startsWith(resolvedTempDir)) {
      throw new Error(`Refusing to clean test directory outside the temp root: ${resolvedRoot}`);
    }
    rmSync(resolvedRoot, { recursive: true, force: true });
  }
}

describe('generate Android release metadata', () => {
  it('generates structured sections, summary, and flat fallback from Vietnamese headings', () => {
    const latest = generateLatest(`# v${versionConfig.nativeVersionName}

## Tóm tắt
Dòng tóm tắt thứ nhất.
Dòng tóm tắt thứ hai.

## Tính năng mới
- Thêm mô tả cập nhật theo nhóm.

## Sửa lỗi
- Sửa lỗi đồng bộ số dư.
`);

    expect(latest.releaseNotesVersion).toBe(2);
    expect(latest.releaseSummary).toBe('Dòng tóm tắt thứ nhất. Dòng tóm tắt thứ hai.');
    expect(latest.releaseNoteSections).toEqual([
      {
        type: 'new_features',
        title: 'Tính năng mới',
        items: [{ title: 'Thêm mô tả cập nhật theo nhóm.' }],
      },
      {
        type: 'bug_fixes',
        title: 'Sửa lỗi',
        items: [{ title: 'Sửa lỗi đồng bộ số dư.' }],
      },
    ]);
    expect(latest.releaseNotes).toEqual([
      'Tính năng mới: Thêm mô tả cập nhật theo nhóm.',
      'Sửa lỗi: Sửa lỗi đồng bộ số dư.',
    ]);
  });

  it('generates structured sections and summary from English headings', () => {
    const latest = generateLatest(`# v${versionConfig.nativeVersionName}

## Summary
English summary.

## Improvements
- Improve update rendering.

## Security
- Keep release notes as text.
`);

    expect(latest.releaseSummary).toBe('English summary.');
    expect(latest.releaseNoteSections.map((section) => section.type)).toEqual([
      'improvements',
      'security',
    ]);
    expect(latest.releaseNotes).toEqual([
      'Improvements: Improve update rendering.',
      'Security: Keep release notes as text.',
    ]);
  });

  it('keeps legacy bullet-only release notes as a flat list', () => {
    const latest = generateLatest('- Legacy note A\n-   \n- Legacy note B\n');

    expect(latest.releaseNotes).toEqual(['Legacy note A', 'Legacy note B']);
    expect(latest).not.toHaveProperty('releaseNotesVersion');
    expect(latest).not.toHaveProperty('releaseSummary');
    expect(latest).not.toHaveProperty('releaseNoteSections');
  });

  it('falls back safely when the release-notes file does not exist', () => {
    const latest = generateLatest(null);

    expect(latest.releaseNotes).toEqual([]);
    expect(latest).not.toHaveProperty('releaseNotesVersion');
    expect(latest).not.toHaveProperty('releaseNoteSections');
  });
});
