// Testing mode: a second, separate khata on this phone for trying things out.
// While it is on, the app uses its own empty database, nothing is sent to the internet,
// and the real khata is not touched at all. Turning it on always starts from empty.
import Dexie from 'dexie';

const FLAG = 'hv_testing';
export const REAL_DB_NAME = 'hisabview';
export const TEST_DB_NAME = 'hisabview_testing';

export function isTesting(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

// Wipe the testing khata, switch to it, and restart the app on it
export async function startTesting(): Promise<void> {
  await Dexie.delete(TEST_DB_NAME);
  try {
    localStorage.removeItem('hv_aliases_test');
    localStorage.setItem(FLAG, '1');
  } catch {
    return; // cannot remember the choice: stay on the real khata
  }
  window.location.replace('/');
}

// Go back to the real khata (the testing data is left until the next time testing starts)
export function stopTesting(): void {
  try {
    localStorage.removeItem(FLAG);
  } catch {
    // nothing to do
  }
  window.location.replace('/');
}
