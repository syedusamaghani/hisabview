// Every word the parser knows, in Roman Urdu, Urdu script and a little English.
// To teach the parser a new spelling, add it to the matching list below.
import { normalizeText } from '../lib/partyText';
import { distance } from '../lib/partyText';

export type Tag =
  | { t: 'unit'; v: number; amb?: true } // 1 to 99 as a word. amb = also an everyday word ("saath" = with)
  | { t: 'mult'; v: number } // sau, hazaar, lakh, crore
  | { t: 'frac'; v: 'sawa' | 'derh' | 'dhai' | 'paune' | 'sade' }
  | { t: 'weekday'; v: number } // 0 = Sunday
  | { t: 'word'; v: WordKind };

export type WordKind =
  | 'give' // diye, diya, de
  | 'udhaar'
  | 'mile'
  | 'sale'
  | 'kharcha'
  | 'gone' // gaya, gayi
  | 'take' // le
  | 'ko'
  | 'ne'
  | 'past' // tha, thi, the
  | 'wala' // wala, wali, wale: part of a pehchaan ("chai wala"), too common to identify anyone alone
  | 'stop' // filler and little words that carry no meaning for us
  | 'today'
  | 'tomorrow'
  | 'dayafter'
  | 'next'
  | 'week'
  | 'tareekh';

// Two spellings that differ only by doubled letters or v/w are the same word
const collapse = (s: string) => s.replace(/([a-z])\1+/g, '$1'); // Roman letters only
export const wordKey = (w: string) => collapse(normalizeText(w).replace(/v/g, 'w'));

const table = new Map<string, Tag>();
const same = (a: Tag, b: Tag) => JSON.stringify(a) === JSON.stringify(b);

function add(tag: Tag, words: string) {
  for (const w of words.split(/\s+/).filter(Boolean)) {
    const k = wordKey(w);
    const old = table.get(k);
    if (old && !same(old, tag)) throw new Error(`vocabulary clash: "${w}" is both ${JSON.stringify(old)} and ${JSON.stringify(tag)}`);
    table.set(k, tag);
  }
}

