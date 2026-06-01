# Graph Report - TaiXiuCaNhan  (2026-06-01)

## Corpus Check
- 272 files · ~109,099 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1740 nodes · 5389 edges · 101 communities (90 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5711a2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 167 edges
2. `getDbConnection()` - 105 edges
3. `Wallet` - 60 edges
4. `useToast()` - 47 edges
5. `useCurrency()` - 44 edges
6. `Transaction` - 40 edges
7. `AppRepositories` - 39 edges
8. `AccountType` - 35 edges
9. `ROUTES` - 35 edges
10. `IWalletRepository` - 32 edges

## Surprising Connections (you probably didn't know these)
- `AppUnlock()` --calls--> `useLanguage()`  [EXTRACTED]
  src/app/providers/AppUnlock.tsx → src/shared/context/LanguageContext.tsx
- `runMigrations()` --calls--> `getDbConnection()`  [EXTRACTED]
  src/core/db/migrations/migration-runner.ts → src/core/db/sqlite/connection.ts
- `seedDefaultData()` --calls--> `getDbConnection()`  [EXTRACTED]
  src/core/db/seed/default-categories.ts → src/core/db/sqlite/connection.ts
- `readAutoBackupSettingValues()` --calls--> `getDbConnection()`  [EXTRACTED]
  src/modules/backup/services/auto-backup.service.ts → src/core/db/sqlite/connection.ts
- `upsertAppSetting()` --calls--> `getDbConnection()`  [EXTRACTED]
  src/modules/backup/services/auto-backup.service.ts → src/core/db/sqlite/connection.ts

## Import Cycles
- 2-file cycle: `src/core/telemetry/error-log.repository.ts -> src/core/telemetry/logger.ts -> src/core/telemetry/error-log.repository.ts`
- 3-file cycle: `src/core/db/sqlite/connection.ts -> src/core/telemetry/logger.ts -> src/core/telemetry/error-log.repository.ts -> src/core/db/sqlite/connection.ts`

## Communities (101 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (21): CategoryForm(), COLOR_PRESETS, Props, CATEGORY_ICON_LIBRARY_DEFINITIONS, CATEGORY_ICON_PRESET_DEFINITIONS, CategoryIcon(), CategoryIconPreset, CUSTOM_ICON_PRESETS (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (43): dateInputValue(), DateRangePicker(), endOfInputDate(), Props, startOfInputDate(), percentChange(), Props, ReportSummaryCards() (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (30): For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For native CLAUDE.md integration, For --update (incremental re-extraction) (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (10): mapToTransaction(), CreateTransactionInput, Transaction, TransactionFilter, UpdateTransactionInput, InMemoryTransactionRepository, matchesFilter(), AppRepositories (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (40): config, configFile, forbidOnly, fullyParallel, globalSetup, globalTeardown, globalTimeout, grep (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (16): AdvancedTransactionFilterSheet(), endOfLocalDay(), inputStyle, labelStyle, Props, startOfLocalDay(), toDateInputValue(), BottomSheet() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (35): BackupMetadata, BackupPayload, BackupRow, ValidationResult, importBackupJson(), readBackupFile(), LegacyRestorableBackupPayload, RestorableBackupPayload (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (6): explainReportQueries(), SQLiteTransactionRepository, SQLiteWalletRepository, ensureBalanceAdjustmentCategory(), getDbConnection(), isManagedTransactionActive()

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): Bug #10: Pixel 5 Layout and UX (iPhone X), Bug #11: Pixel 5 Layout and UX (Pixel 5), Bug #12: Pixel 5 Layout and UX (Tablet (iPad)), Bug #13: Tablet (iPad) Layout and UX (iPhone 12), Bug #14: Tablet (iPad) Layout and UX (iPhone X), Bug #15: Tablet (iPad) Layout and UX (Pixel 5), Bug #16: Tablet (iPad) Layout and UX (Tablet (iPad)), Bug #1: iPhone 12 Layout and UX (iPhone 12) (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (25): formatLastRunAt(), AUTO_BACKUP_INTERVAL_MS, AUTO_BACKUP_INTERVALS, AUTO_BACKUP_SETTING_KEYS, AutoBackupInterval, AutoBackupRunReason, AutoBackupRunResult, AutoBackupSettings (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (10): ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, formatDayMonth(), Props, WalletCard(), ACCOUNT_TYPES, COLOR_PRESETS, EMOJI_PRESETS (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): 1. Local Backup & Restore, 2. Human-Readable Exports, 3. Portability Limitations, Android Sync & Build, Current Implemented Scope, Data Portability (Phase 6), Expense Tracker App, Final Quality Assurance (Phase 6 Hardening) (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (56): formatDueDate(), fromDateInput(), isValidDateParts(), parseDueDate(), Props, startOfLocalDay(), toDateInput(), Props (+48 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): Bug #10: Pixel 5 Layout and UX (iPhone X), Bug #11: Pixel 5 Layout and UX (Pixel 5), Bug #12: Pixel 5 Layout and UX (Tablet (iPad)), Bug #13: Tablet (iPad) Layout and UX (iPhone 12), Bug #14: Tablet (iPad) Layout and UX (iPhone X), Bug #15: Tablet (iPad) Layout and UX (Pixel 5), Bug #16: Tablet (iPad) Layout and UX (Tablet (iPad)), Bug #1: iPhone 12 Layout and UX (iPhone 12) (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (21): dependencies, cors, express, description, devDependencies, ts-node-dev, @types/cors, @types/express (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (23): devDependencies, autoprefixer, @capacitor/cli, copyfiles, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (20): dependencies, @capacitor/android, @capacitor/app, @capacitor/camera, @capacitor-community/sqlite, @capacitor/core, @capacitor/filesystem, @capacitor/preferences (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (19): 1. Local Backup & Restore, 2. Human-Readable Exports, 3. Portability Limitations, Android Sync & Build, code:bash (npm install), code:bash (# On Windows PowerShell:), code:bash (npm run dev), code:bash (npm run build) (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.21
Nodes (9): Category, CategoryInput, CategoryReferenceCounts, mapCategory(), SQLiteCategoryRepository, CategoryService, generateId(), normalizeInput() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (12): ErrorScreen(), ErrorScreenProps, useKeyboardSafeFocus(), AppProvider(), GlobalErrorBoundary, GlobalErrorBoundaryProps, GlobalErrorBoundaryState, router (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (46): CashflowBarChart(), Props, CurrencyAmountInputProps, formatAmountInput(), getFractionDigits(), normalizeAmountInput(), CurrencySettings(), DonutItem (+38 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (12): ActivityCallback, ActivityResult, PluginCall, PluginMethod, String, PluginCall, PluginMethod, String (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (16): biometricAuth, biometricSubTitle, biometricTitle, appId, appName, androidBiometric, androidIsEncryption, iosBiometric (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (19): sqliteTransactionRunner(), StoredStatement, UseWalletsReturn, createSQLiteRepositories(), generateId(), mapWallet(), CreateWalletInput, IWalletRepository (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (23): ENV, buildErrorLogExportPayload(), ErrorLogExportItem, ErrorLogExportPayload, exportErrorLogsToJson(), parseMetadata(), isDatabaseReady(), countCategories() (+15 more)

### Community 29 - "Community 29"
Cohesion: 0.26
Nodes (12): CreditCardStatementStatus, addDays(), addMonths(), buildDueDate(), clampedDate(), CreditCardStatementPeriod, daysInMonth(), getCreditCardStatementPeriod() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (22): EmptyBudgetPrompt(), Props, Language, NestedKeyOf, TranslationKey, TranslationPath, translations, LanguageContext (+14 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.26
Nodes (10): documentSaver, DocumentSaverPlugin, SaveTextFileOptions, SaveTextFileResult, SaveTextFileToDownloadsOptions, saveAutoBackupFile(), downloadInBrowser(), saveBackupFile() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (13): forceAppUnlock(), resumeAppLock(), suspendAppLock(), appListeners, authServiceMock, autoBackupMock, capacitorMock, emitAppStateChange() (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (9): Application Architecture, Code Graph, code:mermaid (flowchart TB), code:mermaid (flowchart LR), code:mermaid (flowchart TB), code:mermaid (flowchart LR), Navigation Routes, Reports Data Flow (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (8): exclude, extractDocstrings, frameworks, include, languages, maxFileSize, trackCallSites, version

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (8): code:text (src/), code:ts (import { create } from 'zustand';), Current App Position, Decision, Example Pattern, Proposed Folder Shape, Shared State Strategy, When to Introduce Zustand

### Community 38 - "Community 38"
Cohesion: 0.26
Nodes (9): LoadingScreen(), ACTIVITY_EVENTS, AppBootstrap(), AppBootstrapProps, DEFAULT_CATEGORIES, DefaultCategory, DefaultCategoryType, insertDefaultCategories() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (18): createCreditCardPaymentUseCase, createTransactionUseCase, deleteTransactionUseCase, listTransactionsUseCase, updateTransactionUseCase, clearStoredCreateTransactionState(), CreateTransactionFormValues, getCreateTransactionInitialValues() (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, postinstall, preview, test, test:ui (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (17): immediateTransactionRunner(), TransactionRunner, createSampleTransactions(), TransactionValidationError, validateCreateTransaction(), validateUpdateTransaction(), CreateCreditCardPaymentInput, CreateTransactionUseCase (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (12): asOf, closedStatementAsOf, creditCard, firstStatement, overdueAsOf, period, repo, statement (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.39
Nodes (6): name, overrides, sql.js, private, type, version

### Community 46 - "Community 46"
Cohesion: 0.48
Nodes (4): MainActivity, BridgeActivity, Bundle, Override

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (5): Current State, Local SQLite Encryption, Remaining Security Work, Secret Handling, Security Notes

### Community 48 - "Community 48"
Cohesion: 0.05
Nodes (71): BudgetAddSheet(), Props, BudgetAlertsPanel(), Props, ACCOUNT_TYPE_ICONS, BudgetByAccountTypeSummary(), Props, STATUS_COLORS (+63 more)

### Community 49 - "Community 49"
Cohesion: 0.48
Nodes (5): bundleVersion, _comment, minNativeVersionCodeForBundle, nativeVersionCode, nativeVersionName

### Community 52 - "Community 52"
Cohesion: 0.16
Nodes (18): columnExists(), executeMigrationStatement(), markMigrationDone(), MIGRATIONS, parseAddColumnStatement(), runMigrations(), splitSqlStatements(), categoryInserts (+10 more)

### Community 73 - "Community 73"
Cohesion: 0.06
Nodes (66): BackButton(), BackButtonProps, BiometricUnlockSettings(), BudgetEditSheet(), DatabaseDiagnostics(), LanguageSettings(), RecurringBillForm(), RecurringBillList() (+58 more)

### Community 76 - "Community 76"
Cohesion: 0.31
Nodes (7): code:block1 (Error: expect(locator).toBeVisible() failed), code:yaml (- main:), code:ts (63  |), Error details, Instructions, Test info, Test source

### Community 78 - "Community 78"
Cohesion: 0.44
Nodes (7): applyKeyboardScrollPadding(), getKeyboardScrollContainer(), getScrollableParent(), isEditableElement(), restoreScrollPadding(), scrollElementIntoKeyboardSafeView(), ScrollPaddingState

### Community 79 - "Community 79"
Cohesion: 0.39
Nodes (3): Wallet, CreditCardService, CreditCardSummary

### Community 83 - "Community 83"
Cohesion: 0.07
Nodes (26): Props, ReceiptCapture(), Props, TransactionType, ReceiptStorageService, UpdateTransactionUseCase, createUseCase, deleteUseCase (+18 more)

### Community 85 - "Community 85"
Cohesion: 0.08
Nodes (31): AuthResult, AuthService, BIOMETRIC_UNLOCK_SUPPORTED_PLATFORMS, BiometricAuthEvent, BiometricListenerPlugin, isAndroidPlatform(), isBiometricUnlockSupportedPlatform(), isNativePlatform() (+23 more)

### Community 86 - "Community 86"
Cohesion: 0.60
Nodes (3): determineSeverity(), generateReport(), PlaywrightResult

### Community 90 - "Community 90"
Cohesion: 0.23
Nodes (9): ACCOUNT_TYPE_ORDER, Props, CurrencyProvider(), AccountType, filterActiveWallets(), hasWalletValue(), isActiveWallet(), renderWalletList() (+1 more)

## Knowledge Gaps
- **384 isolated node(s):** `iosDatabaseLocation`, `iosIsEncryption`, `iosKeychainPrefix`, `biometricAuth`, `biometricTitle` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Community 73` to `Community 0`, `Community 1`, `Community 5`, `Community 40`, `Community 10`, `Community 11`, `Community 13`, `Community 48`, `Community 83`, `Community 85`, `Community 22`, `Community 24`, `Community 90`, `Community 30`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `getDbConnection()` connect `Community 8` to `Community 1`, `Community 3`, `Community 38`, `Community 6`, `Community 40`, `Community 10`, `Community 13`, `Community 48`, `Community 83`, `Community 52`, `Community 85`, `Community 22`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Wallet` connect `Community 79` to `Community 3`, `Community 5`, `Community 8`, `Community 73`, `Community 11`, `Community 43`, `Community 13`, `Community 44`, `Community 83`, `Community 21`, `Community 90`, `Community 27`, `Community 29`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `iosDatabaseLocation`, `iosIsEncryption`, `iosKeychainPrefix` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07290886392009988 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05110336817653891 - nodes in this community are weakly interconnected._