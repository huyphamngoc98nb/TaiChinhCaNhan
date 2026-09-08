import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepositoryFile = (...segments) => readFileSync(join(process.cwd(), ...segments), 'utf8');

describe('Docker development environment', () => {
  const nodeVersion = readRepositoryFile('.nvmrc').trim();
  const dockerfile = readRepositoryFile('Dockerfile.dev');
  const compose = readRepositoryFile('compose.dev.yaml');
  const releaseWorkflow = readRepositoryFile('.github', 'workflows', 'android-release.yml');

  it('uses the same pinned Node major locally, in Docker, and in Android CI', () => {
    expect(nodeVersion).toMatch(/^\d+$/);
    expect(dockerfile).toContain(`FROM node:${nodeVersion}-bookworm-slim`);
    expect(releaseWorkflow).toContain("node-version-file: '.nvmrc'");
    expect(releaseWorkflow).not.toContain("node-version: 'lts/*'");
  });

  it('exposes Vite only on localhost and enables Compose Watch', () => {
    expect(dockerfile).toContain('"--host", "0.0.0.0"');
    expect(compose).toContain('127.0.0.1:${DEV_PORT:-5173}:5173');
    expect(compose).toContain('action: sync');
    expect(compose).toContain('action: rebuild');
    expect(compose).toContain("CHOKIDAR_USEPOLLING: 'true'");
  });

  it('does not copy local Android signing material into the image', () => {
    const dockerIgnore = readRepositoryFile('.dockerignore');

    expect(dockerIgnore).toContain('.env');
    expect(dockerIgnore).toContain('android/keystore.properties');
    expect(dockerIgnore).toContain('android/app/google-services.json');
    expect(dockerIgnore).toContain('*.jks');
    expect(dockerIgnore).toContain('*.keystore');
  });
});
