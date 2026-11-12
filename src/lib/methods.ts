// How the money moved. Cash is the default; one tap switches to JazzCash, Easypaisa or Bank.
import type { TextKey } from '../i18n/translations';

export const METHODS = ['cash', 'jazzcash', 'easypaisa', 'bank', 'other'] as const;
export type Method = (typeof METHODS)[number];

export const METHOD_TEXT: Record<Method, TextKey> = {
  cash: 'methodCash',
  jazzcash: 'methodJazz',
  easypaisa: 'methodEasy',
  bank: 'methodBank',
  other: 'methodOther',
};

export const isMethod = (value: unknown): value is Method => typeof value === 'string' && (METHODS as readonly string[]).includes(value);
