// How the money moved. Cash is the default; one tap switches to JazzCash, Easypaisa or Bank.
// (The database also allows 'other'; the app does not offer it, to keep the choice short.)
import type { TextKey } from '../i18n/translations';

export const METHODS = ['cash', 'jazzcash', 'easypaisa', 'bank'] as const;
export type Method = (typeof METHODS)[number];

export const METHOD_TEXT: Record<Method, TextKey> = {
  cash: 'methodCash',
  jazzcash: 'methodJazz',
  easypaisa: 'methodEasy',
  bank: 'methodBank',
};

export const isMethod = (value: unknown): value is Method => typeof value === 'string' && (METHODS as readonly string[]).includes(value);
