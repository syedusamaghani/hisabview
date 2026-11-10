import { beforeEach, describe, expect, it } from 'vitest';
import { notYetCustomers, searchBook } from '../src/lib/contactBook';
import { similarContacts } from '../src/voice/contactMatch';

const book = [
  { name: 'Aslam Bhai', phone: '0300-1112223' },
  { name: 'Zia Ur Rehman', phone: '03123334445' },
  { name: 'اسلم خان', phone: '03211234567' },
  { name: 'Imran', phone: '03451112222' },
];

describe('contacts as suggestions', () => {
  beforeEach(() => undefined);
  it('a heard name finds contacts that sound the same, in Roman or Urdu script', () => {
    const names = similarContacts('Asslam', book).map((c) => c.name);
    expect(names).toContain('Aslam Bhai');
    expect(names).toContain('اسلم خان');
    expect(names).not.toContain('Imran');
  });
  it('a clearly different name finds nothing', () => {
    expect(similarContacts('Kamran', book)).toEqual([]);
  });
  it('typing a few letters or digits searches the contacts', () => {
    expect(searchBook(book, 'zia').map((c) => c.name)).toEqual(['Zia Ur Rehman']);
    expect(searchBook(book, '0345').map((c) => c.name)).toEqual(['Imran']);
  });
  it('contacts who are already customers (same number or same name) are not offered again', () => {
    const left = notYetCustomers(book, [{ name: 'Zia Ur Rehman', phone: null }, { name: 'Ali', phone: '0345 111 2222' }]);
    expect(left.map((c) => c.name)).toEqual(['Aslam Bhai', 'اسلم خان']);
  });
});
