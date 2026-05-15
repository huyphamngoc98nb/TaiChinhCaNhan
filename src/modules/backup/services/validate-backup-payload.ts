import { BackupPayload, BackupRow, ValidationResult } from '../domain/backup.model';
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

const ACCOUNT_TYPES = ['cash', 'bank', 'credit_card', 'e_wallet', 'investment', 'other'] as const;
const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
const CATEGORY_TYPES = ['income', 'expense'] as const;
const BUDGET_PERIODS = ['weekly', 'monthly'] as const;
const BILL_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const ACTIVE_FLAGS = [0, 1] as const;
const RECURRING_ACTIVE_FLAGS = [-1, 0, 1] as const;

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
        icon: { type: 'string', nullable: true },
        color: { type: 'string', nullable: true },
        sort_order: { type: 'number', required: true },
        is_active: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        exclude_from_total: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        credit_limit: { type: 'number', nullable: true },
        statement_day: { type: 'number', nullable: true },
        due_day: { type: 'number', nullable: true },
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
        icon: { type: 'string', nullable: true },
        color: { type: 'string', nullable: true },
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
        receipt_path: { type: 'string', nullable: true },
        transaction_date: { type: 'number', required: true },
        to_wallet_id: { type: 'string', nullable: true },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
        deleted_at: { type: 'number', nullable: true },
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
        wallet_id: { type: 'string', nullable: true },
        account_type_scope: { type: 'string', nullable: true, enum: ACCOUNT_TYPES },
        amount: { type: 'number', required: true },
        period: { type: 'string', required: true, enum: BUDGET_PERIODS },
        start_date: { type: 'number', required: true },
        end_date: { type: 'number', nullable: true },
        is_active: { type: 'number', required: true, enum: ACTIVE_FLAGS },
        created_at: { type: 'number', required: true },
        updated_at: { type: 'number', required: true },
      },
    },
  },
};

const LEGACY_V1_SECTIONS = ['metadata', 'wallets', 'categories', 'transactions', 'recurring_bills', 'app_settings'];

function isPlainObject(value: unknown): value is BackupRow {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateMetadata(payload: BackupRow): ValidationResult {
  if (!isPlainObject(payload.metadata)) {
    return { isValid: false, error: 'Invalid or missing metadata' };
  }

  const { version, schema_version, exported_at, app_version } = payload.metadata;
  if (typeof version !== 'string' || typeof exported_at !== 'number' || typeof app_version !== 'string') {
    return { isValid: false, error: 'Invalid or missing metadata' };
  }

  if (!BACKUP_SCHEMAS[version] && version !== '1.0') {
    return { isValid: false, error: `Unsupported backup version: ${version}` };
  }

  if (version === CURRENT_BACKUP_VERSION) {
    if (schema_version !== CURRENT_SCHEMA_VERSION) {
      return {
        isValid: false,
        error: `Unsupported schema version: ${String(schema_version)}`,
      };
    }
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

function validateLegacyV1(payload: BackupRow): ValidationResult {
  for (const section of LEGACY_V1_SECTIONS) {
    if (!(section in payload)) {
      return { isValid: false, error: `Missing required section: ${section}` };
    }
  }

  for (const section of LEGACY_V1_SECTIONS.filter((section) => section !== 'metadata')) {
    if (!Array.isArray(payload[section])) {
      return { isValid: false, error: `Section ${section} must be an array` };
    }
  }

  return { isValid: true };
}

export function validateBackupPayload(payload: unknown): ValidationResult {
  if (!isPlainObject(payload)) {
    return { isValid: false, error: 'Invalid file format' };
  }

  const metadataResult = validateMetadata(payload);
  if (!metadataResult.isValid) return metadataResult;

  const version = (payload.metadata as BackupRow).version;
  if (version === '1.0') return validateLegacyV1(payload);

  const schema = BACKUP_SCHEMAS[String(version)];
  for (const [sectionName, sectionSchema] of Object.entries(schema)) {
    const result = validateSection(sectionName, payload[sectionName], sectionSchema);
    if (!result.isValid) return result;
  }

  return { isValid: true };
}

export function assertBackupPayload(payload: unknown): asserts payload is BackupPayload {
  const validation = validateBackupPayload(payload);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid backup file');
  }
}