// ---- numbers 1 to 99 (Roman Urdu, a few English, Urdu script)
const UNITS: [number, string][] = [
  [1, 'ek aik ik one اک ایک'],
  [2, 'do doo two دو'],
  [3, 'teen tin three تین'],
  [4, 'chaar char chahar four چار'],
  [5, 'paanch panch five پانچ'],
  [6, 'chhe chhay chay che chheh six چھ چھے'],
  [7, 'saat sat seven سات'],
  [8, 'aath ath aat eight آٹھ'],
  [9, 'nau nao nine نو'],
  [10, 'das dus دس'],
  [11, 'gyarah gyara igara eleven گیارہ'],
  [12, 'barah bara twelve بارہ'],
  [13, 'terah thirteen تیرہ'],
  [14, 'chaudah chauda fourteen چودہ'],
  [15, 'pandrah pandra pandrha fifteen پندرہ'],
  [16, 'solah sola sixteen سولہ'],
  [17, 'satrah satra seventeen سترہ'],
  [18, 'atharah athara eighteen اٹھارہ'],
  [19, 'unnees unnis unees nineteen انیس'],
  [20, 'bees bis twenty بیس'],
  [21, 'ikkees ikis ikees اکیس'],
  [22, 'baais baees bais بائیس'],
  [23, 'teis teyis tayis تئیس'],
  [24, 'chaubees chobis chaubis چوبیس'],
  [25, 'pachchees pachees pacchis pachis pachchis پچیس'],
  [26, 'chhabbees chabbis chhabis چھبیس'],
  [27, 'sattaees sattais satais sataees ستائیس'],
  [28, 'atthaees atthais athais اٹھائیس'],
  [29, 'unatees untees unattis unti انتیس'],
  [30, 'tees tis thirty تیس'],
  [31, 'ikatees iktis ikattis اکتیس'],
  [32, 'battees battis btis بتیس'],
  [33, 'taintees tentis tetis تینتیس'],
  [34, 'chauntees chautis chauntis چونتیس'],
  [35, 'paintees pentis paintis پینتیس'],
  [36, 'chhattees chhattis chattis چھتیس'],
  [37, 'saintees saintis saitis سینتیس'],
  [38, 'artees artis adtis اڑتیس'],
  [39, 'unchaalees untalis unchalis انتالیس'],
  [40, 'chaalees chalis forty چالیس'],
  [41, 'iktaalees iktalis اکتالیس'],
  [42, 'bayaalees bayalis byalis بیالیس'],
  [43, 'taintaalees tentalis tetalis تینتالیس'],
  [44, 'chauwaalees chawalis chauwalis چوالیس'],
  [45, 'paintaalees pentalis paintalis پینتالیس'],
  [46, 'chhiyaalees chhialis chiyalis چھیالیس'],
  [47, 'saintaalees saintalis سینتالیس'],
  [48, 'artaalees artalis adtalis اڑتالیس'],
  [49, 'unchaas unanchas unpanchas انچاس'],
  [50, 'pachaas pachas fifty پچاس'],
  [51, 'ikyaawan ikyawan اکاون'],
  [52, 'baawan bawan باون'],
  [53, 'tirpan ترپن'],
  [54, 'chauwan چوان'],
  [55, 'pachpan پچپن'],
  [56, 'chhappan chappan چھپن'],
  [57, 'sattaawan sattawan satawan ستاون'],
  [58, 'atthaawan atthawan athawan اٹھاون'],
  [59, 'unsath unsat انسٹھ'],
  [61, 'iksath iksat اکسٹھ'],
  [62, 'baasath basath باسٹھ'],
  [63, 'tirsath tirsat ترسٹھ'],
  [64, 'chaunsath چونسٹھ'],
  [65, 'painsath painsat پینسٹھ'],
  [66, 'chhiyaasath chiyasath چھیاسٹھ'],
  [67, 'sarsath سڑسٹھ'],
  [68, 'arsath اڑسٹھ'],
  [69, 'unhattar unattar انہتر'],
  [70, 'sattar satar seventy ستر'],
  [71, 'ikhattar اکھتر'],
  [72, 'bahattar bahatar بہتر'],
  [73, 'tihattar تہتر'],
  [74, 'chauhattar چوہتر'],
  [75, 'pachhattar pachattar pichattar پچھتر'],
  [76, 'chhihattar چھہتر'],
  [77, 'satattar ستتر'],
  [78, 'athattar athhattar اٹھہتر'],
  [79, 'unyaasi unasi unyasi انیاسی'],
  [80, 'assi asi eighty اسی'],
  [81, 'ikyaasi اکیاسی'],
  [82, 'bayaasi بیاسی'],
  [83, 'tiraasi تراسی'],
  [84, 'chauraasi چوراسی'],
  [85, 'pachaasi pachasi پچاسی'],
  [86, 'chhiyaasi چھیاسی'],
  [87, 'sattaasi ستاسی'],
  [88, 'atthaasi اٹھاسی'],
  [89, 'nawaasi nawasi نواسی'],
  [90, 'nabbay nabbe nabbey ninety نوے'],
  [91, 'ikyaanwe ikyanve اکانوے'],
  [92, 'baanwe banve بانوے'],
  [93, 'tiraanwe tiranve ترانوے'],
  [94, 'chauraanwe churanve چورانوے'],
  [95, 'pachaanwe pachanve پچانوے'],
  [96, 'chhiyaanwe چھیانوے'],
  [97, 'sattaanwe ستانوے'],
  [98, 'atthaanwe اٹھانوے'],
  [99, 'ninnaanwe ninanve ننانوے'],
];
for (const [v, words] of UNITS) add({ t: 'unit', v }, words);
// 60 is also the everyday word "saath" (with), so it only counts as a number before sau/hazaar/lakh
add({ t: 'unit', v: 60, amb: true }, 'saath sath ساٹھ');

add({ t: 'mult', v: 100 }, 'sau sao sou hundred سو');
add({ t: 'mult', v: 1000 }, 'hazaar hazar hazzar hajar thousand ہزار');
add({ t: 'mult', v: 100000 }, 'lakh lac lakhs lak لاکھ');
add({ t: 'mult', v: 10000000 }, 'crore karor کروڑ');

add({ t: 'frac', v: 'derh' }, 'derh dedh der ڈیڑھ');
add({ t: 'frac', v: 'dhai' }, 'dhai dhaai dhae ڈھائی');
add({ t: 'frac', v: 'sawa' }, 'sawa sava سوا');
add({ t: 'frac', v: 'paune' }, 'paune pone paunay پونے');
add({ t: 'frac', v: 'sade' }, 'sade saade saarhe sarhe ساڑھے');

