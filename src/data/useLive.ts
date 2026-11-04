// Keeps a screen up to date with the phone's database: when saved data changes, the screen
// refreshes by itself. Returns undefined until the first answer arrives.
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

export function useLive<T>(query: () => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: () => setValue(undefined),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
