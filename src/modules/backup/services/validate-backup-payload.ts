import { BackupMetadata, BackupPayload, BackupRow, ValidationResult } from '../domain/backup.model';
import { CURRENT_BACKUP_VERSION, CURRENT_SCHEMA_VERSION } from './export-backup-json';

type FieldType = 'string' | 'number';

interface FieldRule {
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  enum?: readonly unknown[];
}

interface SectionSchema {
  required: boolean;
  fields: Record<string, FieldRule>;
}

const ACCOUNT_TYPES = ['cash', 'bank', 'credit_card', 'e_wallet', 'debt_or_loan', 'investment', 'other'] as const;
const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
const CATEGORY_TYPES = ['income', 'expense'] as const;
const BUDGET_PERIODS = ['weekly', 'monthly'] as const;
const BILL_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const LOAN_TYPES = ['lend', 'borrow'] as const;
const LOAN_STATUSES = ['active', 'settled', 'cancelled'] as const;
const ACTIVE_FLAGS = [0, 1] as const;
const RECURRING_ACTIVE_FLAGS = [-1, 0, 1] as const;
const LEGACY_BACKUP_VERSION = '1.0';
const LEGACY_SCHEMA_VERSION = 1;

const BACKUP_SCHEMAS: Record<string, Record<string, SectionSchema>> = {
  '2.0': {
    wallets: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        currency: { type: 'string', required: true },
        balance: { type: 'number', required: true },
        account_type: { type: 'string', required: true, enum: ACCOUNT_TYPES },
        icon: { type: 'string', required: true, nullable: true },
        color: { type: 'string', required: true, nullable: true },
        sort_order: { type: 'number', required: true },
        is_active: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        exclude_from_total: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        credit_limit: { type: 'number', required: true, nullable: true },
        statement_day: { type: 'number', required: true, nullable: true },
        due_day: { type: 'number', required: true, nullable: true },
        annual_fee: { type: 'number', required: true, nullable: true },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
    categories: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        type: { type: 'string', required: true, enum: CATEGORY_TYPES },
        icon: { type: 'string', required: true, nullable: true },
        color: { type: 'string', required: true, nullable: true },
        description: { type: 'string', required: true, nullable: true },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
    transactions: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        wallet_id: { type: 'string', required: true },
        category_id: { type: 'string', required: true },
        type: { type: 'string', required: true, enum: TRANSACTION_TYPES },
        amount: { type: 'number', required: true },
        note: { type: 'string', required: true, nullable: true },
        receipt_path: { type: 'string', required: true, nullable: true },
        transaction_date: { type: 'number', required: true },
        to_wallet_id: { type: 'string', required: true, nullable: true },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
        deleted_at: { type: 'number', required: true, nullable: true },
        exclude_from_total: { type: 'number', enum: ACTIVE_FLAGS },
      },
    },
    recurring_bills: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        wallet_id: { type: 'string', required: true },
        category_id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        frequency: { type: 'string', required: true, enum: BILL_FREQUENCIES },
        next_due_date: { type: 'number', required: true },
        reminder_days: { type: 'number', required: true },
        is_active: { type: 'number', required: true, enum: RECURRING_ACTIVE_FLAGS },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
    app_settings: {
      required: true,
      fields: {
        key: { type: 'string', required: true },
        value: { type: 'string', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
    budgets: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        category_id: { type: 'string', required: true },
        wallet_id: { type: 'string', required: true, nullable: true },
        account_type_scope: { type: 'string', required: true, nullable: true, enum: ACCOUNT_TYPES },
        amount: { type: 'number', required: true },
        period: { type: 'string', required: true, enum: BUDGET_PERIODS },
        start_date: { type: 'number', required: true },
        end_date: { type: 'number', required: true, nullable: true },
        is_active: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
    error_logs: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        level: { type: 'string', required: true, enum: ['info', 'warn', 'error', 'debug'] as const },
        message: { type: 'string', required: true },
        context: { type: 'string', required: true, nullable: true },
        stack: { type: 'string', required: true, nullable: true },
        metadata_json: { type: 'string', required: true, nullable: true },
        created_at: { type: 'number', required: true },
      },
    },
    loans: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        wallet_id: { type: 'string', required: true, nullable: true },
        type: { type: 'string', required: true, enum: LOAN_TYPES },
        contact_name: { type: 'string', required: true },
        contact_info: { type: 'string', required: true, nullable: true },
        principal: { type: 'number', required: true },
        loan_date: { type: 'string', required: false, nullable: true },
        due_date: { type: 'string', required: true, nullable: true },
        note: { type: 'string', required: true, nullable: true },
        status: { type: 'string', required: true, enum: LOAN_STATUSES },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
        deleted_at: { type: 'number', required: true, nullable: true },
        skip_transaction: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        linked_transaction_id: { type: 'string', required: true, nullable: true },
      },
    },
    loan_payments: {
      required: true,
      fields: {
        id: { type: 'string', required: true },
        loan_id: { type: 'string', required: true },
        wallet_id: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        payment_date: { type: 'number', required: true },
        note: { type: 'string', required: true, nullable: true },
        created_at: { type: 'number', required: true },
      },
    },
  },
};

