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
- Manual backup export: encryption is enabled by default and uses a user-provided password with
  PBKDF2-SHA-256 and AES-GCM. AES-GCM detects a wrong password or a modified backup file.
- SQLCipher protects the local database file only. Encrypted backup export separately protects the
  exported file.
- Plaintext manual exports remain available for compatibility, and automatic backups are still
  plaintext. Anyone with access to those files can read their contents.

### Secret Handling

- The encryption passphrase is never hardcoded.
- The user-entered PIN is passed to `setEncryptionSecret()` on first native setup.
- Existing installs use `checkEncryptionSecret()` before the DB is opened.
- First launch includes a two-step setup and confirm PIN flow. The PIN must contain at least six
  digits.
- Users can change the native PIN. The app verifies the current PIN, calls the SQLite plugin's
  `changeEncryptionSecret()` rekey API, reopens the database connection, and disables biometric
  unlock until it is enabled again.
- The SQLite plugin stores the secret in native secure storage. On Android this is backed by
  encrypted preferences / Keystore-backed primitives inside the plugin; on iOS it uses Keychain
  configuration from Capacitor SQLite.
- The app does not persist the PIN in app code or local storage.
- Backup passwords are not stored in `app_settings` or elsewhere by the app. Losing a backup
  password makes that encrypted backup unrecoverable.

### PIN Recovery And Local Reset

- A forgotten PIN cannot be viewed, recovered, or bypassed.
- The unlock screen and Security settings offer an explicit local reset flow. Reset requires an
  acknowledgement checkbox and typing `RESET`.
- Reset closes the SQLite connection, deletes the local database, clears the native encryption
  secret, and disables biometric unlock. It only reports success when every required step succeeds.
- Exported backup files are outside app-local database storage and are not deleted by reset.
- Losing the PIN without a usable backup can permanently lose access to encrypted local data.
- On Web, data is stored through IndexedDB/jeep-sqlite without native SQLCipher PIN protection.

### Remaining Security Work

1. Add a secure password-management design before encrypting automatic backups.
2. Test fresh install, app upgrade from unencrypted DB, encrypted/plaintext restore, biometric failure, local reset, and secret rotation on real devices.
