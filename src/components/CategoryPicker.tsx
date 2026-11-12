import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { cx } from '../lib/cx';
import { CATEGORY_TEXT, EXPENSE_CATEGORIES, cleanCategory, isBuiltInCategory } from '../lib/expenses';
import { BigButton } from './BigButton';
import { TextField } from './TextField';

// "Kharcha kis cheez ka?": the five built-in categories, the ones the shopkeeper typed before, and one tap to
// type a new name. Choosing is optional (tap the chosen one again to clear it). Never red or green.
export function CategoryPicker({ value, onChange, custom }: { value: string | null; onChange: (next: string | null) => void; custom: string[] }) {
  const { t } = useT();
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  // A name just typed is shown at once, even before it has ever been saved on an entry
  const typed = value && !isBuiltInCategory(value) && !custom.includes(value) ? [value] : [];
  const names = [...EXPENSE_CATEGORIES.map((c) => ({ key: c as string, label: t(CATEGORY_TEXT[c]) })), ...[...typed, ...custom].map((c) => ({ key: c, label: c }))];

  const add = () => {
    const clean = cleanCategory(draft);
    if (!clean) return;
    onChange(clean);
    setTyping(false);
    setDraft('');
  };

  return (
    <div>
      <p className="mb-2 text-label font-bold text-inkSoft">{t('catTitle')}</p>
      <div role="radiogroup" aria-label={t('catTitle')} className="flex flex-wrap gap-2">
        {names.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(value === key ? null : key)}
            className={cx(
              'min-h-tap max-w-full rounded-full border-2 px-4 text-body font-extrabold transition-colors duration-fast',
              'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
              value === key ? 'border-primary bg-primarySoft text-primary' : 'border-line bg-surface text-ink',
            )}
          >
            <span dir="auto" className="block truncate">{label}</span>
          </button>
        ))}
        {!typing && (
          <button
            type="button"
            onClick={() => setTyping(true)}
            className="min-h-tap rounded-full border-2 border-dashed border-line bg-surface px-4 text-body font-extrabold text-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            + {t('catNew')}
          </button>
        )}
      </div>
      {typing && (
        <div className="mt-3 flex flex-col gap-2">
          <TextField label={t('catNewLabel')} placeholder={t('catNewPlaceholder')} value={draft} maxLength={40} autoFocus onChange={(e) => setDraft(e.target.value)} />
          <BigButton full variant="ghost" onClick={add} disabled={!cleanCategory(draft)}>{t('catAdd')}</BigButton>
        </div>
      )}
    </div>
  );
}
