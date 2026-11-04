// "Add to Home Screen". Android Chrome offers the install box through an event that fires once, early,
// so we catch it at start (initInstall) and keep it until the shopkeeper taps "Install karein".
// iPhone Safari has no such box: there we only show the two steps.
import { useSyncExternalStore } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own friendly card instead of the browser's bar
    deferred = event as InstallPrompt;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

// Already opened from the home screen icon?
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const event = deferred;
  deferred = null; // the browser allows one use
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

export type InstallState = { canPrompt: boolean; iosSteps: boolean };

let snapshot: InstallState = { canPrompt: false, iosSteps: false };
const getSnapshot = (): InstallState => {
  const next = { canPrompt: deferred !== null && !installed && !isStandalone(), iosSteps: isIos() && !isStandalone() && !installed };
  if (next.canPrompt !== snapshot.canPrompt || next.iosSteps !== snapshot.iosSteps) snapshot = next;
  return snapshot;
};
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};

export const useInstall = (): InstallState => useSyncExternalStore(subscribe, getSnapshot);

// "Baad mein": do not ask again for a week
const KEY = 'hv_install_later';
const WEEK = 7 * 24 * 3_600_000;

export function installAskedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    return at > 0 && Date.now() - at < WEEK;
  } catch {
    return false;
  }
}

export function installAskLater() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // storage blocked: it will simply ask again next time
  }
}
