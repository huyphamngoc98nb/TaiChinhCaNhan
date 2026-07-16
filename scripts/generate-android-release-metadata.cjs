#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const apkPathInput = readInput(options, 'apk-path', 'APK_PATH');
  const repository = readInput(options, 'github-repository', 'GITHUB_REPOSITORY');
  const releaseTag = readInput(options, 'release-tag', 'RELEASE_TAG') || readInput(options, 'github-ref-name', 'GITHUB_REF_NAME');
  const releaseNotesPathInput = readInput(options, 'release-notes-path', 'RELEASE_NOTES_PATH');
  const outputDirInput = readInput(options, 'output-dir', 'OUTPUT_DIR') || 'dist-release';

  const versionConfigPath = path.join(repoRoot, 'version.config.json');
  const versionConfig = readVersionConfig(versionConfigPath);
  const versionName = validateVersionName(versionConfig.nativeVersionName);
  const versionCode = validateVersionCode(versionConfig.nativeVersionCode, 'nativeVersionCode');
  const minSupportedVersionCode = Object.prototype.hasOwnProperty.call(versionConfig, 'minNativeVersionCodeForBundle')
    ? validateVersionCode(versionConfig.minNativeVersionCodeForBundle, 'minNativeVersionCodeForBundle')
    : versionCode;

  const tagVersion = validateReleaseTag(releaseTag);
  if (tagVersion !== versionName) {
    fail(`release tag "${releaseTag}" must match nativeVersionName "${versionName}".`);
  }

  const releaseNotesMetadata = readAndValidateReleaseNotes(releaseNotesPathInput, releaseTag);
  if (options['validate-release-notes-only']) {
    console.log(`[android-release] validated release notes for ${releaseTag}`);
    return;
  }

  const apkPath = resolveFromRepo(apkPathInput, 'APK_PATH');
  if (!fs.existsSync(apkPath) || !fs.statSync(apkPath).isFile()) {
    fail(`APK_PATH must point to an existing file: ${apkPathInput || '(missing)'}.`);
  }

  if (!repository || typeof repository !== 'string' || repository.trim() === '') {
    fail('GITHUB_REPOSITORY is required.');
  }

  const normalizedRepository = repository.trim();
  const sha256 = hashFileSha256(apkPath);
  const outputDir = resolveFromRepo(outputDirInput, 'OUTPUT_DIR');
  const assetFileName = `TaiChinhCaNhan-${releaseTag}.apk`;
  const assetPath = path.join(outputDir, assetFileName);
  const latestJsonPath = path.join(outputDir, 'latest.json');
  const releaseEnvPath = path.join(outputDir, 'release.env');
  const assetRelativePath = toRepoRelativePath(assetPath);
  const latestJsonRelativePath = toRepoRelativePath(latestJsonPath);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(apkPath, assetPath);

  const latest = {
    platform: 'android',
    versionName,
    versionCode,
    minSupportedVersionCode,
    mandatory: false,
    apkUrl: `https://github.com/${normalizedRepository}/releases/download/${releaseTag}/${assetFileName}`,
    sha256,
    releaseDate: new Date().toISOString().slice(0, 10),
    ...(releaseNotesMetadata.releaseSummary || releaseNotesMetadata.releaseNoteSections.length > 0
      ? { releaseNotesVersion: 2 }
      : {}),
    ...(releaseNotesMetadata.releaseSummary
      ? { releaseSummary: releaseNotesMetadata.releaseSummary }
      : {}),
    ...(releaseNotesMetadata.releaseNoteSections.length > 0
      ? { releaseNoteSections: releaseNotesMetadata.releaseNoteSections }
      : {}),
    releaseNotes: releaseNotesMetadata.releaseNotes,
  };

  fs.writeFileSync(latestJsonPath, `${JSON.stringify(latest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    releaseEnvPath,
    [
      `APK_ASSET_PATH=${assetRelativePath}`,
      `LATEST_JSON_PATH=${latestJsonRelativePath}`,
      `RELEASE_VERSION_NAME=${versionName}`,
      `RELEASE_VERSION_CODE=${versionCode}`,
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`[android-release] wrote ${assetRelativePath}`);
  console.log(`[android-release] wrote ${latestJsonRelativePath}`);
  console.log(`[android-release] wrote ${toRepoRelativePath(releaseEnvPath)}`);
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--validate-release-notes-only') {
      options['validate-release-notes-only'] = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      fail(`unknown argument "${arg}". Expected --name value or --name=value.`);
    }

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');

    if (equalsIndex >= 0) {
      const key = withoutPrefix.slice(0, equalsIndex);
      const value = withoutPrefix.slice(equalsIndex + 1);
      setOption(options, key, value);
      continue;
    }

    const key = withoutPrefix;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      fail(`missing value for --${key}.`);
    }

    setOption(options, key, value);
    index += 1;
  }

  return options;
}

function setOption(options, key, value) {
  const normalizedKey = normalizeOptionKey(key);
  const supported = new Set([
    'apk-path',
    'github-repository',
    'github-ref-name',
    'release-tag',
    'release-notes-path',
    'output-dir',
  ]);

  if (!supported.has(normalizedKey)) {
    fail(`unknown argument --${key}.`);
  }

  options[normalizedKey] = value;
}

function normalizeOptionKey(key) {
  return key.trim().toLowerCase().replace(/_/g, '-');
}

function readInput(options, optionName, envName) {
  return options[optionName] || process.env[envName] || '';
}

function readVersionConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('version.config.json was not found at the repository root.');
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    fail(`could not parse version.config.json: ${error.message}`);
  }
}

function validateVersionName(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('nativeVersionName must be a non-empty string in version.config.json.');
  }

  return value.trim();
}

function validateVersionCode(value, key) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    fail(`${key} must be an integer greater than 0 in version.config.json.`);
  }

  return value;
}

function validateReleaseTag(value) {
  if (!value || typeof value !== 'string') {
    fail('RELEASE_TAG or GITHUB_REF_NAME is required.');
  }

  const tag = value.trim();
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!match) {
    fail(`release tag must use vX.Y.Z format; received "${value}".`);
  }

  return match[1];
}

function resolveFromRepo(value, label) {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    fail(`${label} is required.`);
  }

  return path.resolve(repoRoot, value.trim());
}

function hashFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

const RELEASE_NOTE_SECTION_TYPES = new Map([
  ['tính năng mới', 'new_features'],
  ['new features', 'new_features'],
  ['new feature', 'new_features'],
  ['features', 'new_features'],
  ['cải thiện', 'improvements'],
  ['improvements', 'improvements'],
  ['improvement', 'improvements'],
  ['sửa lỗi', 'bug_fixes'],
  ['bug fixes', 'bug_fixes'],
  ['bug fix', 'bug_fixes'],
  ['fixes', 'bug_fixes'],
  ['bảo mật', 'security'],
  ['security', 'security'],
  ['thay đổi dữ liệu', 'data_migration'],
  ['data changes', 'data_migration'],
  ['data migration', 'data_migration'],
  ['migration', 'data_migration'],
  ['vấn đề đã biết', 'known_issues'],
  ['known issues', 'known_issues'],
  ['known issue', 'known_issues'],
  ['user cần lưu ý', 'user_action_required'],
  ['người dùng cần lưu ý', 'user_action_required'],
  ['user action required', 'user_action_required'],
  ['action required', 'user_action_required'],
]);

const RELEASE_NOTE_SUMMARY_HEADINGS = new Set(['tóm tắt', 'summary']);

function normalizeReleaseNoteHeading(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseReleaseNotesMarkdown(markdown) {
  const releaseNoteSections = [];
  const releaseNotes = [];
  const summaryLines = [];
  let currentSection;
  let readingSummary = false;

  for (const rawLine of String(markdown || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const headingMatch = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(rawLine);
    if (headingMatch) {
      const title = headingMatch[1].trim();
      const normalizedHeading = normalizeReleaseNoteHeading(title);
      const sectionType = RELEASE_NOTE_SECTION_TYPES.get(normalizedHeading);

      readingSummary = RELEASE_NOTE_SUMMARY_HEADINGS.has(normalizedHeading);
      currentSection = sectionType
        ? { type: sectionType, title, items: [] }
        : undefined;

      if (currentSection) {
        releaseNoteSections.push(currentSection);
      }
      continue;
    }

    const bulletMatch = /^\s*[-*]\s+(.+?)\s*$/.exec(rawLine);

    if (readingSummary) {
      const summaryLine = rawLine.trim();
      if (summaryLine && !bulletMatch) {
        summaryLines.push(summaryLine);
      }
    }

    if (!bulletMatch) continue;

    const title = bulletMatch[1].trim();
    if (!title) continue;

    if (currentSection) {
      currentSection.items.push({ title });
      releaseNotes.push(`${currentSection.title}: ${title}`);
    } else {
      releaseNotes.push(title);
    }
  }

  return {
    releaseSummary: summaryLines.length > 0 ? summaryLines.join(' ') : undefined,
    releaseNoteSections: releaseNoteSections.filter((section) => section.items.length > 0),
    releaseNotes,
  };
}

function readAndValidateReleaseNotes(filePathInput, releaseTag) {
  if (!filePathInput || filePathInput.trim() === '') {
    fail('RELEASE_NOTES_PATH is required.');
  }

  const filePath = path.resolve(repoRoot, filePathInput.trim());
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`RELEASE_NOTES.md is required. Commit release notes before creating the release tag.`);
  }

  const markdown = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  if (!markdown.trim()) fail('RELEASE_NOTES.md must not be empty.');

  const firstHeading = markdown.match(/^(#{1,6})\s+(.+?)\s*#*\s*(?:\r?\n|$)/);
  const expectedHeading = `v${validateReleaseTag(releaseTag)}`;
  if (!firstHeading || firstHeading[1] !== '#' || firstHeading[2].trim() !== expectedHeading) {
    fail(`the first heading in RELEASE_NOTES.md must be "# ${expectedHeading}".`);
  }

  const placeholderPatterns = [
    /viết\s+1\s*[-–]\s*2\s+câu/i,
    /mô\s+tả\s+(?:tính năng|cải thiện|lỗi|thay đổi)/i,
    /replace\s+(?:this|me)|placeholder|todo|tbd/i,
  ];
  if (placeholderPatterns.some((pattern) => pattern.test(markdown))) {
    fail('RELEASE_NOTES.md contains unreplaced template placeholder content.');
  }

  const metadata = parseReleaseNotesMarkdown(markdown);
  if (!metadata.releaseSummary || !metadata.releaseSummary.trim()) {
    fail('RELEASE_NOTES.md must contain a non-empty "## Tóm tắt" or "## Summary" section.');
  }
  if (!metadata.releaseNoteSections.some((section) => section.items.length > 0)) {
    fail('RELEASE_NOTES.md must contain at least one bullet in a supported release-note section.');
  }
  if (metadata.releaseNotes.length === 0) {
    fail('RELEASE_NOTES.md must produce at least one flat release note item.');
  }

  return metadata;
}

function toRepoRelativePath(filePath) {
  const relativePath = path.relative(repoRoot, filePath);
  const displayPath = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath) ? relativePath : filePath;
  return displayPath.split(path.sep).join('/');
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/generate-android-release-metadata.cjs --apk-path <apk> --github-repository <owner/repo> --release-tag <vX.Y.Z> --release-notes-path <file>',
      '',
      'Inputs can also be provided through APK_PATH, GITHUB_REPOSITORY, RELEASE_TAG/GITHUB_REF_NAME, RELEASE_NOTES_PATH, and OUTPUT_DIR.',
    ].join('\n'),
  );
}

function fail(message) {
  console.error(`[android-release] error: ${message}`);
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error.message || String(error));
  }
}

module.exports = {
  parseReleaseNotesMarkdown,
  readAndValidateReleaseNotes,
};
