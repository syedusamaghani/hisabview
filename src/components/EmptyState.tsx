import type { ReactNode } from 'react';
import { BigButton } from './BigButton';

// A friendly "nothing here yet" screen: a small picture, a short message, ONE button.
type Props = {
  title: string;
  body: string;
  buttonLabel: string;
  onButton: () => void;
  art?: ReactNode; // replace the default picture
};

// A khata book with a marigold diamond. Drawn inline, a few hundred bytes.
function KhataArt() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="108" rx="56" ry="7" className="fill-line" />
      <rect x="36" y="14" width="88" height="88" rx="10" className="fill-primary" />
      <rect x="46" y="24" width="68" height="68" rx="6" className="fill-surface" />
      <rect x="56" y="38" width="30" height="6" rx="3" className="fill-line" />
      <rect x="56" y="52" width="44" height="6" rx="3" className="fill-line" />
      <rect x="56" y="66" width="36" height="6" rx="3" className="fill-line" />
      <path d="M104 24h10v30l-5-4-5 4z" className="fill-accent" />
      <path d="M118 84l9 9-9 9-9-9z" className="fill-accent" />
    </svg>
  );
}

export function EmptyState({ title, body, buttonLabel, onButton, art }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 px-gutter py-8 text-center">
      {art ?? <KhataArt />}
      <h2 className="text-title font-extrabold text-ink">{title}</h2>
      <p className="max-w-[28ch] text-body text-inkSoft">{body}</p>
      <BigButton onClick={onButton} icon="plus">
        {buttonLabel}
      </BigButton>
    </div>
  );
}