const LEGACY_V1_SCHEMAS: Record<string, SectionSchema> = {
  wallets: {
    required: true,
    fields: {
      id: { type: 'string', required: true },
      name: { type: 'string', required: true },
      currency: { type: 'string' },
      balance: { type: 'number', required: true },
      created_at: { type: 'number', required: true },
      updated_at: { type: 'number', required: true },
    },
  },
  categories: {
    required: true,
    fields: {
      id: { type: 'string', required: true },
      name: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: CATEGORY_TYPES },
      created_at: { type: 'number', required: true },
      updated_at: { type: 'number', required: true },
    },
  },
  transactions: {
    required: true,
    fields: {
      id: { type: 'string', required: true },
      wallet_id: { type: 'string', required: true },
      category_id: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: TRANSACTION_TYPES },
      amount: { type: 'number', required: true },
      note: { type: 'string', nullable: true },
      transaction_date: { type: 'number', required: true },
      created_at: { type: 'number', required: true },
      updated_at: { type: 'number', required: true },
    },
  },
  recurring_bills: {
    required: true,
    fields: {
      id: { type: 'string', required: true },
      wallet_id: { type: 'string', required: true },
      category_id: { type: 'string', required: true },
      name: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      frequency: { type: 'string', required: true, enum: BILL_FREQUENCIES },
      next_due_date: { type: 'number', required: true },
      is_active: { type: 'number', enum: ACTIVE_FLAGS },
      created_at: { type: 'number', required: true },
      updated_at: { type: 'number', required: true },
    },
  },
  app_settings: {
    required: true,
    fields: {
      key: { type: 'string', required: true },
      value: { type: 'string', required: true },
      updated_at: { type: 'number', required: true },
    },
  },
};

function isPlainObject(value: unknown): value is BackupRow {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateMetadata(payload: BackupRow): ValidationResult {
  if (!isPlainObject(payload.metadata)) {
    return { isValid: false, error: 'Invalid or missing metadata. Expected metadata.version, metadata.schema_version, metadata.exported_at, and metadata.app_version.' };
  }

  const { version, schema_version, exported_at, app_version, app_name } = payload.metadata;
  if (typeof version !== 'string' || typeof exported_at !== 'number' || typeof app_version !== 'string') {
    return { isValid: false, error: 'Invalid or missing metadata. metadata.version must be a string, metadata.exported_at must be a number, and metadata.app_version must be a string.' };
  }

  if (app_name !== undefined && app_name !== 'TaiXiuCaNhan') {
    return { isValid: false, error: 'File không đúng định dạng backup.' };
  }

  if (!Number.isFinite(exported_at) || exported_at <= 0) {
    return { isValid: false, error: 'metadata.exported_at must be a valid timestamp.' };
  }

  if (!BACKUP_SCHEMAS[version] && version !== LEGACY_BACKUP_VERSION) {
    return {
      isValid: false,
      error: `Unsupported backup version: ${version}. Supported versions are ${CURRENT_BACKUP_VERSION}/schema ${CURRENT_SCHEMA_VERSION} and legacy ${LEGACY_BACKUP_VERSION}/schema ${LEGACY_SCHEMA_VERSION}. File backup này không được hỗ trợ bởi phiên bản hiện tại.`,
    };
  }

  if (schema_version !== undefined && typeof schema_version !== 'number') {
    return { isValid: false, error: 'metadata.schema_version must be a number.' };
  }

  if (version === LEGACY_BACKUP_VERSION) {
    if (schema_version !== undefined && schema_version !== LEGACY_SCHEMA_VERSION) {
      return {
        isValid: false,
        error: `Unsupported legacy schema version: ${String(schema_version)}. File backup này không được hỗ trợ bởi phiên bản hiện tại.`,
      };
    }

    return { isValid: true };
  }

  if (schema_version === undefined) {
    return { isValid: false, error: `metadata.schema_version is required for backup version ${version}.` };
  }

  if (version === CURRENT_BACKUP_VERSION && schema_version !== CURRENT_SCHEMA_VERSION) {
    return {
      isValid: false,
      error: `Unsupported schema version: ${String(schema_version)} for backup version ${version}. Only schema ${CURRENT_SCHEMA_VERSION} is supported. File backup này không được hỗ trợ bởi phiên bản hiện tại.`,
    };
  }

  return { isValid: true };
}

function validateField(section: string, index: number, row: BackupRow, fieldName: string, rule: FieldRule): string | null {
  const value = row[fieldName];

  if (value === undefined) {
    return rule.required ? `${section}[${index}].${fieldName} is required` : null;
  }

  if (value === null) {
    return rule.nullable ? null : `${section}[${index}].${fieldName} cannot be null`;
  }

  if (typeof value !== rule.type) {
    return `${section}[${index}].${fieldName} must be a ${rule.type}`;
  }

  if (rule.type === 'string' && rule.required && String(value).trim() === '') {
    return `${section}[${index}].${fieldName} cannot be empty`;
  }

  if (rule.type === 'number' && !Number.isFinite(value)) {
    return `${section}[${index}].${fieldName} must be a finite number`;
  }

  if (rule.enum && !rule.enum.includes(value)) {
    return `${section}[${index}].${fieldName} has unsupported value: ${String(value)}`;
  }

  return null;
}

function validateSection(sectionName: string, rows: unknown, schema: SectionSchema): ValidationResult {
  if (rows === undefined) {
    return schema.required
      ? { isValid: false, error: `Missing required section: ${sectionName}` }
      : { isValid: true };
  }

  if (!Array.isArray(rows)) {
    return { isValid: false, error: `Section ${sectionName} must be an array` };
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!isPlainObject(row)) {
      return { isValid: false, error: `${sectionName}[${index}] must be an object` };
    }

    for (const [fieldName, rule] of Object.entries(schema.fields)) {
      const error = validateField(sectionName, index, row, fieldName, rule);
      if (error) return { isValid: false, error };
    }
  }

  return { isValid: true };
}

