# Security Notes

## Local SQLite Encryption

The app opens native SQLite databases with SQLCipher enabled. The decision is explicit in
`src/core/db/sqlite/encryption.ts` and is used by `initDatabaseConnection`.

The app must authenticate the user before opening the database connection. `AppBootstrap` renders
`AppUnlock` first, then initializes SQLite only after `AuthService.unlockWithPin()` succeeds.

### Current State

- Native Android/iOS: SQLCipher is enabled through `@capacitor-community/sqlite`.
- Web: `jeep-sqlite` stores data in IndexedDB and does not support opening encrypted databases in
  the same way as native.
- Backup JSON: exported backups are plaintext. SQLCipher protects the local database file only; it
  does not encrypt exported JSON backups.

### Secret Handling

- The encryption passphrase is never hardcoded.
- The user-entered PIN is passed to `setEncryptionSecret()` on first native setup.
- Existing installs use `checkEncryptionSecret()` before the DB is opened.
- The SQLite plugin stores the secret in native secure storage. On Android this is backed by
  encrypted preferences / Keystore-backed primitives inside the plugin; on iOS it uses Keychain
  configuration from Capacitor SQLite.
- The app does not persist the PIN in app code or local storage.

### Remaining Security Work

1. Add formal PIN setup / confirm PIN UX for first launch.
2. Add recovery UX. Losing the PIN can make encrypted data unrecoverable.
3. Add explicit backup encryption or warning. Backup JSON remains plaintext.
4. Test fresh install, app upgrade from unencrypted DB, restore, biometric failure, and secret rotation on real devices.
