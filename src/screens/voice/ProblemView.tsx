import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import type { ListenProblem } from '../../voice/speech';

// Something stopped the voice: no internet, no mic permission, nothing heard, or a phone that cannot do it.
// Always a friendly sentence and a way to carry on by hand (Diye / Mile), never a dead end.
export type Problem = ListenProblem;

const MESSAGE: Record<Problem, TextKey> = {
  unsupported: 'voiceUnsupported',
  offline: 'voiceOffline',
  denied: 'voiceDenied',
  no_speech: 'voiceNothing',
  bad_language: 'voiceError',
  other: 'voiceError',
};

type Props = { problem: Problem; onRetry: () => void; onType: () => void; onManual: (kind: 'diye' | 'mile') => void; onBack: () => void };

export function ProblemView({ problem, onRetry, onType, onManual, onBack }: Props) {
  const { t } = useT();
  // Trying again only helps when it can work: not on a phone without voice, not without permission
  const canRetry = problem === 'no_speech' || problem === 'other' || problem === 'bad_language' || problem === 'offline';
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('voiceTitle')} onBack={onBack} />
      <div className="flex flex-col items-center gap-5 px-gutter pt-10 text-center">
        <span aria-hidden="true" className="grid size-24 place-items-center rounded-full bg-primarySoft text-primary">
          <Icon name="mic" size={48} />
        </span>
        <Card className="w-full" role="alert">
          <p className="text-title font-extrabold leading-snug text-ink">{t(MESSAGE[problem])}</p>
        </Card>
        {canRetry && (
          <BigButton full icon="mic" variant={problem === 'no_speech' ? 'primary' : 'ghost'} onClick={onRetry}>{t('voiceRetry')}</BigButton>
        )}
        <BigButton full icon="edit" variant="ghost" onClick={onType}>{t('typeInstead')}</BigButton>
      </div>
      <BottomActionBar>
        <p className="mb-3 text-center text-label font-bold text-inkSoft">{t('writeByHand')}</p>
        <div className="grid grid-cols-2 gap-3">
          <BigButton size="lg" variant="diye" icon="up" onClick={() => onManual('diye')}>{t('diye')}</BigButton>
          <BigButton size="lg" variant="mile" icon="down" onClick={() => onManual('mile')}>{t('mile')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}
