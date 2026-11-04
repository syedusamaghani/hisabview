// The voice parser's public shape. No screens, no database: text in, answer out.
// A Claude-based parser can be swapped in later by implementing EntryParser.

// Only what the parser needs to know about a customer (a real Party fits this)
export type ParserParty = { id: string; name: string; identifier: string | null };

export type ParsedKind = 'diye' | 'mile' | 'cash_sale' | 'kharcha';

// What the parser could understand so far (used inside a question, so nothing is lost)
export type Known = {
  party?: ParserParty | null;
  kind?: ParsedKind;
  amount?: number;
  promise_date?: string; // "2026-11-06", Pakistan day
};

// A full understanding: the app shows this on the check card. party is null for sale and kharcha.
export type ParsedEntry = {
  type: 'entry';
  party: ParserParty | null;
  kind: ParsedKind;
  amount: number;
  promise_date?: string;
  confidence: number; // 0 to 1. Below about 0.7 the screen should look extra carefully
  warnings?: Warning[];
};

// Exactly ONE short question. The words come from translations (see questions.ts).
export type QuestionCode =
  | 'amount' // "Kitni raqam?"
  | 'which_amount' // two different amounts were said
  | 'kind' // "Diye ya Mile?"
  | 'who' // no name was said
  | 'which_party' // "Kaunsa Ali?"
  | 'new_party'; // "Naya naam hai, add karoon?"

// label is only set for data (a customer's name, an amount). For diye/mile the screen uses its own words.
export type QuestionOption = { value: string; label?: string; hint?: string };

export type ParseQuestion = {
  type: 'question';
  question: QuestionCode;
  name?: string; // the name that was said (which_party, new_party)
  options?: QuestionOption[];
  partial: Known;
};

export type Warning = 'day_ignored' | 'weak_amount' | 'fuzzy_name';

export type ParseResult = ParsedEntry | ParseQuestion;

export interface EntryParser {
  // `now` is only for tests; it defaults to the current time
  parse(text: string, parties: readonly ParserParty[], now?: Date): ParseResult | Promise<ParseResult>;
}
