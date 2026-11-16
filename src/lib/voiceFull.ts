// "Awaaz se poori entry (Beta)": the big mic on Home that understands a whole sentence. OFF by default.
// (The small mic for the amount, on the amount step, is always there where the phone can listen.)
import { useSyncExternalStore } from 'react';

const KEY = 'hv_voice_full';
const listeners = new Set<() => void>();

export const voiceFullOn = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export function setVoiceFull(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // stays off after a restart
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useVoiceFull = (): boolean => useSyncExternalStore(subscribe, voiceFullOn);
