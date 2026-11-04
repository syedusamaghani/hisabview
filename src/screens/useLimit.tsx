import { useState, type ReactNode } from 'react';
import { BigButton } from '../components/BigButton';
import { useT } from '../i18n/i18n';

// A long list is drawn in pieces: the first 60, then "Aur dikhao". A phone with a thousand customers
// stays quick, and searching still looks through everyone.
export function useLimit<T>(items: readonly T[], limit = 60): { shown: readonly T[]; more: ReactNode } {
  const { t } = useT();
  const [all, setAll] = useState(false);
  const hidden = all ? 0 : Math.max(0, items.length - limit);
  return {
    shown: hidden > 0 ? items.slice(0, limit) : items,
    more:
      hidden > 0 ? (
        <BigButton full variant="ghost" onClick={() => setAll(true)}>
          {t('showMore').replace('{n}', String(hidden))}
        </BigButton>
      ) : null,
  };
}
