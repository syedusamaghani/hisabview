import { useT } from '../i18n/i18n';
import type { CancelReason } from '../data/types';
import { BigButton } from './BigButton';

// "Why cancel it?": one tap on the reason cancels the entry (it replaces the old single "Haan, cancel karo" tap, so it is
// still one tap). The reason is saved with the entry and in the diary. "Nahi" goes back without cancelling.
type Props = { onPick: (reason: CancelReason) => void; onNo: () => void };

export function CancelReasons({ onPick, onNo }: Props) {
  const { t } = useT();
  return (
    <>
      <p className="text-body text-inkSoft">{t('cancelAsk')}</p>
      <p className="text-label font-bold text-inkSoft">{t('cancelWhy')}</p>
      <BigButton full onClick={() => onPick('wrong_entry')}>{t('reasonWrong')}</BigButton>
      <BigButton full variant="ghost" onClick={() => onPick('customer_refused')}>{t('reasonRefused')}</BigButton>
      <BigButton full variant="ghost" onClick={() => onPick('other')}>{t('reasonOther')}</BigButton>
      <BigButton full variant="ghost" onClick={onNo}>{t('no')}</BigButton>
    </>
  );
}
