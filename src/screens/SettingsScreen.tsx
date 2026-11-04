import { useState } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { ChoiceCard } from '../components/ChoiceCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { SwitchRow } from '../components/SwitchRow';
import { TextField } from '../components/TextField';
import { shopsRepo, type Language, type Shop } from '../data';
import { useT } from '../i18n/i18n';
import { useAuth } from '../state/auth';
import { usePrivacy } from '../state/privacy';

// Settings: language, hide amounts, shop name, logout.
export function SettingsScreen({ shop }: { shop: Shop }) {
  const { t, lang, setLang } = useT();
  const { hidden, toggle } = usePrivacy();
  const { signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shop.shop_name);
  const [failed, setFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const chooseLang = (next: Language) => {
    if (next === lang) return;
    setLang(next);
    void shopsRepo.update(shop.id, { language: next }); // remembered with the shop, and audited
  };

  const saveName = async () => {
    setFailed(false);
    try {
      await shopsRepo.update(shop.id, { shop_name: name });
      setEditing(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('navSettings')} />

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-label font-bold text-inkSoft">{t('langSection')}</h2>
          <div role="radiogroup" aria-label={t('langSection')} className="flex flex-col gap-3">
            <ChoiceCard title={t('langRo')} selected={lang === 'ro'} onSelect={() => chooseLang('ro')} className="!min-h-tap" />
            <ChoiceCard title={t('langUr')} selected={lang === 'ur'} onSelect={() => chooseLang('ur')} className="!min-h-tap font-urdu !text-title" />
          </div>
        </Card>

        <Card>
          <SwitchRow label={t('hideAmounts')} checked={hidden} onChange={toggle} />
        </Card>

        <Card className="flex flex-col gap-3">
          {editing ? (
            <>
              <TextField label={t('shopNameLabel')} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
              {failed && <p role="alert" className="text-body font-bold">{t('errorGeneric')}</p>}
              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <BigButton variant="ghost" onClick={() => { setEditing(false); setName(shop.shop_name); setFailed(false); }}>{t('cancelEdit')}</BigButton>
                <BigButton onClick={saveName} disabled={name.trim().length === 0}>{t('save')}</BigButton>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-label font-bold text-inkSoft">{t('shopNameLabel')}</p>
                <p dir="auto" className="text-title font-extrabold text-ink">{shop.shop_name}</p>
              </div>
              <BigButton full variant="ghost" icon="edit" onClick={() => setEditing(true)}>{t('badlo')}</BigButton>
            </>
          )}
        </Card>

        {loggingOut ? (
          <Card tone="soft" className="flex flex-col gap-3">
            <p className="text-body font-bold">{t('logoutAsk')}</p>
            <BigButton full onClick={signOut}>{t('yesLogout')}</BigButton>
            <BigButton full variant="ghost" onClick={() => setLoggingOut(false)}>{t('no')}</BigButton>
          </Card>
        ) : (
          <BigButton full variant="ghost" onClick={() => setLoggingOut(true)}>{t('logout')}</BigButton>
        )}
      </div>

      <BottomNav active="settings" />
    </main>
  );
}
