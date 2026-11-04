import { describe, expect, it } from 'vitest';
import { balanceSentence } from './speak';

describe('Sunao sentence', () => {
  it('they owe me: "lene hain", amount in Roman Urdu words', () => {
    expect(balanceSentence('Aslam', 5200, 'ro', true)).toBe('Aslam se aap ko paanch hazaar do sau rupay lene hain.');
  });
  it('I owe them: "dene hain" (the amount has no minus sign)', () => {
    expect(balanceSentence('Bilal', -1500, 'ro', true)).toBe('Aap ko Bilal ko ek hazaar paanch sau rupay dene hain.');
  });
  it('nothing owed', () => {
    expect(balanceSentence('Ali', 0, 'ro', true)).toBe('Ali ka hisaab barabar hai.');
  });
  it('Urdu script with digits for an Urdu voice', () => {
    expect(balanceSentence('اسلم', 5200, 'ur', false)).toBe('اسلم سے آپ کو 5200 روپے لینے ہیں۔');
  });
});
