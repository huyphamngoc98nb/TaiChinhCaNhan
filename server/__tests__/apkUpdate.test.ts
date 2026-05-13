import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apkUpdateRouter from '../src/routes/apkUpdate';

const readFileSyncMock = vi.hoisted(() => vi.fn());

vi.mock('fs', () => ({
  default: {
    readFileSync: readFileSyncMock,
  },
  readFileSync: readFileSyncMock,
}));

interface ApkManifestEntry {
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

const DEFAULT_MANIFEST: ApkManifest = {
  latest: {
    versionCode: 200,
    versionName: '0.2.0',
    apkUrl: 'https://cdn.example.com/apk/0.2.0.apk',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    fileSize: 15728640,
    releaseNotes: 'Thêm Bluetooth plugin',
    mandatory: true,
    minSupportedVersionCode: 100,
  },
};

let server: Server | undefined;
let baseUrl = '';

function mockManifest(manifest: ApkManifest): void {
  readFileSyncMock.mockReturnValue(JSON.stringify(manifest));
}

async function startServer(): Promise<void> {
  const app = express();
  app.use('/api/updates/apk', apkUpdateRouter);

  server = await new Promise<Server>(resolve => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function getLatest(versionCode?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (versionCode !== undefined) {
    headers['x-native-version-code'] = versionCode;
  }

  return fetch(`${baseUrl}/api/updates/apk/latest`, { headers });
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockManifest(DEFAULT_MANIFEST);
  await startServer();
});

afterEach(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  server = undefined;
});

describe('GET /api/updates/apk/latest', () => {
  it('T1 returns latest APK metadata when client versionCode is older', async () => {
    const response = await getLatest('100');
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.hasUpdate).toBe(true);
    expect(body.versionCode).toBe(200);
    expect(body.versionName).toBe('0.2.0');
    expect(body.apkUrl).toBe('https://cdn.example.com/apk/0.2.0.apk');
    expect(body.sha256).toBe(DEFAULT_MANIFEST.latest.sha256);
    expect(body.fileSize).toBe(15728640);
    expect(body.releaseNotes).toBe('Thêm Bluetooth plugin');
    expect(body.mandatory).toBe(true);
  });

  it('T2 returns hasUpdate false when client versionCode equals latest', async () => {
    const response = await getLatest('200');
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ hasUpdate: false });
  });

  it('T3 returns hasUpdate false when client versionCode is newer than manifest', async () => {
    const response = await getLatest('300');
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ hasUpdate: false });
  });

  it('T4 returns 400 when x-native-version-code header is missing', async () => {
    const response = await getLatest();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(String(body.error)).toContain('x-native-version-code');
  });

  it('T5 returns 400 when x-native-version-code is not a number', async () => {
    const response = await getLatest('abc');
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(String(body.error)).toContain('x-native-version-code');
  });

  it('T6 returns forceUpdate true when mandatory and client is below minSupportedVersionCode', async () => {
    mockManifest({
      latest: {
        ...DEFAULT_MANIFEST.latest,
        mandatory: true,
        minSupportedVersionCode: 150,
      },
    });

    const response = await getLatest('100');
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.hasUpdate).toBe(true);
    expect(body.forceUpdate).toBe(true);
  });
});
