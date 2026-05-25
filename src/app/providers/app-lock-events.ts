export const APP_LOCK_SUSPEND_EVENT = 'app-lock:suspend';
export const APP_LOCK_RESUME_EVENT = 'app-lock:resume';

export function suspendAppLock() {
  window.dispatchEvent(new Event(APP_LOCK_SUSPEND_EVENT));
}

export function resumeAppLock() {
  window.dispatchEvent(new Event(APP_LOCK_RESUME_EVENT));
}
