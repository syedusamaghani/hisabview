// A number in Roman Urdu words, so the phone can say it naturally: 5200 -> "paanch hazaar do sau".

const BELOW_100 = [
  'zero', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhe', 'saat', 'aath', 'nau',
  'das', 'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'atharah', 'unnees',
  'bees', 'ikkees', 'baais', 'teis', 'chaubees', 'pachees', 'chhabbees', 'sattaees', 'atthaees', 'unatees',
  'tees', 'ikatees', 'battees', 'taintees', 'chauntees', 'paintees', 'chhattees', 'saintees', 'artees', 'unchaalees',
  'chaalees', 'iktaalees', 'bayaalees', 'taintaalees', 'chauwaalees', 'paintaalees', 'chhiyaalees', 'saintaalees', 'artaalees', 'unchaas',
  'pachaas', 'ikyaawan', 'baawan', 'tirpan', 'chauwan', 'pachpan', 'chhappan', 'sattaawan', 'atthaawan', 'unsath',
  'saath', 'iksath', 'baasath', 'tirsath', 'chaunsath', 'painsath', 'chhiyaasath', 'sarsath', 'arsath', 'unhattar',
  'sattar', 'ikhattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'satattar', 'athattar', 'unyaasi',
  'assi', 'ikyaasi', 'bayaasi', 'tiraasi', 'chauraasi', 'pachaasi', 'chhiyaasi', 'sattaasi', 'atthaasi', 'nawaasi',
  'nabbay', 'ikyaanwe', 'baanwe', 'tiraanwe', 'chauraanwe', 'pachaanwe', 'chhiyaanwe', 'sattaanwe', 'atthaanwe', 'ninnaanwe',
];

export function romanNumberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n < 100) return BELOW_100[n];
  const parts: string[] = [];
  let rest = n;
  const take = (unit: number, name: string) => {
    if (rest < unit) return;
    const count = Math.floor(rest / unit);
    parts.push(`${romanNumberWords(count)} ${name}`);
    rest -= count * unit;
  };
  take(10_000_000, 'crore');
  take(100_000, 'lakh');
  take(1000, 'hazaar');
  take(100, 'sau');
  if (rest > 0) parts.push(BELOW_100[rest]);
  return parts.join(' ');
}
