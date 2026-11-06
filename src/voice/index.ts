// The voice parser's front door. Screens use only this file.
export { ruleParser, parseEntry } from './ruleParser';
export { questionText } from './questions';
export { clearAliases, countAliases, learnAlias, withAliases } from './aliases';
export type {
  EntryParser,
  Forced,
  ParseResult,
  ParsedEntry,
  ParseQuestion,
  ParsedKind,
  ParserParty,
  QuestionCode,
  QuestionOption,
  Warning,
} from './types';