function validateUniqueIds(sectionName: string, rows: BackupRow[], idField = 'id'): ValidationResult {
  const seen = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const id = rows[index][idField];
    if (typeof id !== 'string' || id.trim() === '') {
      return { isValid: false, error: `${sectionName}[${index}].${idField} is required` };
    }
    if (seen.has(id)) {
      return { isValid: false, error: `${sectionName} contains duplicate id: ${id}` };
    }
    seen.add(id);
  }

  return { isValid: true };
}

function validatePositiveAmount(sectionName: string, rows: BackupRow[], amountField: string): ValidationResult {
  for (let index = 0; index < rows.length; index += 1) {
    const value = rows[index][amountField];
    if (typeof value === 'number' && value <= 0) {
      return { isValid: false, error: `${sectionName}[${index}].${amountField} must be greater than 0` };
    }
  }

  return { isValid: true };
}

function validateTimestamp(sectionName: string, rows: BackupRow[], fieldName: string, required = true): ValidationResult {
  for (let index = 0; index < rows.length; index += 1) {
    const value = rows[index][fieldName];
    if (value === null || value === undefined) {
      if (!required) continue;
      return { isValid: false, error: `${sectionName}[${index}].${fieldName} is required` };
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(new Date(value).getTime())) {
      return { isValid: false, error: `${sectionName}[${index}].${fieldName} is not a valid date` };
    }
  }

  return { isValid: true };
}

function validateDateString(sectionName: string, rows: BackupRow[], fieldName: string): ValidationResult {
  for (let index = 0; index < rows.length; index += 1) {
    const value = rows[index][fieldName];
    if (value === null || value === undefined || value === '') continue;
    if (typeof value !== 'string' || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
      return { isValid: false, error: `${sectionName}[${index}].${fieldName} is not a valid date` };
    }
  }

  return { isValid: true };
}

