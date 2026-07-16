import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'android-release.yml'), 'utf8');

describe('Android release workflow release notes', () => {
  it('requires and validates the committed root file before build', () => {
    const prepare = workflow.indexOf('- name: Prepare release notes');
    const build = workflow.indexOf('- name: Build signed Android release APK');
    expect(prepare).toBeGreaterThanOrEqual(0);
    expect(prepare).toBeLessThan(build);
    expect(workflow).toContain('if [ ! -f RELEASE_NOTES.md ]');
    expect(workflow).toContain('RELEASE_NOTES.md is required. Commit release notes before creating the release tag.');
    expect(workflow).toContain('--validate-release-notes-only');
    expect(workflow).toContain('cp RELEASE_NOTES.md dist-release/release-notes.md');
  });

  it('has no manual-input or generic release-note fallback', () => {
    expect(workflow).not.toContain('release_notes_body');
    expect(workflow).not.toContain('RELEASE_NOTES_SOURCE=fallback');
    expect(workflow).not.toContain('Android release ${RELEASE_TAG}');
  });

  it('validates complete metadata before every publish step', () => {
    const validation = workflow.indexOf('- name: Validate Android release notes metadata');
    expect(workflow).toContain('latest.releaseNotesVersion !== 2');
    expect(workflow).toContain('latest.releaseSummary');
    expect(workflow).toContain('latest.releaseNoteSections');
    expect(workflow).toContain('releaseNotes.length === 0');
    expect(validation).toBeLessThan(workflow.indexOf('- name: Publish latest.json to GitHub Pages'));
    expect(validation).toBeLessThan(workflow.indexOf('- name: Create or update GitHub Release'));
  });
});
