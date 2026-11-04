import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeText, similarParties } from './partyText';

const p = (name: string, identifier: string | null = null, phone: string | null = null) => ({ name, identifier, phone });

describe('normalizeText', () => {
  it('ignores case, extra spaces and punctuation', () => {
    expect(normalizeText('  ALI   Bhai! ')).toBe('ali bhai');
  });
  it('treats the two ways of typing the same Urdu letter as one', () => {
    expect(normalizeText('كريم')).toBe(normalizeText('کریم'));
  });
});

describe('matchesQuery', () => {
  const ali = p('Ali', 'chai wala', '0300-123 4567');
  it('finds by name, identifier and phone', () => {
    expect(matchesQuery(ali, 'ali')).toBe(true);
    expect(matchesQuery(ali, 'CHAI')).toBe(true);
    expect(matchesQuery(ali, '0300123')).toBe(true);
    expect(matchesQuery(ali, '4567')).toBe(true);
  });
  it('needs every word to match', () => {
    expect(matchesQuery(ali, 'ali chai')).toBe(true);
    expect(matchesQuery(ali, 'ali bakery')).toBe(false);
  });
  it('shows everyone for an empty search', () => {
    expect(matchesQuery(ali, '   ')).toBe(true);
  });
  it('finds Urdu names', () => {
    expect(matchesQuery(p('علی', 'چائے والا'), 'چائے')).toBe(true);
  });
  it('does not match a short number against a phone by accident', () => {
    expect(matchesQuery(p('Bilal', null, '0300-1234567'), '12')).toBe(false);
  });
});

describe('similarParties', () => {
  const list = [p('Ali', 'chai wala'), p('Ali Raza'), p('Bilal'), p('Ahmed'), p('Zeeshan'), p('Alina')];
  const names = (typed: string) => similarParties(typed, list).map((x) => x.name);

  it('finds the same name', () => {
    expect(names('ali')).toContain('Ali');
  });
  it('finds a longer version of the name', () => {
    expect(names('Ali')).toContain('Ali Raza');
  });
  it('finds a small typing slip', () => {
    expect(names('Ahmad')).toEqual(['Ahmed']);
  });
  it('does not suggest different names', () => {
    expect(names('Kamran')).toEqual([]);
    expect(names('Bilqis')).toEqual([]);
  });
  it('says nothing for one letter', () => {
    expect(names('A')).toEqual([]);
  });
});
