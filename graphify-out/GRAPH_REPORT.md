# Graph Report - TaiXiuCaNhan  (2026-05-27)

## Corpus Check
- 254 files · ~80,956 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1231 nodes · 2932 edges · 83 communities (75 shown, 8 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 111 edges
2. `getDbConnection()` - 81 edges
3. `Wallet` - 40 edges
4. `useToast()` - 31 edges
5. `useCurrency()` - 29 edges
6. `Transaction` - 28 edges
7. `InMemoryWalletRepository` - 24 edges
8. `AppRepositories` - 22 edges
9. `AccountType` - 21 edges
10. `IWalletRepository` - 21 edges

## Surprising Connections (you probably didn't know these)
- `explainReportQueries()` --calls--> `getDbConnection()`  [EXTRACTED]
  src/modules/reports/dev/query-explain.ts → src/core/db/sqlite/connection.ts
- `Props` --references--> `PeriodSummary`  [EXTRACTED]
  src/modules/reports/components/CashflowBarChart.tsx → src/modules/reports/domain/report.model.ts
- `Props` --references--> `Transaction`  [EXTRACTED]
  src/modules/transactions/components/TransactionItem.tsx → src/modules/transactions/domain/transaction.model.ts
- `Props` --references--> `Transaction`  [EXTRACTED]
  src/modules/transactions/components/TransactionList.tsx → src/modules/transactions/domain/transaction.model.ts
- `WeekSummaryRow` --references--> `Transaction`  [EXTRACTED]
  src/modules/transactions/components/TransactionList.tsx → src/modules/transactions/domain/transaction.model.ts

## Communities (83 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (26): LocalizedCategoryIconPreset, Language, NestedKeyOf, TranslationKey, TranslationPath, translations, LanguageContextType, buildTimestamp() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (40): dateInputValue(), DateRangePicker(), Props, Props, ReportSummaryCards(), dumpReportData(), CashflowSummary, CategorySummary (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (43): formatDueDate(), fromDateInput(), isValidDateParts(), parseDueDate(), Props, RecurringBillForm(), startOfLocalDay(), toDateInput() (+35 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (58): Props, Props, ACCOUNT_TYPE_ICONS, Props, STATUS_COLORS, BudgetCategoryItem(), Props, EditableCategoryBudget (+50 more)

### Community 4 - "Community 4"
Cohesion: 0.31
Nodes (4): assertCreditCardSettings(), generateId(), persistWeb(), WalletService

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (17): CashflowBarChart(), Props, percentChange(), Props, TransactionItem(), DaySummaryRow, MonthSummaryRow, Props (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (35): BackupMetadata, BackupPayload, BackupRow, ValidationResult, exportBackupJson(), importBackupJson(), readBackupFile(), LegacyRestorableBackupPayload (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (13): AuthResult, BIOMETRIC_UNLOCK_SUPPORTED_PLATFORMS, BiometricAuthEvent, BiometricListenerPlugin, isNativePlatform(), nativeBiometric, NativeBiometricAuthResult, NativeBiometricAvailability (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (4): SQLiteWalletRepository, ensureBalanceAdjustmentCategory(), getDbConnection(), isManagedTransactionActive()

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (13): immediateTransactionRunner(), createUseCase, deleteUseCase, FailingTransactionRepository, input, invalidInput, oldTx, paymentUseCase (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (9): useBudgetAnalysis(), useBudgets(), useTransactionSummary(), ACCOUNT_TYPE_ICON, DashboardPage(), STATUS_BG, STATUS_GRADIENT, filterActiveWallets() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (6): Props, mapToTransaction(), Transaction, UpdateTransactionInput, InMemoryTransactionRepository, SQLiteTransactionRepository

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (7): sqliteTransactionRunner(), TransactionRunner, AppRepositories, ITransactionRepository, IWalletRepository, DeleteTransactionUseCase, BALANCE_ADJUSTMENT_CATEGORIES

### Community 13 - "Community 13"
Cohesion: 0.30
Nodes (8): addDays(), addMonths(), buildDueDate(), clampedDate(), CreditCardService, CreditCardSummary, daysInMonth(), getCreditCardStatementPeriod()

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (11): asOf, closedStatementAsOf, creditCard, firstStatement, lifecyclePeriod(), overdueAsOf, period, repo (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (21): CurrencyAmountInputProps, CurrencySettings(), ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, formatDayMonth(), WalletCard(), ACCOUNT_TYPES, COLOR_PRESETS (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (21): dependencies, cors, express, description, devDependencies, ts-node-dev, @types/cors, @types/express (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, @capacitor/cli, copyfiles, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom (+14 more)

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
Cohesion: 0.19
Nodes (18): RecurringBillList(), TransactionForm(), useConfirm(), ROUTES, useRecurringBills(), useRecurringReminders(), useTransactionForm(), MainLayout() (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (18): BudgetAddSheet(), BudgetAlertsPanel(), BudgetByAccountTypeSummary(), BudgetCategoryList(), BudgetEditForm(), BudgetEditSheet(), BudgetSummaryStats(), Props (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (10): Props, ReceiptCapture(), ReceiptStorageService, createUseCase, existingNoReceipt, existingWithReceipt, input, mockDb (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (8): BiometricUnlockSettings(), LanguageSettings(), LanguageContext, LanguageProvider(), MenuItem, SettingsPage(), preferencesMock, Probe()

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (10): ActivityCallback, ActivityResult, PluginCall, PluginMethod, PluginCall, PluginMethod, DocumentSaverPlugin, NativeBiometricPlugin (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (16): biometricAuth, biometricSubTitle, biometricTitle, appId, appName, androidBiometric, androidIsEncryption, iosBiometric (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): CreateTransactionInput, TransactionValidationError, validateCreateTransaction(), CreateCreditCardPaymentInput, CreateCreditCardPaymentUseCase, CreateTransactionUseCase, getSourceDelta(), validateActiveWallet()

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (7): createCreditCardPaymentUseCase, createTransactionUseCase, deleteTransactionUseCase, listTransactionsUseCase, updateTransactionUseCase, TransactionFilter, ListTransactionsUseCase

### Community 30 - "Community 30"
Cohesion: 0.41
Nodes (3): AuthService, isAndroidPlatform(), isBiometricUnlockSupportedPlatform()

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): resumeAppLock(), suspendAppLock(), appListeners, authServiceMock, capacitorMock, migrationsMock, seedMock, sqliteConnectionMock

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (15): ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider(), ConfirmDialog(), ConfirmDialogProps, useKeyboardSafeFocus(), AppProvider() (+7 more)

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
Cohesion: 0.15
Nodes (10): DonutItem, normalizeDonutData(), NormalizeDonutDataOptions, RawDonutItem, DonutCenterLabelProps, DonutLegendProps, ReportDonutCard(), ReportDonutCardProps (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 40 - "Community 40"
Cohesion: 0.36
Nodes (6): applyKeyboardScrollPadding(), getKeyboardScrollContainer(), getScrollableParent(), restoreScrollPadding(), scrollElementIntoKeyboardSafeView(), ScrollPaddingState

### Community 41 - "Community 41"
Cohesion: 0.07
Nodes (34): AdvancedTransactionFilterSheet(), inputStyle, labelStyle, Props, toDateInputValue(), BottomSheet(), Props, CategoryForm() (+26 more)

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, postinstall, preview, test, typecheck

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (8): ErrorScreen(), ErrorScreenProps, GlobalErrorBoundary, GlobalErrorBoundaryProps, GlobalErrorBoundaryState, renderBootstrap(), renderAppUnlock(), renderWalletList()

### Community 44 - "Community 44"
Cohesion: 0.26
Nodes (7): Props, StoredStatement, useWalletBalances(), useWallets(), UseWalletsReturn, CreateWalletInput, UpdateWalletInput

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
Cohesion: 0.14
Nodes (11): nativeTransactionQueue, runExclusive(), runInTransaction(), categoryInserts, dbError, insertedCategoryIds, repository, requiredTables (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): bundleVersion, _comment, minNativeVersionCodeForBundle, nativeVersionCode, nativeVersionName

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (8): explainReportQueries(), ensureWebStoreInitialized(), initDatabaseConnection(), getSQLiteEncryptionConfig(), SQLITE_ENCRYPTION_CONFIG, SQLiteEncryptionConfig, SQLiteEncryptionMode, applyPragmas()

### Community 73 - "Community 73"
Cohesion: 0.16
Nodes (10): LoadingScreen(), ACTIVITY_EVENTS, AppBootstrap(), AppBootstrapProps, AppUnlock(), AppUnlockProps, PIN_KEYS, UnlockMode (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.06
Nodes (33): ENV, buildExportDatasetUseCase, documentSaver, DocumentSaverPlugin, SaveTextFileOptions, SaveTextFileResult, EXPORT_COPY, buildErrorLogExportPayload() (+25 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (8): validateUpdateTransaction(), UpdateTransactionUseCase, base, err, midnight, now, row, tx

### Community 77 - "Community 77"
Cohesion: 0.46
Nodes (7): columnExists(), executeMigrationStatement(), markMigrationDone(), MIGRATIONS, parseAddColumnStatement(), runMigrations(), splitSqlStatements()

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (4): generateId(), mapWallet(), UpsertCreditCardStatementInput, WalletReferenceCounts

### Community 79 - "Community 79"
Cohesion: 0.32
Nodes (5): CreditCardStatementStatus, CreditCardStatementPeriod, deriveStatus(), getStatementPeriodForLifecycle(), SyncCreditCardStatementUseCase

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (3): Props, Props, Wallet

### Community 81 - "Community 81"
Cohesion: 0.53
Nodes (4): DatabaseDiagnostics(), countCategories(), getSchemaVersion(), listTables()

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (5): DEFAULT_CATEGORIES, DefaultCategory, DefaultCategoryType, insertDefaultCategories(), seedDefaultData()

## Knowledge Gaps
- **390 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+385 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Community 22` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 38`, `Community 73`, `Community 74`, `Community 41`, `Community 10`, `Community 15`, `Community 21`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `getDbConnection()` connect `Community 8` to `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 41`, `Community 74`, `Community 11`, `Community 12`, `Community 77`, `Community 78`, `Community 76`, `Community 48`, `Community 81`, `Community 82`, `Community 52`, `Community 23`, `Community 29`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `Wallet` connect `Community 80` to `Community 2`, `Community 4`, `Community 8`, `Community 9`, `Community 10`, `Community 41`, `Community 12`, `Community 13`, `Community 78`, `Community 79`, `Community 14`, `Community 15`, `Community 44`, `Community 28`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _390 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0746031746031746 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06921529175050302 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06335403726708075 - nodes in this community are weakly interconnected._