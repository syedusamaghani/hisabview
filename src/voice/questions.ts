// Turns a parser question into the words to show. The words live in the translations file.
import { text, type Lang } from '../i18n/translations';
import type { ParseQuestion, QuestionCode } from './types';

const keys = {
  amount: 'qAmount',
  which_amount: 'qWhichAmount',
  kind: 'qKind',
  who: 'qWho',
  which_party: 'qWhichParty',
  new_party: 'qNewParty',
} as const satisfies Record<QuestionCode, keyof typeof text>;

export function questionText(q: ParseQuestion, lang: Lang): string {
  return text[keys[q.question]][lang].replace('{name}', q.name ?? '');
}
