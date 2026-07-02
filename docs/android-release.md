# Android release

Workflow `.github/workflows/android-release.yml` builds the Capacitor Android release APK, signs it, generates `latest.json`, and publishes both assets to GitHub Releases. CI must run from a tag named `vX.Y.Z`; the `X.Y.Z` part must match `nativeVersionName` in `version.config.json`.

The APK stays on GitHub Releases. The app reads the update manifest from GitHub Pages at `https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json` because that static URL is friendlier to Android WebView fetch/CORS behavior than GitHub Release download redirects.

The frontend endpoint can be overridden at build time with `VITE_ANDROID_LATEST_JSON_URL`; see `.env.example`. `VITE_ANDROID_CURRENT_VERSION_NAME` and `VITE_ANDROID_CURRENT_VERSION_CODE` remain optional compatibility fallbacks. Android builds normally resolve these values through the native `AppUpdatePlugin`, with `@capacitor/app` as a secondary fallback.

## Operational checklist

Use this checklist for every Android release:

- Step 1: Update `version.config.json`.
- Step 2: Before creating the tag, update the root `RELEASE_NOTES.md` from [`docs/templates/RELEASE_NOTES.template.md`](./templates/RELEASE_NOTES.template.md). It must include `Tóm tắt`; a release with actual user-visible changes must also include at least one usable item under `Sửa lỗi` or `Cải thiện`.
- Step 3: Review every bullet for user-facing language. Remove placeholder text and do not claim work that is not in the release build.
- Step 4: Commit the version and release-note changes.
- Step 5: Create tag `vX.Y.Z` matching `nativeVersionName`.
- Step 6: Push the tag.
- Step 7: Check GitHub Actions for the Android Release workflow.
- Step 8: Check GitHub Release assets and confirm its notes match the original Markdown.
- Step 9: Inspect generated `latest.json`: structured notes must include `releaseNotesVersion: 2`, `releaseSummary` when supplied, non-empty `releaseNoteSections`, and the flat `releaseNotes` compatibility fallback.
- Step 10: Download the APK and install it over the previous version on a phone.
- Step 11: Run the release-note manual QA below. The dialog must render structured notes as summary and section groups, while legacy manifests must still render the flat list.

## Definition of Done

- APK is built successfully.
- APK is signed with the release key.
- `latest.json` has the correct `versionName`, `versionCode`, `apkUrl`, and `sha256`.
- `latest.json` contains the reviewed release-note content and keeps `releaseNotes` for older app versions.
- Structured release notes contain `releaseNotesVersion: 2` and at least one usable `releaseNoteSections` entry.
- GitHub Pages serves the same `latest.json` at `https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json`.
- APK installs over the previous version.
- `versionCode` is greater than the previous release.

## GitHub Secrets

Create these repository secrets in GitHub:

- `ANDROID_KEYSTORE_BASE64`: base64 content generated from `release-key.jks`.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: release key alias.
- `ANDROID_KEY_PASSWORD`: release key password.

Never commit the real `release-key.jks` keystore or `android/keystore.properties`. The workflow decodes `ANDROID_KEYSTORE_BASE64` into `android/release-key.jks`.

Generate `ANDROID_KEYSTORE_BASE64` on macOS/Linux:

```bash
base64 -w 0 release-key.jks > release-key.base64.txt
```

If macOS `base64` does not support `-w`, use:

```bash
base64 release-key.jks | tr -d '\n' > release-key.base64.txt
```

