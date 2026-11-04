import { describe, expect, it } from 'vitest';
import { normalizePhone, whatsappUrl } from './whatsapp';

describe('normalizePhone', () => {
  it.each([
    ['0300-1234567', '923001234567'],
    ['03001234567', '923001234567'],
    ['+92 300 1234567', '923001234567'],
    ['0092 300 1234567', '923001234567'],
    ['923001234567', '923001234567'],
    ['3001234567', '923001234567'],
    ['+44 7700 900123', '447700900123'],
  ])('%s -> %s', (raw, want) => {
    expect(normalizePhone(raw)).toBe(want);
  });

  it('gives null when there is nothing usable', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});

describe('whatsappUrl', () => {
  it('opens a chat with the number and the text, safely encoded', () => {
    expect(whatsappUrl('0300-1234567', 'Rs 500 & shukriya\nOK')).toBe('https://wa.me/923001234567?text=Rs%20500%20%26%20shukriya%0AOK');
  });
  it('without a number WhatsApp lets you choose the person', () => {
    expect(whatsappUrl(null, 'hello')).toBe('https://wa.me/?text=hello');
  });
  it('keeps Urdu text intact', () => {
    const url = whatsappUrl(null, 'اسلم');
    expect(decodeURIComponent(url.split('text=')[1])).toBe('اسلم');
  });
});
