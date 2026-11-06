import { useState, type FormEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { partiesRepo } from '../data';
import { useT } from '../i18n/i18n';
import { contactPickerSupported, pickContact } from '../lib/contacts';
import { normalizePhone } from '../lib/whatsapp';

// "Save the WhatsApp number once": after this, Yaad dilao and Hisaab bhejo open this person's own chat.
// The number can come from the phone's contacts (one tap) or be typed. It is saved on the customer.
export function PhoneCard({ partyId }: { partyId: string }) {
  const { t } = useT();
  const [phone, setPhone] = useState('');
  const [bad, setBad] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (raw: string) => {
    if (saving) return;
    if (normalizePhone(raw) === null) {
      setBad(true);
      return;
    }
    setSaving(true);
    setBad(false);
    try {
      await partiesRepo.update(partyId, { phone: raw.trim() });
      // The screen reads the customer live, so it now sees the number and opens the chat directly
    } catch {
      setBad(true);
      setSaving(false);
    }
  };

  const pick = async () => {
    const contact = await pickContact();
    if (!contact?.phone) return;
    setPhone(contact.phone);
    void save(contact.phone);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(phone);
  };

  return (
    <Card tone="soft" className="flex flex-col gap-3">
      <div>
        <p className="text-body font-extrabold text-primary">{t('addPhoneTitle')}</p>
        <p className="text-label text-inkSoft">{t('addPhoneBody')}</p>
      </div>
      {contactPickerSupported() && (
        <BigButton full variant="ghost" icon="userPlus" onClick={pick} disabled={saving}>{t('pickContact')}</BigButton>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          label={t('phoneNumberLabel')}
          placeholder={t('phonePlaceholder')}
          inputMode="tel"
          dir="ltr"
          value={phone}
          maxLength={20}
          onChange={(e) => {
            setPhone(e.target.value);
            setBad(false);
          }}
        />
        {bad && <p role="alert" className="rounded-card bg-accent px-4 py-2 text-label font-extrabold text-accentInk">{t('phoneInvalid')}</p>}
        <BigButton full type="submit" disabled={saving || phone.trim().length === 0}>{t('save')}</BigButton>
      </form>
    </Card>
  );
}
