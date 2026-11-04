import { cx } from '../lib/cx';

// The HisabView mark: a khata (ledger book) with a marigold bookmark on a chai-brown tile.
// Same drawing as the app icon (public/icon.svg).
export function Logo({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="HisabView" className={cx('shrink-0', className)}>
      <rect width="512" height="512" rx="112" className="fill-primary" />
      <g transform="translate(256 256) scale(0.8) translate(-256 -256)">
        <rect x="118" y="124" width="276" height="270" rx="30" className="fill-primaryInk" />
        <rect x="118" y="124" width="46" height="270" rx="23" className="fill-line" />
        <g className="stroke-primary/30" strokeWidth="14" strokeLinecap="round">
          <path d="M200 222h150" />
          <path d="M200 272h150" />
          <path d="M200 322h92" />
        </g>
        <path d="M300 124h58v128l-29-24-29 24z" className="fill-accent" />
      </g>
    </svg>
  );
}
