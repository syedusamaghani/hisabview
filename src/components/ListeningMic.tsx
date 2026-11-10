import { Icon } from './Icon';

// The big marigold mic of the voice screen. While listening, three soft rings spread out from it
// one after another (they stand still when the phone has "reduce motion" on).
export function ListeningMic({ active, label, size = 128 }: { active: boolean; label: string; size?: number }) {
  return (
    <div role="img" aria-label={label} className="relative grid place-items-center" style={{ width: size, height: size }}>
      {active &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute inset-0 animate-listen rounded-full border-4 border-accent"
            style={{ animationDelay: `${i * 400}ms`, animationFillMode: 'backwards' }}
          />
        ))}
      <span className="relative grid size-full place-items-center rounded-full bg-accent text-accentInk shadow-mic">
        <Icon name="mic" size={Math.round(size * 0.44)} />
      </span>
    </div>
  );
}
