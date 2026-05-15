# Security Notes

## Local SQLite Encryption

The app currently opens the local database without encryption. The decision is explicit in
`src/core/db/sqlite/encryption.ts` and is used by `initDatabaseConnection`.

This is acceptable for a local-first personal finance app only when the threat model is limited to
normal app sandboxing. If the database may contain sensitive data, enable SQLCipher-backed native
encryption before release.

### Current State

- Native Android/iOS: supported by `@capacitor-community/sqlite`, but disabled in this app.
- Web: `jeep-sqlite` stores data in IndexedDB and does not support opening encrypted databases in
  the same way as native.
- Backup JSON: exported backups are plaintext. SQLCipher protects the local database file only; it
  does not encrypt exported JSON backups.

### Required Work Before Enabling

1. Define key ownership: user passphrase, device-keystore secret, or biometric-gated secret.
2. Store or derive the key outside the SQLite database.
3. Add a migration path from existing unencrypted databases to encrypted databases.
4. Add recovery UX for forgotten passphrases if using user-managed keys.
5. Encrypt or warn about exported backup files separately.
6. Test fresh install, app upgrade, restore, biometric failure, and secret rotation.

### Implementation Hook

Use `SQLITE_ENCRYPTION_CONFIG` as the single application switch:

```ts
export const SQLITE_ENCRYPTION_CONFIG = {
  encrypted: true,
  mode: 'secret',
  requiresNativeSecret: true,
};
```

Before changing that switch, initialize the native plugin encryption secret and configure Capacitor
SQLite encryption settings in `capacitor.config.ts`.
