import { describe, expect, it } from 'vitest';
import { parseEntry } from '../src/voice';
import { clearAliases, countAliases, loadAliases } from '../src/voice/aliasStore';
import { learnAlias, withAliases } from '../src/voice/aliases';
import { NOW, party } from './helpers';

// A tiny pretend phone storage
const fakeStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

const saeed = party('saeed', 'Saeed');
const shop = [saeed, party('zia', 'Zia'), party('ali', 'Ali')];

describe('names the phone got wrong before', () => {
  it('without a learned spelling, an unknown name asks "naya naam?"', () => {
    const r = parseEntry('Sohail ne 500 udhar liye', shop, NOW);
    expect(r.type === 'question' && r.question).toBe('new_party');
  });
  it('with the learned spelling it finds the right customer', () => {
    const r = parseEntry('Sohail ne 500 udhar liye', withAliases(shop, { saeed: ['sohail'] }), NOW);
    expect(r.type).toBe('entry');
    if (r.type === 'entry') {
      expect(r.party?.id).toBe('saeed');
      expect(r.kind).toBe('diye');
      expect(r.amount).toBe(500);
    }
  });
  it('it also works for a name that is not at the start, and with "bhai"', () => {
    const r = parseEntry('aaj Sohail bhai ko 700 diye', withAliases(shop, { saeed: ['sohail'] }), NOW);
    expect(r.type === 'entry' && r.party?.id).toBe('saeed');
  });
  it('a second unknown word means it is somebody else: the normal rules decide', () => {
    const r = parseEntry('Sohail Khan ko 500 diye', withAliases(shop, { saeed: ['sohail'] }), NOW);
    expect(r.type === 'question' && r.question).toBe('new_party');
  });
  it('a customer who really has that name is never overridden', () => {
    const people = withAliases([...shop, party('sohail', 'Sohail')], { saeed: ['sohail'] });
    const r = parseEntry('Sohail ko 500 diye', people, NOW);
    expect(r.type === 'entry' && r.party?.id).toBe('sohail');
  });
  it('a corrected pick still wins over a learned spelling', () => {
    const people = withAliases(shop, { saeed: ['sohail'] });
    const r = parseEntry('Sohail ko 500 diye', people, NOW, { party: people[1] });
    expect(r.type === 'entry' && r.party?.id).toBe('zia');
  });
  it('the entry says which name the phone heard (the screen learns from a correction)', () => {
    const r = parseEntry('Sohail ko 500 diye', withAliases(shop, { saeed: ['sohail'] }), NOW);
    expect(r.type === 'entry' && r.heard_name).toBe('sohail');
    const plain = parseEntry('Saeed ko 500 diye', shop, NOW);
    expect(plain.type === 'entry' && plain.heard_name).toBe('saeed');
  });
});

describe('learning from a correction', () => {
  it('a heard name that does not fit the chosen customer is remembered, newest first', () => {
    const store = fakeStore();
    expect(learnAlias('Sohail', saeed, shop, store)).toBe(true);
    expect(learnAlias('Sohel', saeed, shop, store)).toBe(true);
    expect(loadAliases(store).saeed).toEqual(['sohel', 'sohail']);
    expect(countAliases(store)).toBe(2);
  });
  it('a fine spelling of the chosen customer teaches nothing', () => {
    const store = fakeStore();
    expect(learnAlias('Saeed', saeed, shop, store)).toBe(false);
    expect(learnAlias('Sayeed', saeed, shop, store)).toBe(false);
    expect(countAliases(store)).toBe(0);
  });
  it('a name that fits ANOTHER customer teaches nothing (the phone heard it right)', () => {
    const store = fakeStore();
    expect(learnAlias('Ali', saeed, shop, store)).toBe(false);
    expect(countAliases(store)).toBe(0);
  });
  it('the same spelling is not stored twice, and only five are kept', () => {
    const store = fakeStore();
    learnAlias('sohail', saeed, shop, store);
    expect(learnAlias('sohail', saeed, shop, store)).toBe(false);
    for (const w of ['mohsin', 'tariq', 'nadeem', 'kamal', 'farhan']) learnAlias(w, saeed, shop, store);
    expect(loadAliases(store).saeed).toHaveLength(5);
    expect(loadAliases(store).saeed).not.toContain('sohail');
  });
  it('numbers, empty and very long names are not learned', () => {
    const store = fakeStore();
    for (const w of ['', '500', 'gali 3', 'a b c d']) expect(learnAlias(w, saeed, shop, store)).toBe(false);
    expect(countAliases(store)).toBe(0);
  });
  it('"Sab bhool jao" wipes everything', () => {
    const store = fakeStore();
    learnAlias('sohail', saeed, shop, store);
    clearAliases(store);
    expect(countAliases(store)).toBe(0);
  });
  it('a broken or missing storage never breaks anything', () => {
    expect(loadAliases(null)).toEqual({});
    expect(learnAlias('sohail', saeed, shop, null)).toBe(false);
    const bad = { getItem: () => '{not json', setItem: () => {}, removeItem: () => {} };
    expect(loadAliases(bad)).toEqual({});
  });
});
