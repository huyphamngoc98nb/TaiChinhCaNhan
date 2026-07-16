import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, 'scripts', 'generate-android-release-metadata.cjs');
const versionConfig = JSON.parse(readFileSync(join(repoRoot, 'version.config.json'), 'utf8').replace(/^\uFEFF/, ''));
const releaseTag = `v${versionConfig.nativeVersionName}`;

function runGenerator(markdown, tag = releaseTag) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'android-release-metadata-test-'));
  try {
    const apkPath = join(tempRoot, 'app-release.apk');
    const notesPath = join(tempRoot, 'RELEASE_NOTES.md');
    const outputDir = join(tempRoot, 'output');
    writeFileSync(apkPath, 'test apk');
    if (markdown !== null) writeFileSync(notesPath, markdown, 'utf8');

    const result = spawnSync(process.execPath, [
      scriptPath, '--apk-path', apkPath, '--github-repository', 'owner/repository',
      '--release-tag', tag, '--release-notes-path', notesPath, '--output-dir', outputDir,
    ], { cwd: repoRoot, encoding: 'utf8' });

    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
      latest: existsSync(join(outputDir, 'latest.json'))
        ? JSON.parse(readFileSync(join(outputDir, 'latest.json'), 'utf8'))
        : undefined,
    };
  } finally {
    const resolvedRoot = resolve(tempRoot);
    const tempPrefix = `${resolve(tmpdir())}${process.platform === 'win32' ? '\\' : '/'}`;
    if (!resolvedRoot.startsWith(tempPrefix)) throw new Error(`Unsafe temp path: ${resolvedRoot}`);
    rmSync(resolvedRoot, { recursive: true, force: true });
  }
}

describe('generate Android release metadata', () => {
  it.each([
    ['a missing RELEASE_NOTES.md', null, 'RELEASE_NOTES.md is required'],
    ['an empty RELEASE_NOTES.md', '', 'must not be empty'],
    ['only a version heading', `# ${releaseTag}\n`, 'non-empty "## Tóm tắt"'],
    ['template placeholders', `# ${releaseTag}\n\n## Tóm tắt\nViết 1-2 câu tóm tắt.\n\n## Cải thiện\n- Mô tả cải thiện.`, 'placeholder'],
    ['a summary without change bullets', `# ${releaseTag}\n\n## Summary\nA real summary.`, 'at least one bullet'],
  ])('fails for %s', (_name, markdown, message) => {
    const result = runGenerator(markdown);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(message);
    expect(result.latest).toBeUndefined();
  });

  it('fails when the release-note version does not match the tag', () => {
    const result = runGenerator('# v9.9.9\n\n## Summary\nReal summary.\n\n## Improvements\n- Real change.');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(`must be "# ${releaseTag}"`);
  });

  it('generates complete structured and flat metadata from valid committed notes', () => {
    const result = runGenerator(`# ${releaseTag}\n\n## Tóm tắt\nBản cập nhật bắt buộc release notes thực tế.\n\n## Cải thiện\n- Kiểm tra release notes trước khi build và publish.\n\n## Sửa lỗi\n- Loại bỏ fallback release note chung chung.`);
    expect(result.status).toBe(0);
    expect(result.latest.releaseNotesVersion).toBe(2);
    expect(result.latest.releaseSummary).toBe('Bản cập nhật bắt buộc release notes thực tế.');
    expect(result.latest.releaseNoteSections.some((section) => section.items.length > 0)).toBe(true);
    expect(result.latest.releaseNotes.length).toBeGreaterThan(0);
    expect(result.latest.releaseNotes).not.toEqual([`Android release ${releaseTag}`]);
  });
});
