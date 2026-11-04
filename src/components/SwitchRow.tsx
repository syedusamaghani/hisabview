import { cx } from '../lib/cx';

// A row with a label and an on/off switch. The whole row is the button (56px or taller).
type Props = { label: string; checked: boolean; onChange: (next: boolean) => void };

export function SwitchRow({ label, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex min-h-tap w-full items-center gap-3 rounded-button text-start',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <span className="flex-1 text-body font-extrabold text-ink">{label}</span>
      <span
        aria-hidden="true"
        className={cx(
          'flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors duration-fast',
          checked ? 'justify-end bg-primary' : 'justify-start bg-line ring-2 ring-inset ring-inkSoft/40',
        )}
      >
        <span className={cx('size-7 rounded-full shadow-btn', checked ? 'bg-accent' : 'bg-surface')} />
      </span>
    </button>
  );
}