Generate it on Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release-key.jks")) | Set-Content -NoNewline "release-key.base64.txt"
```

The workflow writes this CI-only signing file:

```properties
storeFile=../release-key.jks
storePassword=...
keyAlias=...
keyPassword=...
```

The `storeFile` path is resolved from the Android `app` module, so CI must use `../release-key.jks` for the decoded file in `android/release-key.jks`.

## Bump version.config.json

`version.config.json` is the Android version source of truth. Before creating a release tag, update:

```json
{
  "nativeVersionName": "0.1.15",
  "nativeVersionCode": 115,
  "minNativeVersionCodeForBundle": 100
}
```

Rules:

- `nativeVersionName` must be `X.Y.Z`.
- `nativeVersionCode` must be an integer greater than the previous release.
- Do not edit Android `versionCode` or `versionName` directly in Gradle.
- CI builds with `-PskipAndroidVersionBump=true`, so it will not modify `version.config.json`.

## Create the release tag

Commit the version change first, then create and push a matching tag:

```bash
git tag v0.1.15
git push origin v0.1.15
```

For manual reruns, open the Android Release workflow and use `workflow_dispatch` with an existing tag such as `v0.1.15`.

## Check the GitHub Release

After the workflow finishes, open the release for the tag and verify these assets exist:

- `TaiChinhCaNhan-v0.1.15.apk`
- `latest.json`

Check `latest.json` includes:

- `versionName` matching `version.config.json`.
- `versionCode` matching `version.config.json`.
- `apkUrl` pointing to the APK asset on the same GitHub Release.
- `sha256` matching the uploaded APK.
- `releaseNotesVersion: 2` when `releaseSummary` or `releaseNoteSections` is present.
- `releaseSummary` matching the `Tóm tắt`/`Summary` paragraph, when supplied.
- `releaseNoteSections` containing the expected section titles and bullets.
- `releaseNotes` containing the flat, prefixed fallback used by older app versions.

If `RELEASE_NOTES.md` exists at the repo root, the workflow uses it as the GitHub Release notes. Otherwise it uses `Android release vX.Y.Z`.

## GitHub Pages manifest

The workflow also publishes `dist-release/latest.json` to the root of the `gh-pages` branch:

```text
https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json
```

This file should be identical to the `latest.json` uploaded to the GitHub Release. GitHub Pages must be enabled for the repository with the `gh-pages` branch as the Pages source.

Only `latest.json` is published to GitHub Pages. The APK is not published to Pages; `apkUrl` inside `latest.json` still points to the APK asset on the matching GitHub Release.

## Phase A/B merge readiness

Review this checklist before merging Android release or app-update changes:

- CI release builds must call `./gradlew assembleRelease -PskipAndroidVersionBump=true`.
- CI must not commit or rewrite `version.config.json`.
- Release tags must use `vX.Y.Z` and match `nativeVersionName` in `version.config.json`.
- `latest.json` must be generated from `version.config.json`, include `sha256`, and point `apkUrl` to the uploaded APK asset.
- App update checks should fetch `latest.json` from GitHub Pages, while APK downloads should keep using GitHub Release assets.
- Keystores and signing files must stay out of git; `.gitignore` must cover `android/keystore.properties`, `*.jks`, `*.keystore`, and `dist-release/`.
- Runtime update checks must only run on Android.
- Offline, failed fetches, and invalid `latest.json` must return no update without crashing the app.
- Optional updates skipped by the user must not prompt again for the same `versionCode`.
- Mandatory updates must still prompt even when the same `versionCode` was previously skipped.
- Update UI text must come from `translations.ts`.
- The update dialog should show current version, latest version, and release notes when available.
- Generated structured metadata must retain the flat `releaseNotes` fallback for older clients.
- The dialog must render `releaseSummary` and `releaseNoteSections` as groups before merge.
- Manual update checks in Settings should bypass the skipped-version preference and show a clear toast when already up to date.
- The Phase 1-3 frontend must not use a browser APK download fallback. APK installation is handled only by the native `AppUpdatePlugin` added in Phase 4-6.

## Update dialog behavior

When the app detects a newer Android version, it shows a blocking update dialog with the new version and release notes from `latest.json`. Clicking outside the dialog, pressing Escape, or pressing Android Back does not close the dialog or allow navigation behind it.

For optional updates, the user must explicitly choose `Cập nhật` or `Bỏ qua phiên bản này`. Skipping stores the release `versionCode`, closes the dialog, and suppresses that optional version during later automatic checks. Settings manual checks bypass this preference.

For mandatory updates, the dialog does not show `Bỏ qua phiên bản này`; the user must choose `Cập nhật` to continue.

## Release notes

Before tagging, create or update the root `RELEASE_NOTES.md`. Start from [`docs/templates/RELEASE_NOTES.template.md`](./templates/RELEASE_NOTES.template.md), replace `vX.Y.Z`, remove unused optional sections, and replace every placeholder bullet with release-specific content.

The Android metadata generator reads these headings:

- `Tóm tắt` or `Summary` becomes `releaseSummary`. Multiple non-empty paragraph lines are joined with spaces.
- `Tính năng mới`, `Cải thiện`, `Sửa lỗi`, `Bảo mật`, `Thay đổi dữ liệu`, `Vấn đề đã biết`, and `User cần lưu ý` become typed entries in `releaseNoteSections`. Equivalent supported English headings are also accepted.
- Each top-level line starting with `- ` becomes an item. Nested bullets are not parsed in this format version.

A generated structured manifest uses this shape:

```json
{
  "releaseNotesVersion": 2,
  "releaseSummary": "Bản cập nhật này cải thiện độ ổn định và trải nghiệm cập nhật.",
  "releaseNoteSections": [
    {
      "type": "improvements",
      "title": "Cải thiện",
      "items": [
        {
          "title": "Cải thiện hiển thị thông tin cập nhật trên màn hình nhỏ."
        }
      ]
    }
  ],
  "releaseNotes": [
    "Cải thiện: Cải thiện hiển thị thông tin cập nhật trên màn hình nhỏ."
  ]
}
```

`releaseNotes` is intentionally retained as the flat compatibility fallback for older app versions. A legacy `latest.json` containing only `releaseNotes: string[]` remains valid. If no usable notes exist, the app uses its localized fallback note.

The dialog renders `releaseSummary` and non-empty `releaseNoteSections` when structured notes are available. It uses the flat `releaseNotes` list only when no usable structured section exists, avoiding duplicate content from the compatibility fallback.

## Phase 1-3 app update manual QA

- Android app opens normally when update check fails.
- No dialog appears when `latest.versionCode <= current.versionCode`.
- Dialog appears when `latest.versionCode > current.versionCode`.
- Release notes are displayed when present.
- A legacy manifest containing only `releaseNotes: string[]` is accepted and displays its flat bullets.
- A structured manifest containing `releaseSummary`, `releaseNoteSections`, and `releaseNotes` is accepted without crashing.
- The structured manifest displays its summary, section headings, item titles, descriptions, and impacts without duplicating `releaseNotes` fallback entries.
- Long release notes remain readable and do not hide the update actions on a small screen.
- A fallback release note is displayed when both structured notes and `releaseNotes` are missing or empty.
- Clicking outside the dialog does not close it.
- Escape does not close the dialog in web/development builds.
- Android Back does not close the dialog, navigate away, or exit the app.
- Optional updates require either `Cập nhật` or `Bỏ qua phiên bản này`.
- `Bỏ qua phiên bản này` closes an optional update and allows normal app use.
- Mandatory updates hide `Bỏ qua phiên bản này` and cannot be bypassed.
- Clicking “Cập nhật” calls `startAndroidUpdate()`.
- If the native plugin is unavailable, the app shows a clear fallback message and does not crash.
- The Settings button can manually check for an update.

Phase 1-3 intentionally does not download or install APKs in the browser. `startAndroidUpdate()` calls the native `AppUpdatePlugin.downloadAndInstallApk()` implementation on Android.

## Install unknown apps permission behavior

The app checks the `Install unknown apps` permission before starting a new APK download. If permission is missing, Android Settings is opened and the APK is not downloaded yet.

If a verified APK already exists in app cache, the app reuses it after permission is granted instead of downloading the same release again. The cached APK is still verified with SHA-256 and APK identity checks before the Android installer is opened.

## APK cache cleanup

Downloaded APK files are stored in the app internal cache under `cache/app-update/`.

The app does not delete an APK immediately after opening Android installer because the installer may still need to read the file through the FileProvider `content://` URI.

