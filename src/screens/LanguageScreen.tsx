import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { text, type Lang } from '../i18n/translations';

// The very first screen: two big cards, one for each language. One tap and we are on our way.
// The question is shown in BOTH languages, because the person has not chosen yet.
export function LanguageScreen() {
  const { setLang } = useT();

  const card =
    'flex min-h-[150px] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-primary bg-surface px-4 py-5 text-center shadow-card ' +
    'transition-transform duration-fast active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent';

  const choose = (lang: Lang) => () => setLang(lang);

  return (
    <main className="mx-auto min-h-screen max-w-app">
      <ScreenHeader title="HisabView" />
      <div className="flex flex-col gap-4 px-gutter pt-6">
        <div className="text-center">
          <h2 className="latin text-title font-extrabold text-ink">{text.langTitle.ro}</h2>
          <p lang="ur" dir="rtl" className="mt-1 font-urdu text-title font-extrabold text-ink">{text.langTitle.ur}</p>
        </div>

        <button type="button" onClick={choose('ro')} className={card}>
          <span className="latin text-display font-extrabold text-primary">{text.langRo.ro}</span>
          <span className="latin text-body text-inkSoft">{text.langRoSample.ro}</span>
        </button>

        <button type="button" onClick={choose('ur')} lang="ur" dir="rtl" className={card}>
          <span className="font-urdu text-[40px] font-bold leading-tight text-primary">{text.langUr.ur}</span>
          <span className="font-urdu text-body text-inkSoft">{text.langUrSample.ur}</span>
        </button>
      </div>
    </main>
  );
}
