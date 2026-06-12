import { BackupPayload, EncryptedBackupEnvelope } from '../domain/backup.model';

const ENCRYPTED_BACKUP_FORMAT = 'expense-tracker-encrypted-backup';
const ENCRYPTED_BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 300_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export class BackupDecryptionError extends Error {
  constructor() {
    super('Unable to decrypt backup');
    this.name = 'BackupDecryptionError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function authenticatedHeader(envelope: Pick<EncryptedBackupEnvelope, 'metadata' | 'encryption'>): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(JSON.stringify({
    metadata: envelope.metadata,
    encryption: envelope.encryption,
  })));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isEncryptedBackupEnvelope(value: unknown): value is EncryptedBackupEnvelope {
  if (!isPlainObject(value) || !isPlainObject(value.metadata) || !isPlainObject(value.encryption)) {
    return false;
  }

  const encryption = value.encryption;
  return (
    encryption.format === ENCRYPTED_BACKUP_FORMAT &&
    encryption.version === ENCRYPTED_BACKUP_VERSION &&
    encryption.algorithm === 'AES-GCM' &&
    encryption.kdf === 'PBKDF2' &&
    encryption.hash === 'SHA-256' &&
    typeof encryption.iterations === 'number' &&
    encryption.iterations >= 250_000 &&
    encryption.iterations <= 310_000 &&
    typeof encryption.salt === 'string' &&
    typeof encryption.iv === 'string' &&
    typeof value.ciphertext === 'string'
  );
}

export async function encryptBackupPayload(
  payload: BackupPayload,
  password: string,
): Promise<EncryptedBackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryption: EncryptedBackupEnvelope['encryption'] = {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
  const header = { metadata: payload.metadata, encryption };
  const key = await deriveKey(password, salt, encryption.iterations);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: authenticatedHeader(header),
    },
    key,
      toArrayBuffer(new TextEncoder().encode(JSON.stringify(payload))),
  );

  return {
    ...header,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackupEnvelope(
  envelope: EncryptedBackupEnvelope,
  password: string,
): Promise<unknown> {
  try {
    if (!isEncryptedBackupEnvelope(envelope)) throw new Error('Invalid encrypted backup envelope');

    const salt = base64ToBytes(envelope.encryption.salt);
    const iv = base64ToBytes(envelope.encryption.iv);
    if (salt.byteLength !== SALT_LENGTH || iv.byteLength !== IV_LENGTH) {
      throw new Error('Invalid encrypted backup parameters');
    }

    const key = await deriveKey(password, salt, envelope.encryption.iterations);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
        additionalData: authenticatedHeader(envelope),
      },
      key,
      toArrayBuffer(base64ToBytes(envelope.ciphertext)),
    );

    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new BackupDecryptionError();
  }
}
