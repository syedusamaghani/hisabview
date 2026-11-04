// A very small router (no library): the page address decides the screen, and the phone's
// Back button works. Screens call navigate() and goBack().
import { useSyncExternalStore } from 'react';

const EVENT = 'hv-navigate';

type NavState = { idx: number };

const currentState = (): NavState => (window.history.state as NavState | null) ?? { idx: 0 };

export function navigate(path: string, options: { replace?: boolean } = {}) {
  const idx = currentState().idx;
  if (options.replace) window.history.replaceState({ idx }, '', path);
  else window.history.pushState({ idx: idx + 1 }, '', path);
  window.dispatchEvent(new Event(EVENT));
}

// Back one screen. If there is nothing behind us (the app was opened straight on this
// screen), go to the fallback instead so Back never does nothing.
export function goBack(fallback = '/') {
  if (currentState().idx > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

// "Write an entry" takes a few screens. When it is saved we want to land where it started
// (Home or the customer's page), not on the screen just before. beginFlow() remembers the start.
let flowStart: number | null = null;
export const beginFlow = () => {
  flowStart = currentState().idx;
};
export function finishFlow(fallback: string) {
  const back = flowStart === null ? 0 : currentState().idx - flowStart;
  flowStart = null;
  if (back > 0) window.history.go(-back);
  else goBack(fallback);
}

// A short message for the NEXT screen to show, for example "Entry saved. Wapas lo?".
// The screen that shows it takes it once.
export type Flash = { kind: 'undoEntry'; entryId: string } | { kind: 'undoArchive'; partyId: string };
let flash: Flash | null = null;
export const setFlash = (next: Flash) => {
  flash = next;
};
export function takeFlash(): Flash | null {
  const taken = flash;
  flash = null;
  return taken;
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

// The current address, for example "/party/abc123/diye"
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname.replace(/\/+$/, '') || '/');
}
