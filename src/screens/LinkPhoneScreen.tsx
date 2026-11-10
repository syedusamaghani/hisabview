import { useEffect } from 'react';
import { BigButton } from '../components/BigButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { partiesRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { skipPhoneAsk } from '../lib/phoneAsk';
import { finishFlow } from '../lib/router';
import { PhoneCard } from './PhoneCard';

// Shown once after an entry is saved for a customer without a number: "Is this person in your contacts?"
export function LinkPhoneScreen({ partyId }: { partyId: string }) {
  const { t } = useT();
  const party = useLive(async () => (await partiesRepo.get(partyId)) ?? null, [partyId]);
  const done = () => finishFlow('/');

  // Number saved (or customer not found): carry on
  useEffect(() => {
    if (party === null || (party && party.phone)) done();
  }, [party]);

  if (!party) return <main className="mx-auto min-h-screen max-w-app" />;
  const later = () => {
    skipPhoneAsk(party.id);
    done();
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-8">
      <ScreenHeader title={party.name} subtitle={party.identifier ?? undefined} onBack={later} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <h2 className="text-display font-extrabold leading-tight text-ink">{t('linkPhoneTitle').replace('{name}', party.name)}</h2>
        <PhoneCard partyId={party.id} />
        <BigButton full variant="ghost" onClick={later}>{t('later')}</BigButton>
      </div>
    </main>
  );
}
