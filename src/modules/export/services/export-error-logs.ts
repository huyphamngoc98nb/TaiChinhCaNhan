import type { ErrorLogRecord } from '@/core/telemetry/error-log.repository';

export interface ErrorLogExportItem {
  id: string;
  level: ErrorLogRecord['level'];
  message: string;
  context: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: number;
  created_at_iso: string;
}

export interface ErrorLogExportPayload {
  schema_version: 1;
  exported_at: string;
  count: number;
  logs: ErrorLogExportItem[];
}

function parseMetadata(metadataJson: string | null): Record<string, unknown> | null {
  if (!metadataJson) return null;

  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return { parse_error: 'Invalid metadata_json', raw: metadataJson };
  }
}

export function buildErrorLogExportPayload(
  records: ErrorLogRecord[],
  exportedAt = new Date()
): ErrorLogExportPayload {
  return {
    schema_version: 1,
    exported_at: exportedAt.toISOString(),
    count: records.length,
    logs: records.map((record) => ({
      id: record.id,
      level: record.level,
      message: record.message,
      context: record.context,
      stack: record.stack,
      metadata: parseMetadata(record.metadata_json),
      created_at: record.created_at,
      created_at_iso: new Date(record.created_at).toISOString(),
    })),
  };
}

export function exportErrorLogsToJson(records: ErrorLogRecord[]): string {
  return JSON.stringify(buildErrorLogExportPayload(records), null, 2);
}
