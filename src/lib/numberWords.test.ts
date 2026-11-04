import { describe, expect, it } from 'vitest';
import { romanNumberWords } from './numberWords';

describe('romanNumberWords', () => {
  it.each([
    [0, 'zero'],
    [7, 'saat'],
    [25, 'pachees'],
    [100, 'ek sau'],
    [350, 'teen sau pachaas'],
    [1000, 'ek hazaar'],
    [5200, 'paanch hazaar do sau'],
    [15000, 'pandrah hazaar'],
    [100000, 'ek lakh'],
    [125500, 'ek lakh pachees hazaar paanch sau'],
    [20000000, 'do crore'],
  ])('%i is "%s"', (n, words) => {
    expect(romanNumberWords(n)).toBe(words);
  });

  it('99 is the last word in the table', () => {
    expect(romanNumberWords(99)).toBe('ninnaanwe');
  });

  it('round trip with the parser: what we say is what the parser reads', async () => {
    const { parseEntry } = await import('../voice');
    for (const n of [5, 40, 350, 1500, 5200, 98000, 125000]) {
      const r = parseEntry(`Aslam ko ${romanNumberWords(n)} diye`, [{ id: 'a', name: 'Aslam', identifier: null }]);
      expect(r.type === 'entry' && r.amount).toBe(n);
    }
  });
});
