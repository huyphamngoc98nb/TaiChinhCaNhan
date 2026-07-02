export type AppUpdateReleaseNoteSectionType =
  | 'new_features'
  | 'improvements'
  | 'bug_fixes'
  | 'security'
  | 'data_migration'
  | 'known_issues'
  | 'user_action_required'
  | 'other';

export type AppUpdateReleaseNoteItem = {
  title: string;
  description?: string;
  impact?: string;
};

export type AppUpdateReleaseNoteSection = {
  type: AppUpdateReleaseNoteSectionType;
  title: string;
  items: AppUpdateReleaseNoteItem[];
};

export type AndroidLatestRelease = {
  platform: 'android';
  versionName: string;
  versionCode: number;
  minSupportedVersionCode?: number;
  mandatory?: boolean;
  apkUrl: string;
  sha256: string;
  releaseDate?: string;
  releaseNotesVersion?: number;
  releaseSummary?: string;
  releaseNoteSections?: AppUpdateReleaseNoteSection[];
  releaseNotes?: string[];
};

export type AndroidCurrentVersion = {
  versionName?: string;
  versionCode: number;
};

export type CurrentAndroidVersion = {
  versionName: string;
  versionCode: number;
};

export type AppUpdateCheckResult =
  | {
      status: 'update_available';
      latest: AndroidLatestRelease;
      currentVersionCode: number;
      mandatory: boolean;
    }
  | {
      status: 'up_to_date';
      latest: AndroidLatestRelease;
      currentVersionCode: number;
    }
  | {
      status: 'unsupported_platform';
    }
  | {
      status: 'error';
      message: string;
      cause?: unknown;
    };

export type AppUpdateDownloadOptions = {
  apkUrl: string;
  expectedSha256: string;
  fileName?: string;
};

export type AppUpdateDownloadResult = {
  status: 'installer_opened';
};

export type AppUpdateCacheCleanupOptions = {
  maxAgeHours?: number;
  keepFileName?: string;
};

export type AppUpdateCacheCleanupResult = {
  deletedCount: number;
};

export type InstallUnknownAppsPermission = {
  allowed: boolean;
};

export type AppUpdateDownloadProgress = {
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
};

export type UpdateInstallState =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'opening_installer'
  | 'permission_required'
  | 'error'
  | 'installer_opened';

export type AppUpdateNativeErrorCode =
  | 'APP_UPDATE_INVALID_INPUT'
  | 'APP_UPDATE_DOWNLOAD_FAILED'
  | 'APP_UPDATE_SHA256_MISMATCH'
  | 'APP_UPDATE_FILE_PROVIDER_FAILED'
  | 'APP_UPDATE_INSTALL_PERMISSION_REQUIRED'
  | 'APP_UPDATE_INSTALL_INTENT_FAILED'
  | 'APP_UPDATE_UNKNOWN_ERROR';

export type StartAndroidUpdateOptions = AppUpdateDownloadOptions;
