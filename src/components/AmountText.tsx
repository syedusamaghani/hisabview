import { cx } from '../lib/cx';
import { fontSize } from '../design/tokens';
import { formatRs, HIDDEN_AMOUNT } from '../lib/money';
import { useT } from '../i18n/i18n';
import { usePrivacy } from '../state/privacy';

// Shows money as "Rs 2,500". Big, bold, always left-to-right (even inside Urdu text).
// When the "hide amounts" switch is on, it shows "Rs ***" instead.
// Set reveal={true} only where the shopkeeper is typing the amount themselves.
//
// A big number never runs off the screen: the text shrinks a little when it has many digits.
// "room" is how wide the space for the number is. The defaults match where each size is used:
//  m = one of two cards side by side, l / xl = the full screen width.

type Props = {
  amount: number;
  size?: 's' | 'm' | 'l' | 'xl';
  tone?: 'out' | 'in' | 'neutral'; // out = red, in = green, neutral = dark
  reveal?: boolean;
  room?: string; // a CSS length, for example '120px'
  className?: string;
};

const screen = 'min(100vw, 480px)';
const sizes = { s: fontSize.amountS, m: fontSize.amountM, l: fontSize.amountL, xl: fontSize.amountXL };
const defaultRoom = {
  s: `(${screen} - 32px)`,
  m: `((${screen} - 44px) / 2 - 32px)`, // two cards side by side
  l: `(${screen} - 32px)`,
  xl: `(${screen} - 32px)`,
};
const tones = { out: 'text-moneyOut', in: 'text-moneyIn', neutral: 'text-ink' };

// A bold digit is about 0.56 of the font size wide
const CHAR_WIDTH = 0.56;

export function AmountText({ amount, size = 'm', tone = 'neutral', reveal = false, room, className }: Props) {
  const { hidden } = usePrivacy();
  const { t } = useT();
  const masked = hidden && !reveal;
  const shown = masked ? HIDDEN_AMOUNT : formatRs(amount);
  const fit = `calc(${room ?? defaultRoom[size]} / ${(shown.length * CHAR_WIDTH).toFixed(2)})`;

  return (
    <span
      dir="ltr"
      aria-label={masked ? t('amountHidden') : undefined}
      style={{ fontSize: `min(${sizes[size]}, ${fit})` }}
      className={cx(
        'latin inline-block whitespace-nowrap font-extrabold leading-tight tracking-tight [font-variant-numeric:tabular-nums] [unicode-bidi:isolate]',
        masked ? 'text-inkSoft' : tones[tone],
        className,
      )}
    >
      {shown}
    </span>
  );
}
