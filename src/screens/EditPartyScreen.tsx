import { useEffect, useState, type FormEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { SaveSuccess } from '../components/SaveSuccess';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { partiesRepo, useLive, type Party } from '../data';
import { useT } from '../i18n/i18n';
import { contactPickerSupported, pickContact } from '../lib/contacts';
import { goBack, navigate } from '../lib/router';

// Fix a customer's name, pehchaan or phone. The change is saved in the diary (audit log) like everything else.
export function EditPartyScreen({ partyId }: { partyId: string }) {
  const party = useLive(async () => (await partiesRepo.get(partyId)) ?? null, [partyId]);
  useEffect(() => {
    if (party === null) navigate('/', { replace: true }); // not found: back to Home
  }, [party]);
  if (!party) return <main className="mx-auto min-h-screen max-w-app" />;
  return <EditForm party={party} />;
}

function EditForm({ party }: { party: Party }) {
  const { t } = useT();
  const [name, setName] = useState(party.name);
  const [identifier, setIdentifier] = useState(party.identifier ?? '');
  const [phone, setPhone] = useState(party.phone ?? '');
  const [limit, setLimit] = useState(party.credit_limit ? String(party.credit_limit) : ''); // udhaar limit, digits only (empty = no limit)
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const ready = name.trim().length > 0;

  const pick = async () => {
    const contact = await pickContact();
    if (contact?.phone) setPhone(contact.phone);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await partiesRepo.update(party.id, { name, identifier: identifier.trim() || null, phone: phone.trim() || null, ...(party.type === 'customer' ? { credit_limit: Number(limit) > 0 ? Number(limit) : null } : {}) });
      setSaved(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('editCustomerTitle')} onBack={() => goBack(`/party/${party.id}`)} />
      <form id="edit-party-form" onSubmit={submit} className="flex flex-col gap-4 px-gutter pt-5">
        <TextField label={t('nameLabel')} placeholder={t('namePlaceholder')} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
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
        {party.type === 'customer' && (
          <TextField
            label={t('creditLimitLabel')}
            hint={t('creditLimitHelp')}
            inputMode="numeric"
            dir="ltr"
            value={limit}
            maxLength={9}
            onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))}
          />
        )}
        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </form>
      <BottomActionBar>
        <BigButton full size="lg" type="submit" form="edit-party-form" disabled={!ready || saving}>{t('save')}</BigButton>
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('saved')} duration={900} onDone={() => navigate(`/party/${party.id}`, { replace: true })} />
    </main>
  );
}
