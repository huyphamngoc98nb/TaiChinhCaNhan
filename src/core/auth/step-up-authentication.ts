import { appLockClock } from '@/app/providers/app-lock-clock';

export type StepUpAuthenticationAction =
  | 'EXPORT_DATA'
  | 'RESTORE_DATA'
  | 'DELETE_ALL_DATA'
  | 'CHANGE_PIN'
  | 'CHANGE_BIOMETRIC_SETTINGS';

export type StepUpAuthenticationResult =
  | 'SUCCESS'
  | 'CANCELLED'
  | 'FAILED'
  | 'NOT_AVAILABLE'
  | 'LOCKED_OUT';

type StepUpAuthenticationHandler = (
  action: StepUpAuthenticationAction,
) => Promise<StepUpAuthenticationResult>;
type StepUpAuthenticationInvalidationHandler = () => void;

const STEP_UP_CACHE_MS = 5 * 60 * 1000;
const ALWAYS_FRESH_ACTIONS = new Set<StepUpAuthenticationAction>([
  'RESTORE_DATA',
  'DELETE_ALL_DATA',
  'CHANGE_PIN',
]);

let handler: StepUpAuthenticationHandler | null = null;
let invalidationHandler: StepUpAuthenticationInvalidationHandler | null = null;
let authenticatedAt: number | null = null;
let requestQueue = Promise.resolve();

export function registerStepUpAuthenticationHandler(
  nextHandler: StepUpAuthenticationHandler,
): () => void {
  handler = nextHandler;
  return () => {
    if (handler === nextHandler) handler = null;
  };
}

export function invalidateStepUpAuthentication(): void {
  authenticatedAt = null;
  invalidationHandler?.();
}

export function registerStepUpAuthenticationInvalidationHandler(
  nextHandler: StepUpAuthenticationInvalidationHandler,
): () => void {
  invalidationHandler = nextHandler;
  return () => {
    if (invalidationHandler === nextHandler) invalidationHandler = null;
  };
}

export async function requireStepUpAuthentication(
  action: StepUpAuthenticationAction,
): Promise<StepUpAuthenticationResult> {
  const runRequest = async (): Promise<StepUpAuthenticationResult> => {
    if (!ALWAYS_FRESH_ACTIONS.has(action) && authenticatedAt !== null) {
      const now = await appLockClock.now();
      if (Math.max(0, now - authenticatedAt) < STEP_UP_CACHE_MS) return 'SUCCESS';
      authenticatedAt = null;
    }

    if (!handler) return 'NOT_AVAILABLE';

    const result = await handler(action);
    if (result === 'SUCCESS') authenticatedAt = await appLockClock.now();
    return result;
  };
  const request = requestQueue.then(runRequest, runRequest);
  requestQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}
