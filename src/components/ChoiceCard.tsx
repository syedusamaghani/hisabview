import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';

// One big option in a pick-one list (use inside role="radiogroup").
// Selected = brown border and a tick. It never uses red or green (those mean money).
type Props = {
  title: string;
  icon?: IconName;
  selected: boolean;
  onSelect: () => void;
  className?: string;
};

export function ChoiceCard({ title, icon, selected, onSelect, className }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'flex min-h-tapLg w-full items-center gap-3 rounded-card border-2 px-4 text-start text-body font-extrabold transition-colors duration-fast',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
        selected ? 'border-primary bg-primarySoft text-primary' : 'border-line bg-surface text-ink',
        className,
      )}
    >
      {icon && <Icon name={icon} size={28} className="text-primary" />}
      <span className="flex-1">{title}</span>
      <span
        aria-hidden="true"
        className={cx('grid size-8 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary bg-primary text-accent' : 'border-line')}
      >
        {selected && <Icon name="check" size={20} />}
      </span>
    </button>
  );
}
