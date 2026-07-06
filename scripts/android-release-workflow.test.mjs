import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github', 'workflows', 'android-release.yml'),
  'utf8',
);

describe('Android release workflow release notes', () => {
  it('declares a manual release-notes body input', () => {
    expect(workflow).toContain('release_notes_body:');
    expect(workflow).toContain("RELEASE_NOTES_BODY: ${{ inputs.release_notes_body || '' }}");
  });

  it('prioritizes the manual body, then the repository file, then a warned fallback', () => {
    const prepareStepStart = workflow.indexOf('- name: Prepare release notes');
    const generateStepStart = workflow.indexOf('- name: Generate Android release metadata');
    const prepareStep = workflow.slice(prepareStepStart, generateStepStart);

    const inputBranch = prepareStep.indexOf('if [[ "${RELEASE_NOTES_BODY}" =~');
    const repositoryFileBranch = prepareStep.indexOf('elif [ -f RELEASE_NOTES.md ]');
    const fallbackBranch = prepareStep.indexOf('RELEASE_NOTES_SOURCE=fallback');

    expect(prepareStepStart).toBeGreaterThanOrEqual(0);
    expect(generateStepStart).toBeGreaterThan(prepareStepStart);
    expect(inputBranch).toBeGreaterThanOrEqual(0);
    expect(repositoryFileBranch).toBeGreaterThan(inputBranch);
    expect(fallbackBranch).toBeGreaterThan(repositoryFileBranch);
    expect(prepareStep).toContain('RELEASE_NOTES_SOURCE=workflow_dispatch_input');
    expect(prepareStep).toContain('::warning title=Missing detailed Android release notes::');
  });

  it('validates structured metadata before publishing detailed release notes', () => {
    expect(workflow).toContain('- name: Validate Android release notes metadata');
    expect(workflow).toContain("latest.releaseNotesVersion !== 2");
    expect(workflow).toContain('latest.releaseSummary');
    expect(workflow).toContain('latest.releaseNoteSections');
  });

  it('uses the current workflow generator when rebuilding an existing tag', () => {
    const automationCheckout = workflow.indexOf(
      '- name: Checkout current release metadata generator',
    );
    const copyGenerator = workflow.indexOf(
      'cp .release-automation/scripts/generate-android-release-metadata.cjs',
    );
    const generateMetadata = workflow.indexOf('npm run generate:android-release-metadata');

    expect(automationCheckout).toBeGreaterThanOrEqual(0);
    expect(workflow).toContain('ref: ${{ github.sha }}');
    expect(workflow).toContain('sparse-checkout: scripts/generate-android-release-metadata.cjs');
    expect(copyGenerator).toBeGreaterThan(automationCheckout);
    expect(generateMetadata).toBeGreaterThan(copyGenerator);
  });
});
