import { AmountText } from '../components/AmountText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { OptionButton } from '../components/OptionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { entriesRepo, partiesRepo, shopsRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { partyBalance } from '../lib/balance';
import { TONES, reminderText } from '../lib/messages';
import { goBack, navigate } from '../lib/router';
import { openWhatsApp, normalizePhone, whatsappUrl } from '../lib/whatsapp';
import { PhoneCard } from './PhoneCard';

// Yaad dilao: three polite-to-firm messages. One tap on a tone opens WhatsApp with the message typed.
// Nothing is sent until the shopkeeper presses send there.
export function RemindScreen({ partyId }: { partyId: string }) {
  const { t, lang } = useT();
  const data = useLive(
    async () => ({
      party: (await partiesRepo.get(partyId)) ?? null,
      entries: await entriesRepo.listForParty(partyId),
      shopName: (await shopsRepo.getMine())?.shop_name ?? '',
    }),
    [partyId],
  );
  const back = () => goBack(`/party/${partyId}`);

  if (data === undefined) return <main className="mx-auto min-h-screen max-w-app" />;
  const { party, entries, shopName } = data;
  if (!party) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} onBack={() => goBack('/')} />
        <EmptyState title={t('partyNotFound')} body="" buttonLabel={t('goHome')} onButton={() => navigate('/', { replace: true })} />
      </main>
    );
  }

  const owed = partyBalance(party, entries);
  const hasPhone = normalizePhone(party.phone) !== null;

  return (
    <main className="mx-auto min-h-screen max-w-app pb-8">
      <ScreenHeader title={t('remind')} subtitle={party.name} onBack={back} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        {owed <= 0 ? (
          <Card tone="soft">
            <p className="text-body font-extrabold text-ink">{t('remindNone')}</p>
          </Card>
        ) : (
          <>
            <Card>
              <p className="text-label font-semibold text-inkSoft">{t('leneHain')}</p>
              <AmountText amount={owed} size="l" tone="out" />
            </Card>
            <p className="text-body text-inkSoft">{t('remindHint')}</p>
            {!hasPhone && <PhoneCard partyId={party.id} />}
            <ul className="flex flex-col gap-3">
              {TONES.map(({ tone, title, body }) => {
                const message = reminderText(body, lang, { name: party.name, shop: shopName }, owed);
                return (
                  <li key={tone}>
                    <OptionButton
                      wrap
                      title={t(title)}
                      subtitle={message}
                      right={<Icon name="whatsapp" size={32} className="text-primary" />}
                      onClick={() => openWhatsApp(whatsappUrl(party.phone, message))}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
