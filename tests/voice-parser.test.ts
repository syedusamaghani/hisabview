import { describe, expect, it } from 'vitest';
import { parseEntry, questionText, ruleParser } from '../src/voice';
import { ALIS, NOW, SHOP, amountOf, entry, expectEntry, party, question } from './helpers';

describe('numbers: Roman Urdu words', () => {
  it.each([
    ['500', 500],
    ['ek sau', 100],
    ['ek hazaar', 1000],
    ['hazaar', 1000],
    ['do sau', 200],
    ['teen sau pachas', 350],
    ['pandrah sau', 1500],
    ['pachees sau', 2500],
    ['dhai hazaar', 2500],
    ['dhai sau', 250],
    ['derh sau', 150],
    ['derh lakh', 150000],
    ['sawa sau', 125],
    ['sawa lakh', 125000],
    ['paune sau', 75],
    ['paune do sau', 175],
    ['sade teen hazaar', 3500],
    ['do hazaar paanch sau', 2500],
    ['ek lakh pachas hazaar', 150000],
    ['bees hazaar', 20000],
    ['pachaas', 50],
    ['saath hazaar', 60000],
  ])('"%s" is %i', (said, value) => {
    expect(amountOf(said)).toBe(value);
  });
});

describe('numbers: digits', () => {
  it.each([
    ['1,500', 1500],
    ['2.5 hazaar', 2500],
    ['15 sau', 1500],
    ['5 lakh', 500000],
    ['2 500', 2500],
    ['۵۰۰', 500],
    ['۱۵۰۰', 1500],
    ['٣٠٠', 300],
  ])('"%s" is %i', (said, value) => {
    expect(amountOf(said)).toBe(value);
  });
});

describe('numbers: Urdu script words', () => {
  it.each([
    ['پندرہ سو', 1500],
    ['ڈھائی ہزار', 2500],
    ['سوا سو', 125],
    ['ڈیڑھ لاکھ', 150000],
    ['دو ہزار', 2000],
    ['پچاس', 50],
    ['ساڑھے تین سو', 350],
  ])('"%s" is %i', (said, value) => {
    expect(entry(`اسلم کو ${said} دیے`).amount).toBe(value);
  });
});

