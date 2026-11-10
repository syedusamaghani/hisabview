import { useMemo, useState, type FormEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { SaveSuccess } from '../components/SaveSuccess';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { partiesRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { loadBook, notYetCustomers, searchBook } from '../lib/contactBook';
import { contactPickerSupported, pickContact } from '../lib/contacts';
import { similarParties } from '../lib/partyText';
import { goBack, navigate } from '../lib/router';

// Came here from "Diye / Mile"? Then after saving, go straight on to writing that entry.
const thenKind = (): 'diye' | 'mile' | null => {
  const then = new URLSearchParams(window.location.search).get('then');
  return then === 'diye' || then === 'mile' ? then : null;
};

// Add a customer: name, pehchaan (to tell same names apart) and phone (optional).
// If a similar name already exists, we show it and gently suggest a pehchaan.
export function AddPartyScreen() {
  const { t } = useT();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const existing = useLive(() => partiesRepo.listActive(), []);
  const similar = useMemo(() => similarParties(name, existing ?? []), [name, existing]);
  const ready = name.trim().length > 0;
  // Contacts the person added to the app, matching what is typed
  const [book] = useState(loadBook);
  const suggestions = useMemo(() => (name.trim().length >= 2 ? searchBook(notYetCustomers(book, existing ?? []), name, 3) : []), [name, book, existing]);

  const pick = async () => {
    const contact = await pickContact();
    if (!contact) return;
    if (contact.name && !name.trim()) setName(contact.name);
    if (contact.phone) setPhone(contact.phone);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const { party } = await partiesRepo.create({ name, identifier, phone });
      setSavedId(party.id);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('newCustomer')} onBack={() => goBack('/')} />
      <form id="party-form" onSubmit={submit} className="flex flex-col gap-4 px-gutter pt-5">
        <TextField
          label={t('nameLabel')}
          placeholder={t('namePlaceholder')}
          value={name}
          maxLength={80}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label={t('fromContacts')}>
            {suggestions.map((c) => (
              <Chip
                key={c.phone}
                onClick={() => {
                  setName(c.name);
                  setPhone(c.phone);
                }}
              >
                {c.name} · {c.phone}
              </Chip>
            ))}
          </div>
        )}

        {similar.length > 0 && (
          <Card tone="soft" aria-live="polite" className="flex flex-col gap-2">
            <p className="text-body font-extrabold text-primary">{t('similarTitle')}</p>
            <ul className="flex flex-col gap-1">
              {similar.map((p) => (
                <li key={p.id} dir="auto" className="text-body font-bold">
                  {p.name}
                  {p.identifier && <span className="font-normal text-inkSoft"> ({p.identifier})</span>}
                </li>
              ))}
            </ul>
            <p className="text-label text-inkSoft">{identifier.trim() ? t('similarHintWithId') : t('similarHintNoId')}</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <TextField
            label={t('identifierLabel')}
            placeholder={t('identifierPlaceholder')}
            hint={t('identifierHelp')}
            value={identifier}
            maxLength={80}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {(['example1', 'example2', 'example3', 'example4'] as const).map((key) => (
              <Chip key={key} onClick={() => setIdentifier(t(key))}>{t(key)}</Chip>
            ))}
          </div>
        </div>

        <TextField
          label={t('phoneLabel')}
          placeholder={t('phonePlaceholder')}
          inputMode="tel"
          dir="ltr"
          value={phone}
          maxLength={20}
          onChange={(e) => setPhone(e.target.value)}
          right={contactPickerSupported() ? <IconButton icon="userPlus" label={t('pickContact')} onClick={pick} /> : undefined}
        />

        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </form>

      <BottomActionBar>
        <BigButton full size="lg" type="submit" form="party-form" disabled={!ready || saving}>
          {t('save')}
        </BigButton>
      </BottomActionBar>

      <SaveSuccess show={savedId !== null} label={t('saved')} duration={900} onDone={() => savedId && navigate(`/party/${savedId}${thenKind() ? `/${thenKind()}` : ''}`, { replace: true })} />
    </main>
  );
}
