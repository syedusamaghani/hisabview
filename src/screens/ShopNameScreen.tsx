import { useState, type FormEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { shopsRepo } from '../data';
import { useT } from '../i18n/i18n';
import { shopLanguage } from '../i18n/translations';

// One question: what is your shop called? One big box, one button.
export function ShopNameScreen({ onCreated }: { onCreated: () => void }) {
  const { t, lang } = useT();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = name.trim().length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await shopsRepo.create({ shop_name: name, language: shopLanguage(lang) });
      onCreated();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <form id="shop-form" onSubmit={submit} className="flex flex-col gap-3 px-gutter pt-6">
        <h2 className="text-title font-extrabold text-ink">{t('shopNameTitle')}</h2>
        <p className="text-body text-inkSoft">{t('shopNameBody')}</p>
        <input
          dir={name ? 'auto' : undefined}
          autoFocus
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('shopNamePlaceholder')}
          aria-label={t('shopNameLabel')}
          enterKeyHint="done"
          className={
            'mt-2 min-h-tapLg w-full rounded-button border-[1.5px] border-line bg-surface px-4 text-title font-bold text-ink shadow-card ' +
            'placeholder:text-body placeholder:font-normal placeholder:text-inkSoft/90 focus:border-primary focus:outline focus:outline-[3px] focus:outline-accent'
          }
        />
        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </form>
      <BottomActionBar>
        <BigButton full size="lg" type="submit" form="shop-form" disabled={!ready || saving}>
          {t('next')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}
