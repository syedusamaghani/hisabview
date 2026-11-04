import { useEffect, useState } from 'react';
import { Snackbar } from '../components/Snackbar';
import { entriesRepo } from '../data';
import { useT } from '../i18n/i18n';
import { takeFlash } from '../lib/router';

type Snack = { message: 'entryAdded' | 'entryCancelled'; undoEntryId?: string };

// The message after saving an entry: "Entry likh di gayi" with "Wapas lo" for 10 seconds.
// Wapas lo cancels that entry (it stays in the database, marked cancelled, with an audit line).
// Used by every screen where we can land after saving.
export function useEntrySnack() {
  const { t } = useT();
  const [snack, setSnack] = useState<Snack | null>(null);

  useEffect(() => {
    const flash = takeFlash();
    if (flash?.kind === 'undoEntry') setSnack({ message: 'entryAdded', undoEntryId: flash.entryId });
  }, []);

  const undo = async () => {
    const id = snack?.undoEntryId;
    if (!id) return;
    await entriesRepo.cancel(id);
    setSnack({ message: 'entryCancelled' });
  };

  const snackbar = (
    <Snackbar
      open={snack !== null}
      message={snack ? t(snack.message) : ''}
      actionLabel={snack?.undoEntryId ? t('wapasLo') : undefined}
      duration={snack?.undoEntryId ? 10_000 : 4_000}
      onAction={() => void undo()}
      onClose={() => setSnack(null)}
    />
  );

  return { snackbar, notify: (message: Snack['message']) => setSnack({ message }), hide: () => setSnack(null) };
}
