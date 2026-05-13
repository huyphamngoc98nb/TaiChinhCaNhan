import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';

const router = Router();
const MANIFEST_PATH = path.resolve(__dirname, '../../data/apk-manifest.json');

export interface ApkManifestEntry {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sha256: string;
  fileSize: number;
  releaseNotes: string;
  mandatory: boolean;
  minSupportedVersionCode: number;
}

interface ApkManifest {
  latest: ApkManifestEntry;
}

export interface ApkLatestResponse extends ApkManifestEntry {
  hasUpdate: true;
  forceUpdate: boolean;
}

interface NoApkUpdateResponse {
  hasUpdate: false;
}

function readManifest(): ApkManifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as ApkManifest;
}

function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function validateNativeVersionCode(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-native-version-code'];

  if (!header || typeof header !== 'string') {
    res.status(400).json({
      error: 'Missing required header: x-native-version-code',
      code: 'MISSING_HEADER',
    });
    return;
  }

  if (!isPositiveInteger(header)) {
    res.status(400).json({
      error: 'Invalid required header: x-native-version-code must be a positive integer',
      code: 'INVALID_HEADER',
    });
    return;
  }

  next();
}

function buildResponse(clientVersionCode: number, latest: ApkManifestEntry): ApkLatestResponse | NoApkUpdateResponse {
  if (clientVersionCode >= latest.versionCode) {
    return { hasUpdate: false };
  }

  return {
    hasUpdate: true,
    versionCode: latest.versionCode,
    versionName: latest.versionName,
    apkUrl: latest.apkUrl,
    sha256: latest.sha256,
    fileSize: latest.fileSize,
    releaseNotes: latest.releaseNotes,
    mandatory: latest.mandatory,
    minSupportedVersionCode: latest.minSupportedVersionCode,
    forceUpdate: latest.mandatory && clientVersionCode < latest.minSupportedVersionCode,
  };
}

router.get('/latest', validateNativeVersionCode, (req: Request, res: Response) => {
  try {
    const nativeVersionCode = Number(req.headers['x-native-version-code']);
    const manifest = readManifest();

    res.status(200).json(buildResponse(nativeVersionCode, manifest.latest));
  } catch (error) {
    console.error('[ApkUpdateAPI] Failed to read APK manifest', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'APK_MANIFEST_ERROR',
    });
  }
});

export default router;
