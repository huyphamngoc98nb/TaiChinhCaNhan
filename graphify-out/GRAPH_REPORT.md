# Graph Report - TaiXiuCaNhan  (2026-06-11)

## Corpus Check
- 320 files · ~118,144 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2187 nodes · 7046 edges · 138 communities (130 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6f660fbe`
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
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 138|Community 138]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 180 edges
2. `getDbConnection()` - 120 edges
3. `Wallet` - 79 edges
4. `useToast()` - 55 edges
5. `getDbConnectionForTransaction()` - 48 edges
6. `ITransactionRepository` - 47 edges
7. `useCurrency()` - 46 edges
8. `AppRepositories` - 44 edges
9. `IWalletRepository` - 44 edges
10. `Transaction` - 43 edges

## Surprising Connections (you probably didn't know these)
- `addLoanPayment()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/add-loan-payment.ts → src/core/db/sqlite/transaction.ts
- `createLoan()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/create-loan.ts → src/core/db/sqlite/transaction.ts
- `deleteLoan()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/delete-loan.ts → src/core/db/sqlite/transaction.ts
- `updateLoan()` --calls--> `runInTransaction()`  [INFERRED]
  src/modules/loans/services/update-loan.ts → src/core/db/sqlite/transaction.ts
- `buildImageReportPages()` --calls--> `formatDate()`  [INFERRED]
  src/modules/export/services/export-pdf.ts → src/modules/loans/components/LoanCard.tsx

## Communities (138 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (28): MIGRATIONS, categories, categoryInserts, dbError, expectExecuteContaining(), expectMigrationMarked(), expectNoExecuteContaining(), id (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (33): AdvancedTransactionFilterSheet(), DateDisplayInput(), DateDisplayInputProps, dateDisplayInputStyle, dateIconStyle, dateInputShellStyle, endOfLocalDay(), hiddenDateInputStyle (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): code:bash (mkdir -p graphify-out), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash (# Detect the correct Python interpreter (handles uv tool, pi), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c ") (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, @capacitor/cli, copyfiles, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (11): Props, CategorySummary, DateRange, PeriodSummary, ReportGranularity, WalletSummary, IReportRepository, SQLiteReportRepository (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (36): CreditCardAlertBanner(), CreditCardAlertBannerProps, fmtDayMonth(), getAlertTitle(), CreditCardAlertsPanel(), CreditCardAlertsPanelProps, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (16): code:block1 (/graphify                                             # full), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash (python3 -m graphify.watch INPUT_PATH --debounce 3), code:bash (graphify hook install    # install), code:bash (graphify claude install), code:bash (graphify claude uninstall  # remove the section), For --cluster-only (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (23): ACCOUNT_TYPES, ACTIVE_FLAGS, BACKUP_SCHEMAS, BILL_FREQUENCIES, BUDGET_PERIODS, CATEGORY_TYPES, FieldRule, FieldType (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (23): BackupMetadata, BackupPayload, BackupRow, ValidationResult, importBackupJson(), readBackupFile(), LegacyRestorableBackupPayload, RestorableBackupPayload (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (15): Props, Props, BudgetEditSheet(), Props, ALL_ACCOUNT_TYPES, BudgetScopePicker(), Props, AccountType (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (22): sqliteTransactionRunner(), buildExportDatasetUseCase, TransactionValidationError, validateCreateTransaction(), validateUpdateTransaction(), AppRepositories, getSourceDelta(), validateActiveWallet() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): 1. Local Backup & Restore, 2. Human-Readable Exports, 3. Portability Limitations, Android Sync & Build, Current Implemented Scope, Data Portability (Phase 6), Expense Tracker App, Final Quality Assurance (Phase 6 Hardening) (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (14): useBudgetAnalysis(), useCreditCardAlerts(), TransactionSummary, useTransactionSummary(), useWalletBalances(), useWallets(), ACCOUNT_TYPE_ICON, DashboardPage() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (20): dependencies, @capacitor/android, @capacitor/app, @capacitor/camera, @capacitor-community/sqlite, @capacitor/core, @capacitor/filesystem, @capacitor/preferences (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (21): dependencies, cors, express, description, devDependencies, ts-node-dev, @types/cors, @types/express (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, @capacitor/cli, copyfiles, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom (+14 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (21): dependencies, @capacitor/android, @capacitor/app, @capacitor/camera, @capacitor-community/sqlite, @capacitor/core, @capacitor/filesystem, @capacitor/preferences (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (19): 1. Local Backup & Restore, 2. Human-Readable Exports, 3. Portability Limitations, Android Sync & Build, code:bash (npm install), code:bash (# On Windows PowerShell:), code:bash (npm run dev), code:bash (npm run build) (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (22): AUTO_BACKUP_INTERVAL_MS, AUTO_BACKUP_INTERVALS, AUTO_BACKUP_SETTING_KEYS, AutoBackupRunReason, AutoBackupRunResult, AutoBackupSettings, createAutoBackupFileName(), DEFAULT_AUTO_BACKUP_SETTINGS (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.47
Nodes (5): Toast(), ToastProps, ToastType, ToastContext, ToastContextType

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (15): DatabaseDiagnostics(), persistWeb(), ensureWebStoreInitialized(), initDatabaseConnection(), _initDatabaseConnectionImpl(), getSQLiteEncryptionConfig(), SQLITE_ENCRYPTION_CONFIG, SQLiteEncryptionConfig (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, postinstall, preview, test, typecheck

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (12): ActivityCallback, ActivityResult, PluginCall, PluginMethod, String, PluginCall, PluginMethod, String (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (16): biometricAuth, biometricSubTitle, biometricTitle, appId, appName, androidBiometric, androidIsEncryption, iosBiometric (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (13): code:block10 (You are a graphify extraction subagent. Read the files liste), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:block8 (spawn_agent(agent_type="worker", message="Your task is to pe) (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (19): AppliedMigration, buildLoanSkipTransactionSql(), columnExists(), DbConnection, executeMigrationSql(), executeMigrationStatement(), getAppliedMigrations(), markMigrationDone() (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (17): Props, RecurringBillList(), STATUS_COLORS, DueStatus, classifyDueStatus(), daysDiff(), startOfDay(), GetDueRemindersUseCase (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (6): name, overrides, sql.js, private, type, version

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (17): category(), { deps, loanUpdateLoan }, { deps, loanUpdateLoan, transactionCreate, transactionSoftDelete }, {
      deps,
      loanUpdateLoan,
      transactionCreate,
      transactionSoftDelete,
      walletUpdateBalanceDelta,
    }, { deps, loanUpdateLoan, walletGetById }, {
      deps,
      transactionCreate,
      walletUpdateBalanceDelta,
    }, { deps, walletGetById }, existingLoan (+9 more)

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (8): AppUnlock(), AppUnlockProps, PIN_KEYS, UnlockMode, authServiceMock, enterPin(), onUnlocked, renderAppUnlock()

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
Cohesion: 0.33
Nodes (6): code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash (if [ ! -f graphify-out/.graphify_extract.json ]; then), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), For --update (incremental re-extraction)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 40 - "Community 40"
Cohesion: 0.50
Nodes (4): code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -m graphify save-result), For /graphify query

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (10): scripts, build, dev, generate:icons, lint, postinstall, preview, test (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.50
Nodes (4): code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -m graphify save-result), For /graphify path

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (4): code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -c "), code:bash ($(cat graphify-out/.graphify_python) -m graphify save-result), For /graphify explain

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
Cohesion: 0.15
Nodes (20): BottomSheet(), Props, CATEGORY_ICON_LIBRARY_DEFINITIONS, CATEGORY_ICON_PRESET_DEFINITIONS, CategoryIcon(), CategoryIconPreset, CUSTOM_ICON_PRESETS, getCategoryIconKey() (+12 more)

### Community 49 - "Community 49"
Cohesion: 0.48
Nodes (5): bundleVersion, _comment, minNativeVersionCodeForBundle, nativeVersionCode, nativeVersionName

### Community 73 - "Community 73"
Cohesion: 0.08
Nodes (22): callOrder, cashTx, createSpy, createUseCase, creditCardTx, deleteUseCase, FailingTransactionRepository, input (+14 more)

### Community 76 - "Community 76"
Cohesion: 0.09
Nodes (24): immediateTransactionRunner(), TransactionRunner, createSampleTransactions(), createCreditCardPaymentUseCase, createSQLiteRepositories(), CreateCreditCardPaymentInput, CreateCreditCardPaymentUseCase, createTransaction (+16 more)

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): code:bash (python3 -m graphify.serve graphify-out/graph.json), code:json ({), Step 7d - MCP server (only if --mcp flag)

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (6): base, err, midnight, now, row, tx

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (3): code:bash ($(cat graphify-out/.graphify_python) -c "), code:block27 (Graph complete. Outputs in PATH_TO_DIR/graphify-out/), Step 9 - Save manifest, update cost tracker, clean up, and report

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (3): code:bash ($(cat graphify-out/.graphify_python) -c "), code:block4 (Corpus: X files · ~Y words), Step 2 - Detect files

### Community 84 - "Community 84"
Cohesion: 0.08
Nodes (38): CreditCardStatementStatus, computeCreditCardAlerts(), addDays(), addMonths(), buildDueDate(), clampedDate(), CreditCardService, CreditCardStatementPeriod (+30 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (11): THEME_OPTIONS, ThemeSelector(), getStoredThemePreference(), isThemePreference(), ResolvedTheme, THEME_COLOR, ThemeContext, ThemeContextType (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.24
Nodes (10): baseInput(), category(), { deps }, { deps, loanCreateLoan, loanUpdateLoan, transactionCreate }, { deps, loanCreateLoan, transactionCreate }, { deps, transactionCreate }, generateUUIDMock, makeDeps() (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.27
Nodes (15): mapBooleanFlag(), mapToLoan(), mapToLoanPayment(), mapToLoanWithSummary(), Loan, LoanFilter, LoanPayment, LoanStatus (+7 more)

### Community 88 - "Community 88"
Cohesion: 0.26
Nodes (8): loanListDeps, loanMutationDeps, loanServiceDeps, emitLoanEvent(), toError(), EMPTY_LOAN_FILTER, cancelLoan(), CancelLoanDeps

### Community 89 - "Community 89"
Cohesion: 0.07
Nodes (20): Props, InMemoryWalletRepository, StoredStatement, UseWalletsReturn, CreateWalletInput, IWalletRepository, UpdateWalletInput, UpsertCreditCardStatementInput (+12 more)

### Community 90 - "Community 90"
Cohesion: 0.12
Nodes (18): BuildExportDatasetUseCase, ExportDataset, buildErrorLogExportPayload(), ErrorLogExportItem, ErrorLogExportPayload, exportErrorLogsToJson(), parseMetadata(), exportToCsv() (+10 more)

### Community 96 - "Community 96"
Cohesion: 0.18
Nodes (8): OrphanReceiptCleanupService, runReceiptOrphanCleanup(), ReceiptStorageService, cleanupSpy, db, deleteSpy, pathsSpy, repository

### Community 98 - "Community 98"
Cohesion: 0.19
Nodes (14): ENV, isDatabaseReady(), canUseLocalStorage(), ErrorLogRepository, generateId(), readPendingLogs(), writePendingLogs(), isLogOptions() (+6 more)

### Community 99 - "Community 99"
Cohesion: 0.23
Nodes (12): dateStringToTimestamp(), LoanForm(), LoanFormProps, startOfLocalDay(), timestampToDateString(), TYPE_OPTIONS, CreateLoanInput, { container } (+4 more)

### Community 105 - "Community 105"
Cohesion: 0.18
Nodes (11): ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmDialog(), ConfirmDialogProps, BodyScrollLockSnapshot, lockBodyScroll(), shouldUseFixedBodyLock() (+3 more)

### Community 106 - "Community 106"
Cohesion: 0.17
Nodes (25): LOAN_TYPES, LoanValidationError, validateCreateLoan(), validateCreateLoanPayment(), validateLoanFields(), validateUpdateLoan(), ILoanRepository, addLoanPayment() (+17 more)

### Community 107 - "Community 107"
Cohesion: 0.21
Nodes (7): deleteLoan(), getLoanForDelete(), LoanHasPaymentsError, deps, loan(), makeRepo(), repo

### Community 108 - "Community 108"
Cohesion: 0.24
Nodes (15): dateInputToMs(), formatVnd(), PaymentForm(), PaymentFormProps, startOfLocalDay(), todayInputValue(), CreateLoanPaymentInput, useLoanMutations() (+7 more)

### Community 109 - "Community 109"
Cohesion: 0.22
Nodes (14): DonutItem, formatPercentLabel(), makeId(), normalizeDonutData(), NormalizeDonutDataOptions, RawDonutItem, DonutCenterLabel(), DonutCenterLabelProps (+6 more)

### Community 110 - "Community 110"
Cohesion: 0.11
Nodes (19): ACCOUNT_TYPE_LABELS, Budget, BudgetWithCategory, CreateBudgetDto, Wallet, IBudgetRepository, generateId(), SQLiteBudgetRepository (+11 more)

### Community 111 - "Community 111"
Cohesion: 0.18
Nodes (11): mapToTransaction(), CreateTransactionInput, Transaction, TransactionFilter, TransactionType, UpdateTransactionInput, InMemoryTransactionRepository, matchesFilter() (+3 more)

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (3): installGlobalErrorLogging(), toMetadataValue(), Logger

### Community 113 - "Community 113"
Cohesion: 0.11
Nodes (27): BudgetAddSheet(), BudgetAlertsPanel(), Props, ACCOUNT_TYPE_ICONS, BudgetByAccountTypeSummary(), Props, STATUS_COLORS, BudgetCategoryList() (+19 more)

### Community 114 - "Community 114"
Cohesion: 0.07
Nodes (45): Props, TransactionItem(), DaySummaryRow, MonthSummaryRow, Props, QuarterSummaryRow, SummaryRow, TransactionList() (+37 more)

### Community 115 - "Community 115"
Cohesion: 0.16
Nodes (16): BackButton(), BackButtonProps, BiometricUnlockSettings(), LanguageSettings(), ROUTES, LanguageContext, AddRecurringBillPage(), AddTransactionPage() (+8 more)

### Community 116 - "Community 116"
Cohesion: 0.32
Nodes (7): formatDueDate(), fromDateInput(), isValidDateParts(), parseDueDate(), RecurringBillForm(), startOfLocalDay(), toDateInput()

### Community 117 - "Community 117"
Cohesion: 0.20
Nodes (17): BackupPage(), formatLastRunAt(), forceAppUnlock(), resumeAppLock(), suspendAppLock(), AutoBackupInterval, exportBackupJson(), appListeners (+9 more)

### Community 118 - "Community 118"
Cohesion: 0.17
Nodes (14): AuthResult, AuthService, BIOMETRIC_UNLOCK_SUPPORTED_PLATFORMS, BiometricAuthEvent, BiometricListenerPlugin, isAndroidPlatform(), isBiometricUnlockSupportedPlatform(), isNativePlatform() (+6 more)

### Community 119 - "Community 119"
Cohesion: 0.20
Nodes (17): formatDate(), formatVnd(), isOverdue(), LoanCard(), LoanCardProps, STATUS_LABELS, TYPE_LABELS, LoanType (+9 more)

### Community 120 - "Community 120"
Cohesion: 0.15
Nodes (14): dateInputValue(), DateRangePicker(), endOfInputDate(), Props, startOfInputDate(), dumpReportData(), buildDateRange(), DateRangePreset (+6 more)

### Community 121 - "Community 121"
Cohesion: 0.13
Nodes (16): Props, ReceiptCapture(), blurActiveEditableElement(), HIDDEN_MANUAL_TRANSACTION_CATEGORY_KEYS, HIDDEN_MANUAL_TRANSACTION_CATEGORY_SLUGS, Props, TransactionForm(), TransactionFormCategoryOption (+8 more)

### Community 122 - "Community 122"
Cohesion: 0.21
Nodes (10): LoadingScreen(), ACTIVITY_EVENTS, AppBootstrap(), AppBootstrapProps, DEFAULT_CATEGORIES, DefaultCategory, DefaultCategoryType, insertDefaultCategories() (+2 more)

### Community 123 - "Community 123"
Cohesion: 0.16
Nodes (15): useConfirm(), scrollPositions, useScrollRestoration(), CONTEXTUAL_ADD_ROUTES, ContextualAddRoute, DASHBOARD_WITH_DRAWER_BACK_ROUTES, DEFAULT_ADD_ROUTE, getContextualAddRoute() (+7 more)

### Community 124 - "Community 124"
Cohesion: 0.16
Nodes (13): EXPORT_COPY, appendTable(), appendText(), AutoTableDocument, buildImageReportPages(), exportImagePdf(), exportToPdf(), jsPDF (+5 more)

### Community 125 - "Community 125"
Cohesion: 0.12
Nodes (25): CurrencyAmountInput(), CurrencyAmountInputProps, formatAmountInput(), getFractionDigits(), normalizeAmountInput(), CurrencySettings(), DropdownList(), DropdownListProps (+17 more)

### Community 126 - "Community 126"
Cohesion: 0.15
Nodes (14): category(), { deps, transactionCreate, updateLoanStatus }, { deps, transactionCreate, walletRepo }, { deps, updateBalanceDelta }, { deps, updateBalanceDelta, updateLoanStatus }, firstPayment, generateUUIDMock, makeDeps() (+6 more)

### Community 127 - "Community 127"
Cohesion: 0.31
Nodes (12): createTransactionUseCase, updateTransactionUseCase, clearStoredCreateTransactionState(), CreateTransactionFormValues, getCreateTransactionInitialValues(), getDefaultCreateTransactionValues(), getEditTransactionInitialValues(), getNextCreateTransactionValues() (+4 more)

### Community 128 - "Community 128"
Cohesion: 0.24
Nodes (12): ConfirmProvider(), applyKeyboardScrollPadding(), getKeyboardScrollContainer(), getScrollableParent(), isEditableElement(), restoreScrollPadding(), scrollElementIntoKeyboardSafeView(), ScrollPaddingState (+4 more)

### Community 129 - "Community 129"
Cohesion: 0.19
Nodes (15): formatDaysDiff(), Props, RecurringBillReminderBanner(), STATUS_CONFIG, RecurringBillReminder, BUDGET_STATUS_ORDER, buildDashboardViewModel(), DashboardViewModel (+7 more)

### Community 130 - "Community 130"
Cohesion: 0.28
Nodes (7): Props, CreateRecurringBillInput, RecurringBill, UpdateRecurringBillInput, IRecurringBillRepository, mapRow(), SQLiteRecurringBillRepository

### Community 131 - "Community 131"
Cohesion: 0.26
Nodes (10): documentSaver, DocumentSaverPlugin, SaveTextFileOptions, SaveTextFileResult, SaveTextFileToDownloadsOptions, saveAutoBackupFile(), downloadInBrowser(), saveBackupFile() (+2 more)

### Community 132 - "Community 132"
Cohesion: 0.28
Nodes (9): getDueRemindersUseCase, useRecurringBills(), useRecurringReminders(), addLocalCalendarDays(), addLocalCalendarMonthsClamped(), computeNextDueDate(), Frequency, lastDayOfMonth() (+1 more)

### Community 133 - "Community 133"
Cohesion: 0.35
Nodes (10): CashflowBarChart(), ReportDonutCard(), percentChange(), Props, ReportSummaryCards(), useCurrency(), CashflowSummary, EXPENSE_DONUT_COLORS (+2 more)

### Community 134 - "Community 134"
Cohesion: 0.29
Nodes (8): createUseCase, existingNoReceipt, existingWithReceipt, input, makeBaseInput(), mockDb, mockRepo, walletRow

### Community 135 - "Community 135"
Cohesion: 0.33
Nodes (4): createUseCase, FailingWalletRepository, transactionRepository, walletRepository

### Community 136 - "Community 136"
Cohesion: 0.21
Nodes (7): ErrorScreen(), ErrorScreenProps, GlobalErrorBoundary, GlobalErrorBoundaryProps, GlobalErrorBoundaryState, renderLoanForm(), renderWalletList()

### Community 138 - "Community 138"
Cohesion: 0.15
Nodes (17): BudgetCategoryItem(), Props, EditableCategoryBudget, Props, SCOPE_ORDER, BudgetProgressCard(), Props, BudgetScopeBadge() (+9 more)

## Knowledge Gaps
- **522 isolated node(s):** `config`, `dev`, `build`, `typecheck`, `lint` (+517 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Community 113` to `Community 1`, `Community 130`, `Community 4`, `Community 133`, `Community 5`, `Community 10`, `Community 138`, `Community 13`, `Community 29`, `Community 34`, `Community 48`, `Community 85`, `Community 99`, `Community 108`, `Community 109`, `Community 114`, `Community 115`, `Community 116`, `Community 117`, `Community 119`, `Community 120`, `Community 121`, `Community 123`, `Community 124`, `Community 125`, `Community 127`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `getDbConnection()` connect `Community 5` to `Community 89`, `Community 1`, `Community 98`, `Community 130`, `Community 4`, `Community 134`, `Community 9`, `Community 10`, `Community 110`, `Community 111`, `Community 21`, `Community 87`, `Community 23`, `Community 120`, `Community 117`, `Community 122`, `Community 28`, `Community 127`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Wallet` connect `Community 89` to `Community 129`, `Community 33`, `Community 1`, `Community 5`, `Community 73`, `Community 11`, `Community 76`, `Community 13`, `Community 115`, `Community 84`, `Community 86`, `Community 125`, `Community 126`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `config`, `dev`, `build` to the rest of the system?**
  _522 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10102843315184513 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._