Instead, APK files older than 24 hours are cleaned up on later app startups and update attempts. Cleanup is canonical-path-safe and best-effort: it stays inside `cache/app-update/`, preserves the APK targeted by the current attempt, and does not block app startup or update checks when an entry cannot be deleted.

## Phase 4-6 native app update manual QA

1. Build the Android app successfully.
2. Confirm the app starts without crashing.
3. Call `AppUpdatePlugin.getCurrentVersion()` from the frontend.
4. Confirm `getCurrentVersion()` returns the real native `versionName` and `versionCode`.
5. Confirm `canInstallUnknownApps()` returns the current allowed state.
6. Confirm `downloadAndInstallApk()` rejects a missing `apkUrl` with `APP_UPDATE_INVALID_INPUT`.
7. Confirm `downloadAndInstallApk()` rejects a missing `expectedSha256` with `APP_UPDATE_INVALID_INPUT`.
8. With `Install unknown apps` disabled and no cached APK, confirm settings opens, the call rejects with `APP_UPDATE_INSTALL_PERMISSION_REQUIRED`, and no APK download starts.
9. Grant the permission, return to and unlock the app if needed, then retry the update.
10. Confirm a valid request streams the APK once to `cache/app-update/` and emits `appUpdateDownloadProgress` events.
11. With a valid APK already cached, retry and confirm the cached file is reused without another download.
12. With an invalid or wrong-SHA APK cached, confirm it is deleted and a fresh download starts only when install permission is granted.
13. Confirm a SHA-256 mismatch deletes the downloaded APK and never opens the installer.
14. Confirm an APK with an invalid package, version code, or pinned signer is deleted and never opens the installer.
15. Confirm a verified APK creates a FileProvider `content://` URI and opens the Android installer.
16. Confirm the APK is not deleted immediately and the installer can still read it.
17. Reopen the app with an unrelated APK older than 24 hours and confirm cleanup deletes it.
18. Confirm cleanup keeps a valid target APK, ignores non-file entries, and never deletes outside `cache/app-update/`.
19. Simulate cleanup failure and confirm it does not block startup or the update check.
20. Cancel the installer and confirm the app remains stable.

The plugin stores APKs only in app cache, verifies SHA-256 before installation, and uses `${applicationId}.fileprovider`; it never exposes a `file://` URI or writes the update to public Downloads.

Run these checks before merge:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx cap sync android
```

## Troubleshooting

Wrong keystore:
The Gradle release build fails during signing or install verification. Confirm `release-key.jks`, alias, store password, and key password belong together. Regenerate `ANDROID_KEYSTORE_BASE64` from the exact `release-key.jks` file.

versionCode does not increase:
Android rejects upgrades when `nativeVersionCode` is not greater than the installed or previously released APK. Increase `nativeVersionCode` in `version.config.json`, commit it, and tag again with the matching version name.

Tag does not match nativeVersionName:
The metadata step fails if tag `vX.Y.Z` does not match `nativeVersionName` `X.Y.Z`. Fix either the tag or `version.config.json` so they match exactly.

Missing secret:
The workflow stops early at `Validate Android signing secrets` and prints the missing secret name. Add the secret in repository settings and rerun the workflow.
