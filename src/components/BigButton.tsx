import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';

// The main button of the app. Always at least 56px tall. Has a pressed state.
//  primary = brown (Theek hai, Save)    diye = red (money out)
//  mile    = green (money in)           ghost   = outlined (Badlo, Cancel)
//  accent  = marigold (for use on a brown background, for example "Ruko" on the voice screen)

type Variant = 'primary' | 'diye' | 'mile' | 'ghost' | 'accent';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'lg'; // md = 56px, lg = 68px
  icon?: IconName;
  full?: boolean;
  children: ReactNode;
};

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-button px-5 text-body font-extrabold ' +
  'transition-[transform,box-shadow] duration-fast active:translate-y-0.5 ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-btnInk shadow-btn active:shadow-btnPressed',
  diye: 'bg-moneyOut text-white shadow-btn active:shadow-btnPressed',
  mile: 'bg-moneyIn text-white shadow-btn active:shadow-btnPressed',
  ghost: 'bg-surface text-primary ring-[1.5px] ring-inset ring-ringBtn',
  accent: 'bg-accent text-accentInk shadow-btn active:shadow-btnPressed',
};

export function BigButton({ variant = 'primary', size = 'md', icon, full, className, type = 'button', children, ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], size === 'lg' ? 'min-h-tapLg' : 'min-h-tap', full && 'w-full', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 26 : 24} />}
      {children}
    </button>
  );
}
