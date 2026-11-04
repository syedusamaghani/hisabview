import { describe, expect, it } from 'vitest';
import { splitByRecent } from './recent';

const p = (id: string, name: string) => ({ id, name });
const e = (party_id: string | null, created_at: string, status = 'active') => ({ party_id, created_at, status });

describe('splitByRecent', () => {
  const parties = [p('a', 'Ali'), p('b', 'Bilal'), p('c', 'Chand'), p('d', 'Dawood')];

  it('puts the person used most recently first', () => {
    const entries = [e('a', '2026-11-01T10:00:00Z'), e('c', '2026-11-03T10:00:00Z'), e('b', '2026-11-02T10:00:00Z')];
    const { recent, others } = splitByRecent(parties, entries);
    expect(recent.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(others.map((x) => x.id)).toEqual(['d']);
  });

  it('uses each person\'s newest entry, not their oldest', () => {
    const entries = [e('a', '2026-11-01T10:00:00Z'), e('b', '2026-11-02T10:00:00Z'), e('a', '2026-11-03T10:00:00Z')];
    expect(splitByRecent(parties, entries).recent.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('counts cancelled entries as recent contact but not drafts', () => {
    const entries = [e('a', '2026-11-03T10:00:00Z', 'cancelled'), e('b', '2026-11-04T10:00:00Z', 'draft')];
    expect(splitByRecent(parties, entries).recent.map((x) => x.id)).toEqual(['a']);
  });

  it('keeps only the first few as recent and sorts the rest A to Z', () => {
    const many = Array.from({ length: 8 }, (_, i) => p(`p${i}`, `Name ${String.fromCharCode(72 - i)}`));
    const entries = many.map((x, i) => e(x.id, `2026-11-0${i + 1}T10:00:00Z`));
    const { recent, others } = splitByRecent(many, entries, 5);
    expect(recent).toHaveLength(5);
    expect(recent[0].id).toBe('p7');
    expect(others.map((x) => x.name)).toEqual([...others.map((x) => x.name)].sort());
    expect(others).toHaveLength(3);
  });

  it('works when nobody has any entry yet', () => {
    const { recent, others } = splitByRecent(parties, []);
    expect(recent).toEqual([]);
    expect(others.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores entries without a person', () => {
    expect(splitByRecent(parties, [e(null, '2026-11-03T10:00:00Z')]).recent).toEqual([]);
  });
});
