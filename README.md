# Expense Tracker App

A local-first, offline-ready expense tracker packaged for Android using Capacitor.

## Project Structure

This project follows a domain-driven architecture:
- `src/app/`: Application shell, providers, layouts, and routing.
- `src/shared/`: Shared UI components, global constants, and utility functions.
- `src/core/`: Infrastructure code (e.g., telemetry logger, DB configurations).
- `src/modules/`: Business domains (e.g., transactions, settings, categories). Each module encapsulates its own UI, state, and domain logic.
- `src/tests/`: Global test configuration.

## Current Implemented Scope
- **Phase 1 Bootstrap & Refinement**
  - React + Vite + TypeScript initialized.
  - Prettier and ESLint configured.
  - Capacitor initialized with Android platform.
  - App folder structure scaffolded.
  - Basic minimal bottom navigation layout (`MainLayout`).
  - App bootstrap mock sequence with Loading and Error states.
  - Basic shared UI components (`LoadingScreen`, `ErrorScreen`, `EmptyState`).
  - Telemetry logger and environment configuration boilerplate.

## Local Development & Run Commands

**1. Install dependencies:**
```bash
npm install
```

**2. Setup SQLite for Web Development (Required for local dev):**
Because `@capacitor-community/sqlite` uses `jeep-sqlite` on the web, you must copy the WebAssembly file into your public directory so the browser can load it.
```bash
# On Windows PowerShell:
New-Item -ItemType Directory -Force -Path "public/assets"
Copy-Item "node_modules/sql.js/dist/sql-wasm.wasm" -Destination "public/assets/sql-wasm.wasm"
```

**3. Run Development Server:**
```bash
npm run dev
```

## Android Sync & Build

To package your app for Android, build the web assets first, then sync Capacitor:

**1. Build Web Bundle:**
```bash
npm run build
```

**2. Sync with Capacitor:**
```bash
npx cap sync android
```

**3. Open Android Studio:**
```bash
npx cap open android
```

## How to Verify SQLite is Working

1. Start the app locally using `npm run dev` (ensure you copied the `.wasm` file first).
2. The app should display "Loading..." briefly, then navigate to the Home screen.
3. Open the **Settings** tab.
4. You will see a **Developer Diagnostics** card at the bottom.
5. It should display **DB Initialized: ✅ Yes**, show the current Schema Version (e.g. 2), show the seeded category count (6), and indicate that all required tables were **✅ Found**.
6. If it fails, check your browser console for Jeep SQLite WebAssembly errors.

## Data Portability (Phase 6)

The application provides robust tools to ensure your data is never locked in.

### 1. Local Backup & Restore
- **Format**: `.json` (Portable JSON)
- **Scope**: Entire database (wallets, categories, transactions, recurring bills, app settings).
- **Location**: Settings -> Backup & Restore.
- **Policy**: Transactional "Wipe-and-Reload". Restoring overwrites current local data.

### 2. Human-Readable Exports
- **PDF Report**: A formatted financial summary including cashflow totals, category distribution, and a detailed transaction log.
- **Excel (CSV)**: A flat-file spreadsheet of raw transactions for custom analysis in Excel, Google Sheets, or Numbers.
- **Location**: Reports -> Export.

### 3. Portability Limitations
- **Receipt Images**: Backup files include **metadata only** (file paths). Physical receipt image files are stored in the device's private storage and are **not** bundled in the JSON backup. 
- **Migration**: If moving to a new device, you must manually transfer the images from the app's internal folder if you wish to maintain link integrity.

---

## Final Quality Assurance (Phase 6 Hardening)

Before releasing a production build, verify the following:

- [ ] **Initialization**: Diagnostics in Settings show ✅ for all tables and schema v6.
- [ ] **Transactions**: Add/Edit/Delete works with toast feedback and confirm dialogs.
- [ ] **Budgets**: Threshold alerts trigger correctly on the Dashboard.
- [ ] **Bills**: Recurring bill reminders appear at the top of the Dashboard; "Paid" advances the date.
- [ ] **Language**: UI switches instantly between English and Vietnamese.
- [ ] **Backup**: Exported JSON contains valid data; Import restores it exactly.
- [ ] **Export**: PDF and CSV files are generated and shareable on the device.

---

> [!WARNING]
> Database restore is a destructive operation. Always export a fresh backup before performing a restore.

## Security

The local SQLite database is currently opened without encryption. See `docs/security.md` for the
SQLCipher decision record and the work required before enabling encrypted native storage.

## Shared State

The app uses SQLite as the domain source of truth, feature hooks for async view state, and React
Context only for provider-shaped UI concerns. Zustand is the preferred next step for cross-route
client state when the app needs it, but should not duplicate SQLite rows in memory. See
`docs/state-management.md`.
