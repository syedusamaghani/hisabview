import { useState } from 'react';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { useT } from '../i18n/i18n';
import { addToBook, clearBook, loadBook } from '../lib/contactBook';
import { contactPickerSupported, pickManyContacts } from '../lib/contacts';

// "Add your phone's contacts once": the phone's own list opens, the person ticks everyone (or some),
// and the app keeps them on this phone to find names and numbers later. Nothing is sent to the internet.
export function ContactsCard({ onlyIfEmpty }: { onlyIfEmpty?: boolean }) {
  const { t } = useT();
  const [count, setCount] = useState(() => loadBook().length);
  const supported = contactPickerSupported();
  if (onlyIfEmpty && (count > 0 || !supported)) return null;

  const add = async () => {
    const picked = await pickManyContacts();
    if (picked) setCount(addToBook(picked).length);
  };

  return (
    <Card tone="soft" className="flex flex-col gap-3">
      <h2 className="text-body font-extrabold text-primary">{t('contactsTitle')}</h2>
      {supported ? (
        <>
          <p className="text-label text-inkSoft">{t('contactsBody')}</p>
          {count > 0 && <p className="text-label font-bold text-ink">{t('contactsCount').replace('{n}', String(count))}</p>}
          <BigButton full icon="userPlus" onClick={add}>{t('contactsAdd')}</BigButton>
          {count > 0 && (
            <BigButton
              full
              variant="ghost"
              onClick={() => {
                clearBook();
                setCount(0);
              }}
            >
              {t('contactsRemove')}
            </BigButton>
          )}
        </>
      ) : (
        <p className="text-label text-inkSoft">{t('contactsUnsupported')}</p>
      )}
    </Card>
  );
}
