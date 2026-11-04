import { Icon } from './Icon';

// The big marigold mic of the voice screen. While listening, three soft rings spread out from it
// one after another (they stand still when the phone has "reduce motion" on).
export function ListeningMic({ active, label }: { active: boolean; label: string }) {
  return (
    <div role="img" aria-label={label} className="relative grid size-micXL place-items-center">
      {active &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute inset-0 animate-listen rounded-full border-4 border-accent"
            style={{ animationDelay: `${i * 400}ms`, animationFillMode: 'backwards' }}
          />
        ))}
      <span className="relative grid size-micXL place-items-center rounded-full bg-accent text-accentInk shadow-mic">
        <Icon name="mic" size={56} />
      </span>
    </div>
  );
}
