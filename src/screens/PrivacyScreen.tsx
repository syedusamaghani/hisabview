import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { text, type TextKey } from '../i18n/translations';

// The privacy policy, in plain words, in both languages. It opens without logging in (the address
// /privacy), because Google and every new person must be able to read it before they trust us.
// The contact email comes from the VITE_CONTACT_EMAIL setting; without it only the in-app route is shown.
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

const SECTIONS: [TextKey, TextKey][] = [
  ['privacy1T', 'privacy1B'],
  ['privacy2T', 'privacy2B'],
  ['privacy3T', 'privacy3B'],
  ['privacy4T', 'privacy4B'],
  ['privacy5T', 'privacy5B'],
  ['privacy6T', 'privacy6B'],
  ['privacy7T', 'privacy7B'],
  ['privacy8T', 'privacy8B'],
  ['privacy9T', 'privacy9B'],
  ['privacy10T', 'privacy10B'],
];

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang } = useT();
  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('privacyTitle')} subtitle={t('privacyUpdated')} onBack={onBack} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        {/* The visitor may not have chosen a language yet: one tap switches the whole page */}
        <div className="flex flex-wrap gap-2">
          {(['ro', 'en', 'ur'] as const).filter((l) => l !== lang).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              lang={l === 'ur' ? 'ur' : 'en'}
              className="min-h-tap rounded-full border-[1.5px] border-line bg-surface px-5 text-body font-bold text-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent"
            >
              {l === 'ur' ? text.langUr.ur : l === 'en' ? text.langEn.ro : text.langRo.ro}
            </button>
          ))}
        </div>
        <p className="text-body text-inkSoft">{t('privacyIntro')}</p>
        {SECTIONS.map(([title, body]) => (
          <Card key={title} className="flex flex-col gap-2">
            <h2 className="text-body font-extrabold text-ink">{t(title)}</h2>
            <p className="text-body leading-relaxed text-inkSoft">
              {t(body)}
              {body === 'privacy10B' && CONTACT_EMAIL && (
                <>
                  {' '}
                  {t('privacyEmail')} <bdi className="font-bold text-ink">{CONTACT_EMAIL}</bdi>
                </>
              )}
              {body === 'privacy10B' && '.'}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