// ---- what kind of entry
add({ t: 'word', v: 'give' }, 'diye diya dia diey di de dedo dedi dediya dijiye دیے دیئے دئیے دیا دی دے');
add({ t: 'word', v: 'udhaar' }, 'udhaar udhar udaar uthaar ادھار ادہار');
add({ t: 'word', v: 'mile' }, 'mile mila mili milay mil milae wapas wapis wapsi jama jamaa wasool wasul aaye aya ayi aae received ملے ملا ملی مل واپس جمع وصول آئے آیا');
add({ t: 'word', v: 'sale' }, 'sale sail bikri bikree bikry sold سیل بکری');
add({ t: 'word', v: 'kharcha' }, 'kharcha kharch kharche expense expenses bill خرچہ خرچ بل');
add({ t: 'word', v: 'gone' }, 'gaya gya gayi gai gaye gae gye گیا گئی گئے');
add({ t: 'word', v: 'take' }, 'le lay لے');
add({ t: 'word', v: 'past' }, 'tha thi the thy تھا تھی تھے');

// ---- who it is about
add({ t: 'word', v: 'ko' }, 'ko کو');
add({ t: 'word', v: 'ne' }, 'ne ny nay نے');
add({ t: 'word', v: 'wala' }, 'wala wali wale walay waly walla والا والی والے');

// ---- days
add({ t: 'word', v: 'today' }, 'aaj aj آج');
add({ t: 'word', v: 'tomorrow' }, 'kal کل');
add({ t: 'word', v: 'dayafter' }, 'parson parsoon parsun پرسوں');
add({ t: 'word', v: 'next' }, 'agle agla agli next اگلے اگلا اگلی');
add({ t: 'word', v: 'week' }, 'hafte hafta haftay week ہفتے ہفتہ');
add({ t: 'word', v: 'tareekh' }, 'tareekh tarikh tareek date تاریخ');
add({ t: 'weekday', v: 0 }, 'itwar itwaar aitwar etwar sunday اتوار');
add({ t: 'weekday', v: 1 }, 'peer pir somwar monday پیر');
add({ t: 'weekday', v: 2 }, 'mangal mangalwar tuesday منگل');
add({ t: 'weekday', v: 3 }, 'budh budhwar wednesday بدھ');
add({ t: 'weekday', v: 4 }, 'jumeraat jumerat jumeraat thursday جمعرات');
add({ t: 'weekday', v: 5 }, 'jumma jumah juma jumaa friday جمعہ');
add({ t: 'weekday', v: 6 }, 'sanichar saturday سنیچر');

// ---- little words that mean nothing for us ("bhai", "yaar", "rupay", "ka", ...)
add(
  { t: 'word', v: 'stop' },
  [
    'ka ki ke kay k se say par pe pay mein main me ye yeh wo woh ho hai hain hy h to toh bhi ab phir',
    'acha achha accha theek thik ok okay sir ji jee bhai bhaiya bhae yaar yar yaaar bro sahab sahib sb uncle',
    'mujhe mera meri mere maine mene mein hum humne aap apne apna unko usko usne usse inko isko',
    'kuch bas bilkul matlab na nahi nahin nhi abhi is iska',
    'rupay rupaye rupye rupiya rupee rupees ruppay rs paise paisay paisa pese rupe',
    'khata hisab hisaab entry likho likh likhna lagao daal dal dalo kardo karo kar kr karna kiye kiya kia karwaye karaye karwa',
    'cash payment and aur ya saman maal cheez cheezein ration liya liye lia',
    'کا کی کے سے پر پہ میں یہ وہ ہو ہے ہیں تو بھی اب پھر اچھا ٹھیک جی بھائی یار صاحب',
    'مجھے میرا میری میرے میں ہم آپ اپنا کچھ بس نہیں',
    'روپے روپیہ روپئے پیسے کھاتا حساب لکھو کرو کر کیے کیا',
    // the same little words as in Roman above: "udhaar liye", "saman", "aur"
    'لیے لئے لیا لی اور یا سامان مال چیز چیزیں راشن',
  ].join(' '),
);

export function lookup(word: string): Tag | null {
  const k = wordKey(word);
  const exact = table.get(k);
  if (exact) return exact;
  // A speech slip of one letter in a long word ("kharchaa", "tareekhh")
  if (k.length >= 6 && /^[a-z]+$/.test(k)) {
    let found: Tag | null = null;
    for (const [other, tag] of table) {
      if (other.length >= 6 && Math.abs(other.length - k.length) <= 1 && distance(k, other) === 1) {
        if (found && !same(found, tag)) return null; // two different words are close: do not guess
        found = tag;
      }
    }
    return found;
  }
  return null;
}

// Only the "wala" family: used by the name matcher
export const isWala = (word: string) => {
  const tag = lookup(word);
  return tag?.t === 'word' && tag.v === 'wala';
};
