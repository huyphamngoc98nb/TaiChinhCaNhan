# Graph Report - TaiXiuCaNhan  (2026-06-01)

## Corpus Check
- 296 files · ~116,928 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1863 nodes · 5794 edges · 105 communities (95 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9cf6255`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
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
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 126|Community 126]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 167 edges
2. `getDbConnection()` - 117 edges
3. `Wallet` - 61 edges
4. `useToast()` - 51 edges
5. `useCurrency()` - 44 edges
6. `AppRepositories` - 42 edges
7. `Transaction` - 40 edges
8. `ROUTES` - 37 edges
9. `AccountType` - 35 edges
10. `ITransactionRepository` - 34 edges

## Surprising Connections (you probably didn't know these)
- `addLoanPayment()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/add-loan-payment.ts → src/core/db/sqlite/transaction.ts
- `createLoan()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/create-loan.ts → src/core/db/sqlite/transaction.ts
- `exportToPdf()` --calls--> `formatDate()`  [INFERRED]
  src/modules/export/services/export-pdf.ts → src/modules/loans/components/LoanCard.tsx
- `LoanFormProps` --references--> `CreateLoanInput`  [EXTRACTED]
  src/modules/loans/components/LoanForm.tsx → src/modules/loans/domain/loan.model.ts
- `ListLoansDeps` --references--> `ILoanRepository`  [EXTRACTED]
  src/modules/loans/services/list-loans.ts → src/modules/loans/repositories/loan.repository.ts

## Import Cycles
- 2-file cycle: `src/core/telemetry/error-log.repository.ts -> src/core/telemetry/logger.ts -> src/core/telemetry/error-log.repository.ts`
- 3-file cycle: `src/core/db/sqlite/connection.ts -> src/core/telemetry/logger.ts -> src/core/telemetry/error-log.repository.ts -> src/core/db/sqlite/connection.ts`

## Communities (105 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (44): AdvancedTransactionFilterSheet(), endOfLocalDay(), inputStyle, labelStyle, Props, startOfLocalDay(), toDateInputValue(), BottomSheet() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (45): Props, dateInputValue(), DateRangePicker(), endOfInputDate(), Props, startOfInputDate(), percentChange(), Props (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (30): For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For native CLAUDE.md integration, For --update (incremental re-extraction) (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (6): mapToTransaction(), Transaction, TransactionFilter, UpdateTransactionInput, InMemoryTransactionRepository, SQLiteTransactionRepository

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (40): config, configFile, forbidOnly, fullyParallel, globalSetup, globalTeardown, globalTimeout, grep (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): Props, ReceiptCapture(), Props, Language, NestedKeyOf, TranslationKey, TranslationPath, translations (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (23): AUTO_BACKUP_INTERVAL_MS, AUTO_BACKUP_INTERVALS, AUTO_BACKUP_SETTING_KEYS, AutoBackupRunReason, AutoBackupRunResult, AutoBackupSettings, createAutoBackupFileName(), DEFAULT_AUTO_BACKUP_SETTINGS (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (23): CreateLoanInput, LOAN_TYPES, LoanValidationError, validateCreateLoan(), validateCreateLoanPayment(), addLoanPayment(), AddLoanPaymentDeps, LoanPaymentExceedError (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): Bug #10: Pixel 5 Layout and UX (iPhone X), Bug #11: Pixel 5 Layout and UX (Pixel 5), Bug #12: Pixel 5 Layout and UX (Tablet (iPad)), Bug #13: Tablet (iPad) Layout and UX (iPhone 12), Bug #14: Tablet (iPad) Layout and UX (iPhone X), Bug #15: Tablet (iPad) Layout and UX (Pixel 5), Bug #16: Tablet (iPad) Layout and UX (Tablet (iPad)), Bug #1: iPhone 12 Layout and UX (iPhone 12) (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (32): DatabaseDiagnostics(), explainReportQueries(), columnExists(), executeMigrationStatement(), markMigrationDone(), MIGRATIONS, parseAddColumnStatement(), runMigrations() (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (15): formatLastRunAt(), forceAppUnlock(), resumeAppLock(), suspendAppLock(), AutoBackupInterval, appListeners, authServiceMock, autoBackupMock (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): 1. Local Backup & Restore, 2. Human-Readable Exports, 3. Portability Limitations, Android Sync & Build, Current Implemented Scope, Data Portability (Phase 6), Expense Tracker App, Final Quality Assurance (Phase 6 Hardening) (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.06
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

### Community 21 - "Community 21"
Cohesion: 0.36
Nodes (4): CreateCreditCardPaymentInput, deriveStatus(), getStatementPeriodForLifecycle(), SyncCreditCardStatementUseCase

### Community 22 - "Community 22"
Cohesion: 0.27
Nodes (6): ILoanRepository, CancelLoanDeps, deleteLoan(), DeleteLoanDeps, getLoanForDelete(), LoanHasPaymentsError

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (10): documentSaver, DocumentSaverPlugin, SaveTextFileOptions, SaveTextFileResult, SaveTextFileToDownloadsOptions, saveAutoBackupFile(), downloadInBrowser(), saveBackupFile() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (15): DonutItem, formatPercentLabel(), makeId(), normalizeDonutData(), NormalizeDonutDataOptions, RawDonutItem, DonutCenterLabel(), DonutCenterLabelProps (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (12): ActivityCallback, ActivityResult, PluginCall, PluginMethod, String, PluginCall, PluginMethod, String (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (16): biometricAuth, biometricSubTitle, biometricTitle, appId, appName, androidBiometric, androidIsEncryption, iosBiometric (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.23
Nodes (12): immediateTransactionRunner(), sqliteTransactionRunner(), TransactionRunner, AppRepositories, createSQLiteRepositories(), ITransactionRepository, IWalletRepository, DeleteTransactionUseCase (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (22): ReceiptStorageService, UpdateTransactionUseCase, createUseCase, deleteUseCase, FailingTransactionRepository, input, invalidInput, oldTx (+14 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (14): InMemoryWalletRepository, asOf, closedStatementAsOf, creditCard, firstStatement, lifecyclePeriod(), overdueAsOf, period (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (15): createSampleTransactions(), CreateTransactionInput, TransactionValidationError, validateCreateTransaction(), validateUpdateTransaction(), matchesFilter(), CreateTransactionUseCase, getSourceDelta() (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (9): Application Architecture, Code Graph, code:mermaid (flowchart TB), code:mermaid (flowchart LR), code:mermaid (flowchart TB), code:mermaid (flowchart LR), Navigation Routes, Reports Data Flow (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (8): exclude, extractDocstrings, frameworks, include, languages, maxFileSize, trackCallSites, version

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (8): code:text (src/), code:ts (import { create } from 'zustand';), Current App Position, Decision, Example Pattern, Proposed Folder Shape, Shared State Strategy, When to Introduce Zustand

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (20): createCreditCardPaymentUseCase, createTransactionUseCase, deleteTransactionUseCase, listTransactionsUseCase, updateTransactionUseCase, clearStoredCreateTransactionState(), CreateTransactionFormValues, getCreateTransactionInitialValues() (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, postinstall, preview, test, test:ui (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.32
Nodes (11): CashflowBarChart(), Props, TransactionItem(), DaySummaryRow, MonthSummaryRow, Props, SummaryRow, TransactionList() (+3 more)

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
Nodes (81): BiometricUnlockSettings(), BudgetAddSheet(), Props, BudgetAlertsPanel(), Props, ACCOUNT_TYPE_ICONS, BudgetByAccountTypeSummary(), Props (+73 more)

### Community 49 - "Community 49"
Cohesion: 0.48
Nodes (5): bundleVersion, _comment, minNativeVersionCodeForBundle, nativeVersionCode, nativeVersionName

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (35): BackupMetadata, BackupPayload, BackupRow, ValidationResult, importBackupJson(), readBackupFile(), LegacyRestorableBackupPayload, RestorableBackupPayload (+27 more)

### Community 73 - "Community 73"
Cohesion: 0.06
Nodes (63): BackButton(), BackButtonProps, RecurringBillForm(), TransactionForm(), ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider() (+55 more)

### Community 76 - "Community 76"
Cohesion: 0.31
Nodes (7): code:block1 (Error: expect(locator).toBeVisible() failed), code:yaml (- main:), code:ts (63  |), Error details, Instructions, Test info, Test source

### Community 79 - "Community 79"
Cohesion: 0.18
Nodes (9): ENV, installGlobalErrorLogging(), toMetadataValue(), isLogOptions(), Logger, LogOptions, normalizeError(), normalizeMetadata() (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.25
Nodes (12): StoredStatement, useWalletBalances(), useWallets(), UseWalletsReturn, generateId(), mapWallet(), AccountType, CreateWalletInput (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.08
Nodes (32): AuthResult, AuthService, BIOMETRIC_UNLOCK_SUPPORTED_PLATFORMS, BiometricAuthEvent, BiometricListenerPlugin, isAndroidPlatform(), isBiometricUnlockSupportedPlatform(), isNativePlatform() (+24 more)

### Community 86 - "Community 86"
Cohesion: 0.60
Nodes (3): determineSeverity(), generateReport(), PlaywrightResult

### Community 90 - "Community 90"
Cohesion: 0.21
Nodes (15): ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, formatDayMonth(), Props, WalletCard(), useCreditCardSummary(), addDays(), addMonths() (+7 more)

### Community 99 - "Community 99"
Cohesion: 0.23
Nodes (10): ACCOUNT_TYPE_ORDER, Props, WalletList(), CurrencyProvider(), Wallet, filterActiveWallets(), hasWalletValue(), isActiveWallet() (+2 more)

### Community 107 - "Community 107"
Cohesion: 0.23
Nodes (6): ErrorScreen(), ErrorScreenProps, GlobalErrorBoundary, GlobalErrorBoundaryProps, GlobalErrorBoundaryState, renderWithProviders()

### Community 110 - "Community 110"
Cohesion: 0.26
Nodes (9): LoadingScreen(), ACTIVITY_EVENTS, AppBootstrap(), AppBootstrapProps, DEFAULT_CATEGORIES, DefaultCategory, DefaultCategoryType, insertDefaultCategories() (+1 more)

### Community 112 - "Community 112"
Cohesion: 0.14
Nodes (21): CurrencyAmountInput(), CurrencyAmountInputProps, formatAmountInput(), getFractionDigits(), normalizeAmountInput(), DropdownList(), DropdownListProps, DropdownOption (+13 more)

### Community 113 - "Community 113"
Cohesion: 0.25
Nodes (9): mapBooleanFlag(), mapToLoan(), mapToLoanPayment(), mapToLoanWithSummary(), Loan, LoanPayment, loanRowToArray(), loanWithSummaryRowToArray() (+1 more)

### Community 115 - "Community 115"
Cohesion: 0.18
Nodes (12): LoanCardProps, formatVnd(), PaymentForm(), PaymentFormProps, CreateLoanPaymentInput, LoanWithSummary, formatIsoDate(), formatVnd() (+4 more)

### Community 116 - "Community 116"
Cohesion: 0.20
Nodes (14): buildErrorLogExportPayload(), ErrorLogExportItem, ErrorLogExportPayload, exportErrorLogsToJson(), parseMetadata(), isDatabaseReady(), canUseLocalStorage(), ErrorLogRecord (+6 more)

### Community 121 - "Community 121"
Cohesion: 0.12
Nodes (15): loanListDeps, loanMutationDeps, loanServiceDeps, LoanFilter, useLoanMutations(), EMPTY_LOAN_FILTER, useLoans(), FILTER_TABS (+7 more)

### Community 126 - "Community 126"
Cohesion: 0.31
Nodes (8): formatDate(), formatVnd(), isOverdue(), LoanCard(), STATUS_LABELS, TYPE_LABELS, LoanStatus, LoanType

## Knowledge Gaps
- **399 isolated node(s):** `iosDatabaseLocation`, `iosIsEncryption`, `iosKeychainPrefix`, `biometricAuth`, `biometricTitle` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Community 48` to `Community 0`, `Community 1`, `Community 99`, `Community 5`, `Community 40`, `Community 73`, `Community 11`, `Community 44`, `Community 13`, `Community 112`, `Community 84`, `Community 85`, `Community 24`, `Community 90`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `getDbConnection()` connect `Community 10` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 40`, `Community 13`, `Community 110`, `Community 48`, `Community 113`, `Community 84`, `Community 52`, `Community 85`, `Community 116`, `Community 121`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Wallet` connect `Community 99` to `Community 0`, `Community 33`, `Community 8`, `Community 10`, `Community 13`, `Community 112`, `Community 84`, `Community 21`, `Community 90`, `Community 27`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `iosDatabaseLocation`, `iosIsEncryption`, `iosKeychainPrefix` to the rest of the system?**
  _399 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0798442064264849 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._