describe('kind: diye, mile, sale, kharcha', () => {
  it('"Aslam ko 500 udhaar diya" is diye', () => {
    expectEntry('Aslam ko 500 udhaar diya', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('"Bilal ne 1000 wapas kiye" is mile', () => {
    expectEntry('Bilal ne 1000 wapas kiye', { party: 'bilal', kind: 'mile', amount: 1000 });
  });
  it('"doodh wale ko 3000 diye" is diye, found by the pehchaan', () => {
    expectEntry('doodh wale ko 3000 diye', { party: 'rashid', kind: 'diye', amount: 3000 });
  });
  it('jama and mile and aaye are mile', () => {
    expect(entry('Aslam 500 jama').kind).toBe('mile');
    expect(entry('Aslam 500 mile').kind).toBe('mile');
    expect(entry('Aslam ke 500 aaye').kind).toBe('mile');
  });
  it('"de diya" is diye, "de gaya" is mile', () => {
    expect(entry('Aslam ko 500 de diya').kind).toBe('diye');
    expect(entry('Aslam 500 de gaya').kind).toBe('mile');
  });
  it('"le gaya" is diye (he took it)', () => {
    expect(entry('Aslam 500 ka saman le gaya').kind).toBe('diye');
  });
  it('"Bilal ne 1000 de diye" is mile (Bilal did the giving)', () => {
    const r = expectEntry('Bilal ne 1000 de diye', { party: 'bilal', kind: 'mile', amount: 1000 });
    expect(r.confidence).toBeLessThan(0.9);
  });
  it('"aaj 15000 ki sale" is a cash sale with no customer', () => {
    expectEntry('aaj 15000 ki sale', { party: null, kind: 'cash_sale', amount: 15000 });
  });
  it('"bijli ka bill 3000" and "kharcha 500" are kharcha', () => {
    expectEntry('bijli ka bill 3000', { party: null, kind: 'kharcha', amount: 3000 });
    expectEntry('kharcha 500', { party: null, kind: 'kharcha', amount: 500 });
  });
  it('"bill 3000 de diya" is still kharcha, the give-word does not fight it', () => {
    expect(entry('bijli ka bill 3000 de diya').kind).toBe('kharcha');
  });
  it('Urdu script kind words', () => {
    expect(entry('اسلم کو 500 ادھار دیا').kind).toBe('diye');
    expect(entry('بلال نے 1000 واپس کیے').kind).toBe('mile');
    expect(entry('آج 15000 کی سیل').kind).toBe('cash_sale');
    expect(entry('بجلی کا بل 3000').kind).toBe('kharcha');
  });
});

describe('promise days (Asia/Karachi, today = Wednesday 4 Nov 2026)', () => {
  it.each([
    ['Aslam ko 500 udhaar diya kal', '2026-11-05'],
    ['Aslam ko 500 udhaar diya parson', '2026-11-06'],
    ['Aslam ko 500 udhaar diya Jumma', '2026-11-06'],
    ['Aslam ko 500 udhaar diya agle hafte', '2026-11-11'],
    ['Aslam ko 500 udhaar diya 1 tareekh', '2026-12-01'],
    ['Aslam ko 500 udhaar diya 10 tareekh ko', '2026-11-10'],
    ['Aslam ko 500 udhaar diya 4 tareekh', '2026-12-04'],
    ['Aslam ko 500 udhaar diya peer', '2026-11-09'],
    ['Aslam ko 500 udhaar diya budh', '2026-11-11'],
    ['اسلم کو 500 ادھار دیا جمعہ', '2026-11-06'],
    ['اسلم کو 500 ادھار دیا اگلے ہفتے', '2026-11-11'],
  ])('%s -> %s', (said, date) => {
    const r = entry(said);
    expect(r.promise_date).toBe(date);
    expect(r.amount).toBe(500);
  });
  it('the date digits are not taken as the amount', () => {
    const r = entry('Aslam ko 10 tareekh ko 500 udhaar diya');
    expect(r.amount).toBe(500);
    expect(r.promise_date).toBe('2026-11-10');
  });
  it('a promise day is not kept for mile', () => {
    const r = entry('Bilal ne 1000 wapas kiye Jumma');
    expect(r.promise_date).toBeUndefined();
    expect(r.warnings).toContain('day_ignored');
  });
  it('"kal 500 diye the" is the past, so no promise day', () => {
    const r = entry('Aslam ko kal 500 diye the');
    expect(r.kind).toBe('diye');
    expect(r.promise_date).toBeUndefined();
    expect(r.warnings).toContain('day_ignored');
  });
  it('no day said means no promise_date field', () => {
    expect('promise_date' in entry('Aslam ko 500 diye')).toBe(false);
  });
  it('at 11:30 pm Pakistan time "kal" is still the next day; after midnight it moves on', () => {
    const lateNight = new Date('2026-11-04T18:30:00Z'); // 23:30 on the 4th in Karachi
    const r = parseEntry('Aslam ko 500 udhaar diya kal', SHOP, lateNight);
    expect(r.type === 'entry' && r.promise_date).toBe('2026-11-05');
    const after = new Date('2026-11-04T19:30:00Z'); // 00:30 on the 5th
    const r2 = parseEntry('Aslam ko 500 udhaar diya kal', SHOP, after);
    expect(r2.type === 'entry' && r2.promise_date).toBe('2026-11-06');
  });
});

describe('finding the customer: spelling and script', () => {
  it('Asslam is Aslam', () => {
    const r = expectEntry('Asslam ko 500 diye', { party: 'aslam', kind: 'diye', amount: 500 });
    expect(r.confidence).toBeLessThan(0.95);
  });
  it('Bilaal is Bilal', () => {
    expectEntry('Bilaal ne 1000 wapas kiye', { party: 'bilal', kind: 'mile', amount: 1000 });
  });
  it('the same spelling is the most sure', () => {
    expect(entry('Aslam ko 500 diye').confidence).toBe(0.95);
  });
  it('Urdu script finds a Roman name', () => {
    expect(entry('بلال کو 500 دیے').party?.id).toBe('bilal');
    expect(entry('اسلم کو 500 دیے').party?.id).toBe('aslam');
    expect(entry('داؤد کو 500 دیے').party?.id).toBe('dawood');
    expect(entry('جاوید کو 500 دیے').party?.id).toBe('javed');
    expect(entry('عمران کو 500 دیے').party?.id).toBe('imran');
  });
  it('Roman Urdu finds an Urdu script name', () => {
    const urdu = [party('u1', 'بلال'), party('u2', 'اسلم')];
    expect(entry('Bilaal ko 500 diye', urdu).party?.id).toBe('u1');
    expect(entry('Aslam ne 500 wapas kiye', urdu).party?.id).toBe('u2');
  });
  it('Dawood and Daood and Dawud are the same person', () => {
    for (const n of ['Dawood', 'Daood', 'Dawud']) expect(entry(`${n} ko 500 diye`).party?.id).toBe('dawood');
  });
  it('a two-word name, even with a stretched spelling', () => {
    expect(entry('Chand Bibi ko 500 diye').party?.id).toBe('chand');
    expect(entry('Chaand Bibi ko 500 diye').party?.id).toBe('chand');
  });
  it('the pehchaan alone finds the customer', () => {
    expect(entry('school wale ko 500 diye').party?.id).toBe('javed');
    expect(entry('doodh wala 700 wapas kiye').party?.id).toBe('rashid');
  });
  it('lower case, UPPER CASE and punctuation do not matter', () => {
    expect(entry('ASLAM KO 500 DIYE').party?.id).toBe('aslam');
    expect(entry('Aslam ko, 500, diye!').party?.id).toBe('aslam');
  });
});

describe('two customers with the same name', () => {
  it('"Ali ko 500 diye" asks "Kaunsa Ali?" and shows both with their pehchaan', () => {
    const q = question('Ali ko 500 diye', ALIS);
    expect(q.question).toBe('which_party');
    expect(q.options?.map((o) => o.value).sort()).toEqual(['ali-chai', 'ali-gali']);
    expect(q.options?.find((o) => o.value === 'ali-chai')?.hint).toBe('chai wala');
    expect(q.partial.amount).toBe(500);
    expect(q.partial.kind).toBe('diye');
    expect(questionText(q, 'ro')).toBe('Kaunsa Ali?');
  });
  it('"Ali chai wala 250 diye" picks the right Ali', () => {
    expectEntry('Ali chai wala 250 diye', { party: 'ali-chai', kind: 'diye', amount: 250 }, ALIS);
    expectEntry('chai wale Ali ko 250 diye', { party: 'ali-chai', kind: 'diye', amount: 250 }, ALIS);
  });
  it('a number in the pehchaan ("gali 4") is not the amount', () => {
    expectEntry('Ali gali 4 ko 500 diye', { party: 'ali-gali', kind: 'diye', amount: 500 }, ALIS);
  });
  it('"Ali" and "Ali Raza" is also a question, not a guess', () => {
    const two = [party('a', 'Ali'), party('ar', 'Ali Raza')];
    expect(question('Ali ko 500 diye', two).question).toBe('which_party');
    expectEntry('Ali Raza ko 500 diye', { party: 'ar', kind: 'diye', amount: 500 }, two);
  });
  it('Urdu script: "کون سا علی؟"', () => {
    const q = question('علی کو 500 دیے', ALIS);
    expect(q.question).toBe('which_party');
    expect(questionText(q, 'ur')).toContain('کون سا');
  });
});

describe('a new name', () => {
  it('"Kamran ko 500 diye" asks "Naya naam hai, add karoon?"', () => {
    const q = question('Kamran ko 500 diye');
    expect(q.question).toBe('new_party');
    expect(q.name).toBe('Kamran');
    expect(q.partial).toMatchObject({ amount: 500, kind: 'diye' });
    expect(questionText(q, 'ro')).toBe('Naya naam hai, add karoon?');
  });
  it('a two-word new name', () => {
    expect(question('Zafar Iqbal ko 700 diye').name).toBe('Zafar Iqbal');
  });
  it('"Ali Zafar" is not "Ali": the extra name means a new person', () => {
    const q = question('Ali Zafar ko 500 diye', [party('a', 'Ali')]);
    expect(q.question).toBe('new_party');
    expect(q.name).toBe('Ali Zafar');
  });
  it('a new name in Urdu script', () => {
    expect(question('کامران کو 500 دیے').question).toBe('new_party');
  });
  it('an empty customer list: every name is new', () => {
    expect(question('Aslam ko 500 diye', []).question).toBe('new_party');
  });
});

describe('never guess: one short question', () => {
  it('no amount -> "Kitni raqam?"', () => {
    const q = question('Aslam ko udhaar diya');
    expect(q.question).toBe('amount');
    expect(q.partial).toMatchObject({ kind: 'diye', party: expect.objectContaining({ id: 'aslam' }) });
    expect(questionText(q, 'ur')).toBe('کتنی رقم؟');
  });
  it('no kind -> "Diye ya Mile?"', () => {
    const q = question('Aslam 500');
    expect(q.question).toBe('kind');
    expect(q.options?.map((o) => o.value)).toEqual(['diye', 'mile']);
    expect(q.partial).toMatchObject({ amount: 500, party: expect.objectContaining({ id: 'aslam' }) });
  });
  it('"Ali chai wala 250" knows the customer and the amount, asks only the kind', () => {
    const q = question('Ali chai wala 250', ALIS);
    expect(q.question).toBe('kind');
    expect(q.partial.party?.id).toBe('ali-chai');
    expect(q.partial.amount).toBe(250);
  });
  it('"Aslam Jumma" keeps the day and asks for the amount', () => {
    const q = question('Aslam Jumma');
    expect(q.question).toBe('amount');
    expect(q.partial.party?.id).toBe('aslam');
    expect(q.partial.promise_date).toBe('2026-11-06');
  });
  it('no name -> "Kis ka hisaab?"', () => {
    expect(question('500 diye').question).toBe('who');
    expect(question('ko 500 udhaar diya').question).toBe('who');
  });
  it('two different amounts -> asks which, with both', () => {
    const q = question('Ali ko 500 nahi 600 diye', ALIS);
    expect(q.question).toBe('which_amount');
    expect(q.options?.map((o) => o.value)).toEqual(['500', '600']);
    expect(q.options?.[0].label).toBe('Rs 500');
  });
  it('"wapas" together with "ko ... diye" can mean two things: asks the kind', () => {
    const q = question('Aslam ko 500 wapas de diye');
    expect(q.question).toBe('kind');
    expect(q.options?.map((o) => o.value).sort()).toEqual(['diye', 'mile']);
  });
  it('"ne" and "ko" together (who did what?) asks the kind', () => {
    expect(question('Aslam ne mujhe ko 500 diye').question).toBe('kind');
  });
  it('sale and udhaar together -> asks the kind', () => {
    expect(question('Aslam 500 sale udhaar').question).toBe('kind');
  });
  it('a broken amount ("sawa" alone) is not guessed', () => {
    expect(question('Aslam ko sawa diye').question).toBe('amount');
  });
  it('an amount that is too big is not accepted', () => {
    expect(question('Aslam ko 5000000000 diye').question).toBe('amount');
  });
  it('an empty sentence asks for the amount', () => {
    expect(question('').question).toBe('amount');
    expect(question('   ').question).toBe('amount');
  });
  it('asks only one question even when much is missing', () => {
    expect(question('bhai kuch likh do').question).toBe('amount');
  });
});

describe('messy real talk', () => {
  it('filler words and "bhai", "yaar"', () => {
    expectEntry('bhai Aslam ko 500 udhaar diya yaar', { party: 'aslam', kind: 'diye', amount: 500 });
    expectEntry('acha acha Bilal ne yaar 1000 wapas kar diye', { party: 'bilal', kind: 'mile', amount: 1000 });
  });
  it('repeated words', () => {
    expectEntry('Aslam Aslam ko ko 500 500 diye', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('rupay and paise words in the way', () => {
    expectEntry('Aslam ko 500 rupay udhaar diye hain', { party: 'aslam', kind: 'diye', amount: 500 });
    expectEntry('Aslam ko mujhe 500 rupay udhaar de diye', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('speech recogniser spellings: hazar, udhar, dia, wapis', () => {
    expectEntry('Asslam ko hazar rupay udhar diya', { party: 'aslam', kind: 'diye', amount: 1000 });
    expectEntry('Bilal ne hazaar wapis kiye', { party: 'bilal', kind: 'mile', amount: 1000 });
    expectEntry('Aslam ko 5 sau udhaar dia', { party: 'aslam', kind: 'diye', amount: 500 });
    expectEntry('Bilal ne ek hazzar wapsi kiye', { party: 'bilal', kind: 'mile', amount: 1000 });
  });
  it('the amount can come first', () => {
    expectEntry('500 Aslam ko diye', { party: 'aslam', kind: 'diye', amount: 500 });
    expectEntry('pandrah sau Bilal ne wapas kiye', { party: 'bilal', kind: 'mile', amount: 1500 });
  });
  it('words missing: just name, amount and one kind word', () => {
    expectEntry('Aslam 500 diye', { party: 'aslam', kind: 'diye', amount: 500 });
    expectEntry('Bilal 1000 wapas', { party: 'bilal', kind: 'mile', amount: 1000 });
  });
  it('"ek 50 ka saman": a small word number does not beat the real amount', () => {
    expectEntry('Aslam ko ek 50 ka saman udhaar diye', { party: 'aslam', kind: 'diye', amount: 50 });
  });
  it('an unknown extra word is treated as part of a new name, so it asks (known limit)', () => {
    const q = question('Aslam ko ek chai 50 udhaar diye');
    expect(q.question).toBe('new_party');
    expect(q.name).toBe('Aslam Chai');
    expect(q.partial.amount).toBe(50);
  });
  it('a command word first: "likho Aslam ko 500 diye"', () => {
    expectEntry('likho Aslam ko 500 diye', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('"de do": the "do" is the verb, not 2', () => {
    expectEntry('Aslam ko 500 de do', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('"Aslam ke saath" does not turn "saath" into 60', () => {
    expectEntry('Aslam ke saath 500 udhaar diya', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('mixed Urdu and English: "five hundred"', () => {
    expectEntry('Aslam ko five hundred udhaar diya', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('"Aslam ne 500 udhaar liya": Aslam took on credit, so diye; "liya" is not part of the name', () => {
    expectEntry('Aslam ne 500 udhaar liya', { party: 'aslam', kind: 'diye', amount: 500 });
  });
  it('"Aslam ne 500 liye" does not say which way, so it asks', () => {
    expect(question('Aslam ne 500 liye').question).toBe('kind');
  });
  it('two entries in one sentence are not mixed up: it asks which amount', () => {
    expect(question('Aslam ko 500 diye aur Bilal ne 300 wapas kiye').question).toBe('which_amount');
  });
  it('a lone small word amount is accepted but marked weak', () => {
    const r = entry('Aslam ko paanch diye');
    expect(r.amount).toBe(5);
    expect(r.warnings).toContain('weak_amount');
    expect(r.confidence).toBeLessThanOrEqual(0.6);
  });
});

describe('interface and safety', () => {
  it('ruleParser follows the EntryParser interface (a later Claude parser can replace it)', async () => {
    const r = await ruleParser.parse('Aslam ko 500 diye', SHOP, NOW);
    expect(r.type).toBe('entry');
  });
  it('does not change the customer list it was given', () => {
    const copy = JSON.stringify(ALIS);
    parseEntry('Ali ko 500 diye', ALIS, NOW);
    expect(JSON.stringify(ALIS)).toBe(copy);
  });
  it('confidence is always between 0 and 1', () => {
    for (const s of ['Aslam ko 500 diye', 'Asslam ko paanch diye', 'Bilal ne 1000 de diye']) {
      const r = entry(s);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
  it('every question has words in both languages', () => {
    for (const s of ['Aslam ko udhaar diya', 'Aslam 500', '500 diye', 'Kamran ko 500 diye', 'Ali ko 500 diye']) {
      const q = parseEntry(s, ALIS, NOW);
      if (q.type !== 'question') throw new Error(s);
      expect(questionText(q, 'ro').length).toBeGreaterThan(3);
      expect(questionText(q, 'ur').length).toBeGreaterThan(3);
    }
  });
});

// Real phone test: "Saeed bhai ne 500 udhar liye". In Urdu script the little word "liye" was
// read as part of the name, and the app asked to add a new customer "Saeed liye".
describe('little Urdu words that are not part of a name', () => {
  const saeed = [party('saeed', 'سعید'), party('zia', 'ضیا')];
  it.each([
    'سعید بھائی نے 500 ادھار لیے',
    'سعید بھائی نے 500 ادھار لئے',
    'سعید بھائی نے پانچ سو ادھار لیے',
    'سعید نے 500 ادھار لیا',
  ])('"%s" is Saeed, Diye, 500', (text) => {
    expectEntry(text, { party: 'saeed', kind: 'diye', amount: 500 }, saeed);
  });
  it('Roman Urdu said the same way gives the same answer', () => {
    expectEntry('Saeed bhai ne 500 udhar liye', { party: 'saeed', kind: 'diye', amount: 500 }, [party('saeed', 'Saeed')]);
  });
});