function validateReferences(payload: BackupPayload): ValidationResult {
  const walletIds = new Set(payload.wallets.map((row) => row.id));
  const categoryIds = new Set(payload.categories.map((row) => row.id));
  const transactionIds = new Set(payload.transactions.map((row) => row.id));
  const loanIds = new Set(payload.loans.map((row) => row.id));

  for (let index = 0; index < payload.transactions.length; index += 1) {
    const row = payload.transactions[index];
    if (!walletIds.has(row.wallet_id)) {
      return { isValid: false, error: `transactions[${index}].wallet_id references a missing wallet` };
    }
    if (!categoryIds.has(row.category_id)) {
      return { isValid: false, error: `transactions[${index}].category_id references a missing category` };
    }
    if (row.to_wallet_id !== null && row.to_wallet_id !== undefined && !walletIds.has(row.to_wallet_id)) {
      return { isValid: false, error: `transactions[${index}].to_wallet_id references a missing wallet` };
    }
  }

  for (let index = 0; index < payload.budgets.length; index += 1) {
    const row = payload.budgets[index];
    if (!categoryIds.has(row.category_id)) {
      return { isValid: false, error: `budgets[${index}].category_id references a missing category` };
    }
    if (row.wallet_id !== null && row.wallet_id !== undefined && !walletIds.has(row.wallet_id)) {
      return { isValid: false, error: `budgets[${index}].wallet_id references a missing wallet` };
    }
  }

  for (let index = 0; index < payload.recurring_bills.length; index += 1) {
    const row = payload.recurring_bills[index];
    if (!walletIds.has(row.wallet_id)) {
      return { isValid: false, error: `recurring_bills[${index}].wallet_id references a missing wallet` };
    }
    if (!categoryIds.has(row.category_id)) {
      return { isValid: false, error: `recurring_bills[${index}].category_id references a missing category` };
    }
  }

  for (let index = 0; index < payload.loans.length; index += 1) {
    const row = payload.loans[index];
    if (row.wallet_id !== null && row.wallet_id !== undefined && !walletIds.has(row.wallet_id)) {
      return { isValid: false, error: `loans[${index}].wallet_id references a missing wallet` };
    }
    if (
      row.linked_transaction_id !== null &&
      row.linked_transaction_id !== undefined &&
      !transactionIds.has(row.linked_transaction_id)
    ) {
      return { isValid: false, error: `loans[${index}].linked_transaction_id references a missing transaction` };
    }
  }

  for (let index = 0; index < payload.loan_payments.length; index += 1) {
    const row = payload.loan_payments[index];
    if (!loanIds.has(row.loan_id)) {
      return { isValid: false, error: `loan_payments[${index}].loan_id references a missing loan` };
    }
    if (!walletIds.has(row.wallet_id)) {
      return { isValid: false, error: `loan_payments[${index}].wallet_id references a missing wallet` };
    }
  }

  return { isValid: true };
}

function validateNormalizedBackup(payload: BackupPayload): ValidationResult {
  const idSections: Array<[keyof BackupPayload, string]> = [
    ['wallets', 'wallets'],
    ['categories', 'categories'],
    ['transactions', 'transactions'],
    ['recurring_bills', 'recurring_bills'],
    ['budgets', 'budgets'],
    ['error_logs', 'error_logs'],
    ['loans', 'loans'],
    ['loan_payments', 'loan_payments'],
  ];

  for (const [key, label] of idSections) {
    const result = validateUniqueIds(label, payload[key] as BackupRow[]);
    if (!result.isValid) return result;
  }

  const numericChecks = [
    validatePositiveAmount('transactions', payload.transactions, 'amount'),
    validatePositiveAmount('recurring_bills', payload.recurring_bills, 'amount'),
    validatePositiveAmount('budgets', payload.budgets, 'amount'),
    validatePositiveAmount('loans', payload.loans, 'principal'),
    validatePositiveAmount('loan_payments', payload.loan_payments, 'amount'),
    validateTimestamp('wallets', payload.wallets, 'created_at'),
    validateTimestamp('wallets', payload.wallets, 'updated_at'),
    validateTimestamp('categories', payload.categories, 'created_at'),
    validateTimestamp('categories', payload.categories, 'updated_at'),
    validateTimestamp('transactions', payload.transactions, 'transaction_date'),
    validateTimestamp('transactions', payload.transactions, 'created_at'),
    validateTimestamp('transactions', payload.transactions, 'updated_at'),
    validateTimestamp('transactions', payload.transactions, 'deleted_at', false),
    validateTimestamp('recurring_bills', payload.recurring_bills, 'next_due_date'),
    validateTimestamp('budgets', payload.budgets, 'start_date'),
    validateTimestamp('budgets', payload.budgets, 'end_date', false),
    validateTimestamp('loan_payments', payload.loan_payments, 'payment_date'),
    validateDateString('loans', payload.loans, 'loan_date'),
    validateDateString('loans', payload.loans, 'due_date'),
    validateReferences(payload),
  ];

  return numericChecks.find((result) => !result.isValid) ?? { isValid: true };
}

function validateLegacyV1(payload: BackupRow): ValidationResult {
  for (const [sectionName, sectionSchema] of Object.entries(LEGACY_V1_SCHEMAS)) {
    const result = validateSection(sectionName, payload[sectionName], sectionSchema);
    if (!result.isValid) {
      return {
        isValid: false,
        error: `Legacy backup ${result.error}`,
      };
    }
  }

  return { isValid: true };
}

