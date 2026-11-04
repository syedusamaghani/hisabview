import { useEffect, useState } from 'react';
import { Snackbar } from '../components/Snackbar';
import { entriesRepo } from '../data';
import { useT } from '../i18n/i18n';
import { takeFlash } from '../lib/router';
import { openWhatsApp } from '../lib/whatsapp';
import { receiptLink } from './whatsappActions';

type Snack = { message: 'entryAdded' | 'entryCancelled'; undoEntryId?: string; whatsapp?: string };

// The message after saving an entry: "Entry likh di gayi" with "Wapas lo" for 10 seconds, and for an
// entry with a customer also "WhatsApp" (the receipt: amount and new balance, one tap).
// Wapas lo cancels that entry (it stays in the database, marked cancelled, with an audit line).
// Used by every screen where we can land after saving.
export function useEntrySnack() {
  const { t, lang } = useT();
  const [snack, setSnack] = useState<Snack | null>(null);

  useEffect(() => {
    const flash = takeFlash();
    if (flash?.kind !== 'undoEntry') return;
    const entryId = flash.entryId;
    setSnack({ message: 'entryAdded', undoEntryId: entryId });
    // The link is made ahead of time, so the WhatsApp button opens it the moment it is tapped
    void receiptLink(entryId, lang).then((link) => {
      if (link) setSnack((s) => (s?.undoEntryId === entryId ? { ...s, whatsapp: link } : s));
    });
    // Only once, when the screen opens
  }, []);

  const undo = async () => {
    const id = snack?.undoEntryId;
    if (!id) return;
    await entriesRepo.cancel(id);
    setSnack({ message: 'entryCancelled' });
  };

  const whatsapp = snack?.whatsapp;
  const snackbar = (
    <Snackbar
      open={snack !== null}
      message={snack ? t(snack.message) : ''}
      actionLabel={snack?.undoEntryId ? t('wapasLo') : undefined}
      secondaryLabel={whatsapp ? t('waLabel') : undefined}
      onSecondary={whatsapp ? () => openWhatsApp(whatsapp) : undefined}
      duration={snack?.undoEntryId ? 10_000 : 4_000}
      onAction={() => void undo()}
      onClose={() => setSnack(null)}
    />
  );

  return { snackbar, notify: (message: Snack['message']) => setSnack({ message }), hide: () => setSnack(null) };
}
