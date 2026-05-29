# Graph Report - TaiXiuCaNhan  (2026-05-29)

## Corpus Check
- 267 files · ~101,048 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1367 nodes · 3164 edges · 102 communities (94 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 111 edges
2. `getDbConnection()` - 84 edges
3. `Wallet` - 40 edges
4. `useToast()` - 31 edges
5. `useCurrency()` - 29 edges
6. `Transaction` - 28 edges
7. `config` - 24 edges
8. `InMemoryWalletRepository` - 24 edges
9. `AppRepositories` - 22 edges
10. `AccountType` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ReportsPage()` --calls--> `percentChange()`  [EXTRACTED]
  src/modules/reports/pages/ReportsPage.tsx → src/modules/reports/components/ReportSummaryCards.tsx
- `Props` --references--> `Transaction`  [EXTRACTED]
  src/modules/transactions/components/TransactionList.tsx → src/modules/transactions/domain/transaction.model.ts
- `WeekSummaryRow` --references--> `Transaction`  [EXTRACTED]
  src/modules/transactions/components/TransactionList.tsx → src/modules/transactions/domain/transaction.model.ts
- `Probe()` --calls--> `useLanguage()`  [EXTRACTED]
  src/tests/language-context.test.tsx → src/shared/context/LanguageContext.tsx
- `MainLayout()` --calls--> `useLanguage()`  [EXTRACTED]
  src/app/layouts/MainLayout.tsx → src/shared/context/LanguageContext.tsx

## Communities (102 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (32): AdvancedTransactionFilterSheet(), inputStyle, labelStyle, Props, toDateInputValue(), CategoryForm(), COLOR_PRESETS, Props (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (43): Props, dateInputValue(), DateRangePicker(), Props, percentChange(), Props, ReportSummaryCards(), dumpReportData() (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (12): STATUS_COLORS, DueStatus, classifyDueStatus(), daysDiff(), startOfDay(), due, future, next (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (4): IBudgetRepository, CalculateBudgetProgressUseCase, GetBudgetSettingsUseCase, ListBudgetAlertsUseCase

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (40): config, configFile, forbidOnly, fullyParallel, globalSetup, globalTeardown, globalTimeout, grep (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (12): ACCOUNT_TYPE_ICONS, BudgetByAccountTypeSummary(), STATUS_COLORS, BudgetSummaryStats(), Props, StatCardProps, useBudgetAddForm(), useBudgetEditForm() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (18): ACCOUNT_TYPES, ACTIVE_FLAGS, BACKUP_SCHEMAS, BILL_FREQUENCIES, BUDGET_PERIODS, CATEGORY_TYPES, FieldRule, FieldType (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (13): AuthResult, BIOMETRIC_UNLOCK_SUPPORTED_PLATFORMS, BiometricAuthEvent, BiometricListenerPlugin, isNativePlatform(), nativeBiometric, NativeBiometricAuthResult, NativeBiometricAvailability (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (7): explainReportQueries(), generateId(), mapWallet(), SQLiteWalletRepository, ensureBalanceAdjustmentCategory(), getDbConnection(), isManagedTransactionActive()

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (12): createUseCase, deleteUseCase, FailingTransactionRepository, input, invalidInput, oldTx, paymentUseCase, transactionRepository (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (12): Props, ReceiptCapture(), validateUpdateTransaction(), ReceiptStorageService, UpdateTransactionUseCase, createUseCase, existingNoReceipt, existingWithReceipt (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (5): Props, Props, Transaction, InMemoryTransactionRepository, SQLiteTransactionRepository

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (13): DEFAULT_CATEGORIES, DefaultCategory, DefaultCategoryType, insertDefaultCategories(), seedDefaultData(), categoryInserts, dbError, insertedCategoryIds (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (12): Props, STATUS_CONFIG, RecurringBillReminder, BUDGET_STATUS_ORDER, buildDashboardViewModel(), DashboardViewModel, DashboardViewModelInput, formatVND() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (6): createCreditCardPaymentUseCase, createTransactionUseCase, listTransactionsUseCase, updateTransactionUseCase, TransactionSummary, CreateCreditCardPaymentUseCase

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): Bug #10: Pixel 5 Layout and UX (iPhone X), Bug #11: Pixel 5 Layout and UX (Pixel 5), Bug #12: Pixel 5 Layout and UX (Tablet (iPad)), Bug #13: Tablet (iPad) Layout and UX (iPhone 12), Bug #14: Tablet (iPad) Layout and UX (iPhone X), Bug #15: Tablet (iPad) Layout and UX (Pixel 5), Bug #16: Tablet (iPad) Layout and UX (Tablet (iPad)), Bug #1: iPhone 12 Layout and UX (iPhone 12) (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.09
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

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (31): BackButton(), BackButtonProps, BottomSheet(), Props, CategoryList(), RecurringBillForm(), RecurringBillList(), TransactionForm() (+23 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (15): BudgetCategoryItem(), BudgetCategoryList(), EditableCategoryBudget, SCOPE_ORDER, BudgetScopeBadge(), Props, BudgetStatusBadge(), Props (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (6): ENV, Logger, LogOptions, normalizeError(), normalizeMetadata(), toSafeLogValue()

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (9): DonutItem, normalizeDonutData(), NormalizeDonutDataOptions, RawDonutItem, DonutCenterLabelProps, DonutLegendProps, ReportDonutCardProps, colors (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (12): ActivityCallback, ActivityResult, PluginCall, PluginMethod, String, PluginCall, PluginMethod, String (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (16): biometricAuth, biometricSubTitle, biometricTitle, appId, appName, androidBiometric, androidIsEncryption, iosBiometric (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (7): isDatabaseReady(), canUseLocalStorage(), ErrorLogRepository, generateId(), readPendingLogs(), writePendingLogs(), StructuredLogEntry

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmDialog(), ConfirmDialogProps

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (22): CreditCardStatementStatus, addDays(), addMonths(), buildDueDate(), clampedDate(), CreditCardStatementPeriod, daysInMonth(), getCreditCardStatementPeriod() (+14 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (7): ErrorScreen(), ErrorScreenProps, LoadingScreen(), ACTIVITY_EVENTS, AppBootstrapProps, GlobalErrorBoundaryProps, GlobalErrorBoundaryState

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (10): TransactionRunner, buildExportDatasetUseCase, AppRepositories, ITransactionRepository, IWalletRepository, UpsertCreditCardStatementInput, WalletReferenceCounts, CreateCreditCardPaymentInput (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.20
Nodes (9): Application Architecture, Code Graph, code:mermaid (flowchart TB), code:mermaid (flowchart LR), code:mermaid (flowchart TB), code:mermaid (flowchart LR), Navigation Routes, Reports Data Flow (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (8): exclude, extractDocstrings, frameworks, include, languages, maxFileSize, trackCallSites, version

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (8): code:text (src/), code:ts (import { create } from 'zustand';), Current App Position, Decision, Example Pattern, Proposed Folder Shape, Shared State Strategy, When to Introduce Zustand

### Community 38 - "Community 38"
Cohesion: 0.46
Nodes (7): columnExists(), executeMigrationStatement(), markMigrationDone(), MIGRATIONS, parseAddColumnStatement(), runMigrations(), splitSqlStatements()

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (13): ConfirmProvider(), applyKeyboardScrollPadding(), getKeyboardScrollContainer(), getScrollableParent(), restoreScrollPadding(), scrollElementIntoKeyboardSafeView(), ScrollPaddingState, useKeyboardSafeFocus() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (26): LocalizedCategoryIconPreset, Language, NestedKeyOf, TranslationKey, TranslationPath, translations, LanguageContextType, buildTimestamp() (+18 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, postinstall, preview, test, test:ui (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (7): ensureWebStoreInitialized(), initDatabaseConnection(), getSQLiteEncryptionConfig(), SQLITE_ENCRYPTION_CONFIG, SQLiteEncryptionConfig, SQLiteEncryptionMode, applyPragmas()

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (11): ACCOUNT_TYPE_LABELS, formatDayMonth(), Props, WalletCard(), ACCOUNT_TYPE_ORDER, Props, useCreditCardSummary(), Wallet (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (6): name, overrides, sql.js, private, type, version

### Community 46 - "Community 46"
Cohesion: 0.47
Nodes (4): MainActivity, BridgeActivity, Bundle, Override

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): Current State, Local SQLite Encryption, Remaining Security Work, Secret Handling, Security Notes

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (5): Budget, BudgetWithCategory, CreateBudgetDto, generateId(), SQLiteBudgetRepository

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): bundleVersion, _comment, minNativeVersionCodeForBundle, nativeVersionCode, nativeVersionName

### Community 52 - "Community 52"
Cohesion: 0.24
Nodes (18): Props, Props, Props, ALL_ACCOUNT_TYPES, BudgetScopePicker(), Props, DropdownList(), ACCOUNT_TYPE_LABELS (+10 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (24): BiometricUnlockSettings(), BudgetAddSheet(), BudgetAlertsPanel(), BudgetEditForm(), BudgetEditSheet(), CashflowBarChart(), CurrencySettings(), LanguageSettings() (+16 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (11): TransactionValidationError, validateCreateTransaction(), CreateTransactionUseCase, getSourceDelta(), validateActiveWallet(), base, err, midnight (+3 more)

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (11): useBudgetAnalysis(), useBudgets(), useRecurringBills(), useRecurringReminders(), useTransactionSummary(), useWalletBalances(), ACCOUNT_TYPE_ICON, DashboardPage() (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (7): code:block1 (Error: expect(locator).toBeVisible() failed), code:yaml (- main:), code:ts (63  |), Error details, Instructions, Test info, Test source

### Community 77 - "Community 77"
Cohesion: 0.53
Nodes (4): DatabaseDiagnostics(), countCategories(), getSchemaVersion(), listTables()

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (15): CurrencyAmountInput(), CurrencyAmountInputProps, formatAmountInput(), getFractionDigits(), ACCOUNT_TYPE_ICONS, ACCOUNT_TYPES, COLOR_PRESETS, EMOJI_PRESETS (+7 more)

### Community 79 - "Community 79"
Cohesion: 0.43
Nodes (5): Toast(), ToastProps, ToastType, ToastContext, ToastContextType

### Community 80 - "Community 80"
Cohesion: 0.27
Nodes (8): Props, getDueRemindersUseCase, CreateRecurringBillInput, UpdateRecurringBillInput, IRecurringBillRepository, computeNextDueDate(), Frequency, GetDueRemindersUseCase

### Community 81 - "Community 81"
Cohesion: 0.32
Nodes (5): mapToTransaction(), CreateTransactionInput, TransactionFilter, UpdateTransactionInput, ListTransactionsUseCase

### Community 82 - "Community 82"
Cohesion: 0.18
Nodes (10): forceAppUnlock(), resumeAppLock(), suspendAppLock(), appListeners, authServiceMock, autoBackupMock, capacitorMock, migrationsMock (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.10
Nodes (34): documentSaver, DocumentSaverPlugin, SaveTextFileOptions, SaveTextFileResult, SaveTextFileToDownloadsOptions, AUTO_BACKUP_INTERVAL_MS, AUTO_BACKUP_INTERVALS, AUTO_BACKUP_SETTING_KEYS (+26 more)

### Community 84 - "Community 84"
Cohesion: 0.13
Nodes (13): DropdownListProps, DropdownOption, CONTEXTUAL_ADD_ROUTES, ContextualAddRoute, DASHBOARD_WITH_DRAWER_BACK_ROUTES, DEFAULT_ADD_ROUTE, getContextualAddRoute(), MainLayout() (+5 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (9): LanguageProvider(), AppUnlock(), AppUnlockProps, PIN_KEYS, UnlockMode, authServiceMock, onUnlocked, preferencesMock (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.31
Nodes (4): assertCreditCardSettings(), generateId(), persistWeb(), WalletService

### Community 91 - "Community 91"
Cohesion: 0.41
Nodes (3): AuthService, isAndroidPlatform(), isBiometricUnlockSupportedPlatform()

### Community 92 - "Community 92"
Cohesion: 0.24
Nodes (10): importBackupJson(), readBackupFile(), restoreDatabase(), assertBackupPayload(), file, invalid, mockDb, payload (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (4): Props, RecurringBill, mapRow(), SQLiteRecurringBillRepository

### Community 94 - "Community 94"
Cohesion: 0.24
Nodes (7): BUDGET_THRESHOLDS, classifyBudgetStatus(), budget, calculateProgress, mockDb, mockRepo, upsertBudget

### Community 95 - "Community 95"
Cohesion: 0.31
Nodes (6): BackupMetadata, BackupPayload, BackupRow, ValidationResult, LegacyRestorableBackupPayload, RestorableBackupPayload

### Community 96 - "Community 96"
Cohesion: 0.25
Nodes (6): Props, Props, Props, Props, Props, BudgetProgress

### Community 97 - "Community 97"
Cohesion: 0.33
Nodes (5): Props, StoredStatement, UseWalletsReturn, CreateWalletInput, UpdateWalletInput

### Community 98 - "Community 98"
Cohesion: 0.32
Nodes (6): buildErrorLogExportPayload(), ErrorLogExportItem, ErrorLogExportPayload, exportErrorLogsToJson(), ErrorLogRecord, LogLevel

### Community 99 - "Community 99"
Cohesion: 0.38
Nodes (6): formatDueDate(), fromDateInput(), isValidDateParts(), parseDueDate(), startOfLocalDay(), toDateInput()

### Community 100 - "Community 100"
Cohesion: 0.43
Nodes (5): immediateTransactionRunner(), sqliteTransactionRunner(), nativeTransactionQueue, runExclusive(), runInTransaction()

### Community 101 - "Community 101"
Cohesion: 0.29
Nodes (4): GlobalErrorBoundary, renderBootstrap(), renderAppUnlock(), renderWalletList()

## Knowledge Gaps
- **465 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+460 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Community 73` to `Community 0`, `Community 1`, `Community 2`, `Community 99`, `Community 5`, `Community 41`, `Community 75`, `Community 44`, `Community 14`, `Community 78`, `Community 84`, `Community 21`, `Community 85`, `Community 52`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `getDbConnection()` connect `Community 8` to `Community 0`, `Community 1`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 28`, `Community 34`, `Community 38`, `Community 43`, `Community 48`, `Community 77`, `Community 80`, `Community 81`, `Community 83`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 100`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Wallet` connect `Community 44` to `Community 0`, `Community 97`, `Community 34`, `Community 8`, `Community 9`, `Community 74`, `Community 13`, `Community 78`, `Community 21`, `Community 90`, `Community 27`, `Community 30`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _465 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07609427609427609 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0645045045045045 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._