// Error tracking without any outside service: when the app breaks, a short report (what, where, which
// version, which phone) goes to OUR Supabase table `error_log`. No customer or entry data is included.
// The report waits in the outbox until there is internet and a login. Read them in the Supabase dashboard.
import { outbox } from './outbox';

declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const MAX_PER_SESSION = 10;
let count = 0;
const seen = new Set<string>();

// Noise that is not our bug and would only fill the table
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i];

export function reportError(error: unknown, where = ''): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? 'unknown')).slice(0, 500);
  const stack = error instanceof Error && error.stack ? error.stack.slice(0, 4000) : null;
  if (IGNORE.some((re) => re.test(message))) return false;
  const signature = `${message}|${(stack ?? '').split('\n')[1] ?? ''}`;
  if (seen.has(signature) || count >= MAX_PER_SESSION) return false; // the same problem again and again is one report
  seen.add(signature);
  count += 1;
  outbox.add('error_log', {
    message: where ? `${where}: ${message}` : message,
    stack,
    path: window.location.pathname.slice(0, 200),
    app_version: APP_VERSION,
    user_agent: navigator.userAgent.slice(0, 300),
    created_at: new Date().toISOString(),
  });
  return true;
}

// Called once at start: anything the page did not catch is reported
export function installErrorReporting() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}

// Only for tests
export function resetReportingForTests() {
  count = 0;
  seen.clear();
}