function rows(value: unknown): BackupRow[] {
  return Array.isArray(value) ? value.filter(isPlainObject).map((row) => ({ ...row })) : [];
}

function normalizeLegacyV1(payload: BackupRow): BackupPayload {
  const metadata = payload.metadata as BackupMetadata;

  return {
    metadata: {
      version: CURRENT_BACKUP_VERSION,
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: metadata.exported_at,
      app_version: metadata.app_version,
    },
    wallets: rows(payload.wallets).map((row) => ({
      ...row,
      currency: row.currency ?? 'VND',
      account_type: row.account_type ?? row.type ?? 'cash',
      icon: row.icon ?? null,
      color: row.color ?? null,
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active ?? 1,
      exclude_from_total: row.exclude_from_total ?? 0,
      credit_limit: row.credit_limit ?? null,
      statement_day: row.statement_day ?? null,
      due_day: row.due_day ?? null,
      annual_fee: row.annual_fee ?? null,
    })),
    categories: rows(payload.categories).map((row) => ({
      ...row,
      icon: row.icon ?? null,
      color: row.color ?? null,
      description: row.description ?? null,
    })),
    transactions: rows(payload.transactions).map((row) => ({
      ...row,
      note: row.note ?? null,
      receipt_path: row.receipt_path ?? null,
      to_wallet_id: row.to_wallet_id ?? null,
      deleted_at: row.deleted_at ?? null,
      exclude_from_total: row.exclude_from_total ?? 0,
    })),
    recurring_bills: rows(payload.recurring_bills).map((row) => ({
      ...row,
      reminder_days: row.reminder_days ?? 3,
      is_active: row.is_active ?? 1,
    })),
    app_settings: rows(payload.app_settings),
    budgets: rows(payload.budgets).map((row) => ({
      ...row,
      wallet_id: row.wallet_id ?? null,
      account_type_scope: row.account_type_scope ?? null,
      end_date: row.end_date ?? null,
      is_active: row.is_active ?? 1,
    })),
    error_logs: rows(payload.error_logs).map((row) => ({
      ...row,
      context: row.context ?? null,
      stack: row.stack ?? null,
      metadata_json: row.metadata_json ?? null,
    })),
    loans: rows(payload.loans).map((row) => ({
      ...row,
      wallet_id: row.wallet_id ?? null,
      contact_info: row.contact_info ?? null,
      loan_date: row.loan_date ?? null,
      due_date: row.due_date ?? null,
      note: row.note ?? null,
      status: row.status ?? 'active',
      deleted_at: row.deleted_at ?? null,
      skip_transaction: row.skip_transaction ?? 0,
      linked_transaction_id: row.linked_transaction_id ?? null,
    })),
    loan_payments: rows(payload.loan_payments).map((row) => ({
      ...row,
      note: row.note ?? null,
    })),
  };
}

export function validateBackupPayload(payload: unknown): ValidationResult {
  if (!isPlainObject(payload)) {
    return { isValid: false, error: 'Invalid file format' };
  }

  const metadataResult = validateMetadata(payload);
  if (!metadataResult.isValid) return metadataResult;

  const version = (payload.metadata as BackupRow).version;
  if (version === LEGACY_BACKUP_VERSION) {
    const legacyResult = validateLegacyV1(payload);
    if (!legacyResult.isValid) return legacyResult;
    return validateNormalizedBackup(normalizeLegacyV1(payload));
  }

  const schema = BACKUP_SCHEMAS[String(version)];
  for (const [sectionName, sectionSchema] of Object.entries(schema)) {
    const result = validateSection(sectionName, payload[sectionName], sectionSchema);
    if (!result.isValid) return result;
  }

  return validateNormalizedBackup(payload as unknown as BackupPayload);
}

export function normalizeBackupPayload(payload: unknown): BackupPayload {
  const validation = validateBackupPayload(payload);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid backup file');
  }

  const backup = payload as BackupRow;
  const version = (backup.metadata as BackupRow).version;
  if (version === LEGACY_BACKUP_VERSION) {
    return normalizeLegacyV1(backup);
  }

  return {
    ...(backup as unknown as BackupPayload),
    metadata: {
      ...(backup.metadata as BackupMetadata),
      app_name: (backup.metadata as BackupMetadata).app_name ?? 'TaiXiuCaNhan',
    },
    transactions: rows(backup.transactions).map((row) => ({
      ...row,
      exclude_from_total: row.exclude_from_total ?? 0,
    })),
  };
}

export function assertBackupPayload(payload: unknown): asserts payload is BackupPayload {
  const validation = validateBackupPayload(payload);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid backup file');
  }
}
