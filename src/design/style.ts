// Which look the person chose (Settings). Only the choice is saved, on this phone; the colours themselves
// are CSS variables set by tailwind.config.ts, so applying a style is one attribute on the page.
import { DEFAULT_STYLE, STYLE_IDS, looks, type StyleId } from './tokens';

const KEY = 'hv_style';

export function getStyle(): StyleId {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (STYLE_IDS as string[]).includes(saved)) return saved as StyleId;
  } catch {
    // Storage can be blocked: the default style is used
  }
  return DEFAULT_STYLE;
}

// Put the style on the page (and the browser's top bar colour)
export function applyStyle(id: StyleId) {
  const root = document.documentElement;
  if (id === DEFAULT_STYLE) root.removeAttribute('data-style');
  else root.setAttribute('data-style', id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', looks[id].colors.primary);
}

export function setStyle(id: StyleId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Not saving is fine: the choice still works until the app closes
  }
  applyStyle(id);
}
