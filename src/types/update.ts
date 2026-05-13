export interface BundleApplyResult {
  success: boolean;
  bundleVersion: string;
  status:
    | 'applied'
    | 'download_error'
    | 'sha256_mismatch'
    | 'signature_invalid'
    | 'extract_error'
    | 'already_active';
  durationMs: number;
}

export interface RollbackResult {
  success: boolean;
  status: 'rolled_back' | 'no_fallback' | 'rollback_error';
  rollbackCount?: number;
}
