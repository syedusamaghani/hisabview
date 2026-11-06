import { useState, type FormEvent } from 'react';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n/i18n';

// The same as speaking, but typed: "Saeed ne 500 udhar liye". It goes through the same reader,
// so the same check card (and the same corrections) follow. For noisy shops or a phone that cannot hear well.
type Props = { onDone: (text: string) => void; onBack: () => void };

export function TypeView({ onDone, onBack }: Props) {
  const { t } = useT();
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onDone(text.trim());
  };
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('typeInstead')} onBack={onBack} />
      <form id="type-form" onSubmit={submit} className="flex flex-col gap-4 px-gutter pt-5">
        <TextField
          label={t('typeLabel')}
          placeholder={t('typePlaceholder')}
          size="lg"
          autoFocus
          maxLength={200}
          enterKeyHint="go"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </form>
      <BottomActionBar>
        <BigButton full size="lg" type="submit" form="type-form" disabled={!ready}>{t('next')}</BigButton>
      </BottomActionBar>
    </main>
  );
}
