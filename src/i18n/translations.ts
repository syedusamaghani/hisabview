// ALL text shown in the app lives in this one file. No text inside components.
// 'ro' = Roman Urdu (default), 'ur' = Urdu (right-to-left), 'en' = English (words in english.ts).
// To add text: add one line below with Roman Urdu and Urdu, add the English in english.ts, then use t('yourKey').

import { english } from './english';

export type Lang = 'ro' | 'ur' | 'en';

const base = {
  appName: { ro: 'HisabView', ur: 'حساب ویو' },
  tagline: { ro: 'Aap ki dukaan ka udhaar khata', ur: 'آپ کی دکان کا ادھار کھاتا' },

  // Money words (never use accounting jargon)
  diye: { ro: 'Diye', ur: 'دیے' },
  mile: { ro: 'Mile', ur: 'ملے' },
  leneHain: { ro: 'Lene hain', ur: 'لینے ہیں' },
  deneHain: { ro: 'Dene hain', ur: 'دینے ہیں' },

  // Buttons
  theekHai: { ro: 'Theek hai', ur: 'ٹھیک ہے' },
  badlo: { ro: 'Badlo', ur: 'بدلیں' },
  wapasLo: { ro: 'Wapas lo', ur: 'واپس لو' },
  back: { ro: 'Wapas', ur: 'واپس' },
  close: { ro: 'Band karein', ur: 'بند کریں' },
  mic: { ro: 'Bolein', ur: 'بولیں' },
  listening: { ro: 'Sun rahe hain...', ur: 'سن رہے ہیں...' },

  // Messages
  saved: { ro: 'Save ho gaya', ur: 'محفوظ ہو گیا' },
  entryAdded: { ro: 'Entry likh di gayi', ur: 'اندراج لکھ دیا گیا' },

  // Hide amounts
  hideAmounts: { ro: 'Raqam chhupayein', ur: 'رقم چھپائیں' },
  showAmounts: { ro: 'Raqam dikhayein', ur: 'رقم دکھائیں' },
  amountHidden: { ro: 'Raqam chhupi hui hai', ur: 'رقم چھپی ہوئی ہے' },

  // Number keypad
  amountKeypad: { ro: 'Raqam likhein', ur: 'رقم لکھیں' },
  backspace: { ro: 'Aakhri number mitayein', ur: 'آخری نمبر مٹائیں' },

  // Empty state
  emptyTitle: { ro: 'Abhi koi entry nahi', ur: 'ابھی کوئی اندراج نہیں' },
  emptyBody: {
    ro: 'Neeche Diye ya Mile dabakar pehli entry likhein',
    ur: 'نیچے دیے یا ملے دبا کر پہلا اندراج لکھیں',
  },
  emptyButton: { ro: 'Pehli entry likhein', ur: 'پہلا اندراج لکھیں' },

  // Login
  loginTitle: { ro: 'Khush aamdeed', ur: 'خوش آمدید' },
  loginBody: {
    ro: 'Apna khata hamesha mehfooz rakhne ke liye Google se login karein',
    ur: 'اپنا کھاتا ہمیشہ محفوظ رکھنے کے لیے گوگل سے لاگ اِن کریں',
  },
  loginGoogle: { ro: 'Google se login karein', ur: 'گوگل سے لاگ اِن کریں' },
  loginError: {
    ro: 'Login nahi ho saka. Internet check karke dobara koshish karein.',
    ur: 'لاگ اِن نہیں ہو سکا۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔',
  },
  loginNotReady: {
    ro: 'Login abhi tayyar nahi hai. Thori der baad koshish karein.',
    ur: 'لاگ اِن ابھی تیار نہیں ہے۔ تھوڑی دیر بعد کوشش کریں۔',
  },
  signedInAs: { ro: 'Login hain', ur: 'لاگ اِن ہیں' },
  logout: { ro: 'Logout karein', ur: 'لاگ آؤٹ کریں' },

  // First launch: language choice (shown in both languages at once)
  langTitle: { ro: 'Apni zabaan chunein', ur: 'اپنی زبان چنیں' },
  langRoSample: { ro: 'Dukaan ka hisaab', ur: 'Dukaan ka hisaab' },
  langUrSample: { ro: 'دکان کا حساب', ur: 'دکان کا حساب' },

  // Shop name
  shopNameTitle: { ro: 'Aap ki dukaan ka naam kya hai?', ur: 'آپ کی دکان کا نام کیا ہے؟' },
  shopNameBody: {
    ro: 'Sirf ek naam likhein, baqi sab hum sambhal lenge',
    ur: 'صرف ایک نام لکھیں، باقی سب ہم سنبھال لیں گے',
  },
  shopNameLabel: { ro: 'Dukaan ka naam', ur: 'دکان کا نام' },
  shopNamePlaceholder: { ro: 'jaise: Ahmed General Store', ur: 'جیسے: احمد جنرل اسٹور' },
  next: { ro: 'Aage', ur: 'آگے' },
  later: { ro: 'Baad mein', ur: 'بعد میں' },
  allDone: { ro: 'Ho gaya', ur: 'ہو گیا' },

  // Done
  doneTitle: { ro: 'Mubarak ho! Dukaan tayyar hai', ur: 'مبارک ہو! دکان تیار ہے' },
  doneBody: {
    ro: 'Chahein to purane hisaab abhi likh lein, ya baad mein bhi likh sakte hain.',
    ur: 'چاہیں تو پرانے حساب ابھی لکھ لیں، یا بعد میں بھی لکھ سکتے ہیں۔',
  },
  oldStart: { ro: 'Purane hisaab likhein', ur: 'پرانے حساب لکھیں' },

  // Purane hisaab (old balances)
  oldTitle: { ro: 'Purane hisaab', ur: 'پرانے حساب' },
  oldBody: {
    ro: 'Kis ka kitna baqi hai? Sirf naam aur raqam likhein.',
    ur: 'کس کا کتنا باقی ہے؟ صرف نام اور رقم لکھیں۔',
  },
  pickContact: { ro: 'Contact se chunein', ur: 'رابطے سے چنیں' },
  amountLabel: { ro: 'Kitni raqam?', ur: 'کتنی رقم؟' },
  theyOweMe: { ro: 'Wo mujhe dene hain', ur: 'انہوں نے مجھے دینے ہیں' },
  iOweThem: { ro: 'Mujhe unhe dene hain', ur: 'مجھے انہیں دینے ہیں' },
  whoOwesLabel: { ro: 'Kaun kis ko dega?', ur: 'کون کس کو دے گا؟' },
  addPerson: { ro: 'Jodein', ur: 'جوڑیں' },
  addedSoFar: { ro: 'Ab tak jode gaye', ur: 'اب تک شامل کیے' },
  openingLabel: { ro: 'Purana hisaab', ur: 'پرانا حساب' },

  // Person form
  nameLabel: { ro: 'Naam', ur: 'نام' },
  namePlaceholder: { ro: 'jaise: Ali', ur: 'جیسے: علی' },
  identifierLabel: { ro: 'Pehchaan (zaroori nahi)', ur: 'پہچان (ضروری نہیں)' },
  identifierPlaceholder: { ro: 'jaise: chai wala, gali 3', ur: 'جیسے: چائے والا، گلی 3' },
  identifierHelp: {
    ro: 'Ek hi naam ke kai log hon to pehchaan se alag nazar aate hain',
    ur: 'ایک ہی نام کے کئی لوگ ہوں تو پہچان سے الگ نظر آتے ہیں',
  },
  example1: { ro: 'chai wala', ur: 'چائے والا' },
  example2: { ro: 'gali 3', ur: 'گلی 3' },
  example3: { ro: 'bakery wali', ur: 'بیکری والی' },
  example4: { ro: 'rickshaw', ur: 'رکشہ' },
  phoneLabel: { ro: 'Phone (zaroori nahi)', ur: 'فون (ضروری نہیں)' },
  phonePlaceholder: { ro: '03xx xxxxxxx', ur: '03xx xxxxxxx' },
  similarTitle: { ro: 'Is naam ke log pehle se hain', ur: 'اس نام کے لوگ پہلے سے ہیں' },
  similarHintNoId: {
    ro: 'Pehchaan likh dein taake dono alag nazar aayein',
    ur: 'پہچان لکھ دیں تاکہ دونوں الگ نظر آئیں',
  },
  similarHintWithId: {
    ro: 'Theek hai, pehchaan se ye alag nazar aayega',
    ur: 'ٹھیک ہے، پہچان سے یہ الگ نظر آئے گا',
  },
  save: { ro: 'Save karein', ur: 'محفوظ کریں' },

  // Home and party list
  newCustomer: { ro: 'Naya customer', ur: 'نیا کسٹمر' },
  showMore: { ro: 'Aur dikhao ({n})', ur: 'مزید دکھاؤ ({n})' },
  searchPlaceholder: { ro: 'Naam, pehchaan ya phone', ur: 'نام، پہچان یا فون' },
  searchLabel: { ro: 'Dhoondein', ur: 'ڈھونڈیں' },
  searchClear: { ro: 'Saaf karein', ur: 'صاف کریں' },
  noResultsTitle: { ro: 'Koi nahi mila', ur: 'کوئی نہیں ملا' },
  noResultsBody: {
    ro: 'Naam kisi aur tarah likh kar dekhein, ya naya customer jodein',
    ur: 'نام کسی اور طرح لکھ کر دیکھیں، یا نیا کسٹمر شامل کریں',
  },
  noPartiesTitle: { ro: 'Abhi koi customer nahi', ur: 'ابھی کوئی کسٹمر نہیں' },
  noPartiesBody: {
    ro: 'Pehla customer jod kar khata shuru karein',
    ur: 'پہلا کسٹمر شامل کر کے کھاتا شروع کریں',
  },
  noPartiesButton: { ro: 'Pehla customer jodein', ur: 'پہلا کسٹمر شامل کریں' },
  settled: { ro: 'Hisaab saaf', ur: 'حساب صاف' },

  // Customer page
  historyTitle: { ro: 'Hisaab ki list', ur: 'حساب کی فہرست' },
  cancelledLabel: { ro: 'Cancel hui', ur: 'منسوخ ہوئی' },
  soon: { ro: 'jald', ur: 'جلد' },
  remind: { ro: 'Yaad dilao', ur: 'یاد دلاؤ' },
  sendStatement: { ro: 'Hisaab bhejo', ur: 'حساب بھیجو' },
  listen: { ro: 'Sunao', ur: 'سناؤ' },
  cancelEntry: { ro: 'Cancel karo', ur: 'منسوخ کرو' },
  cancelAsk: {
    ro: 'Ye entry cancel karein? Ye hisaab mein nahi ginti jayegi.',
    ur: 'یہ اندراج منسوخ کریں؟ یہ حساب میں نہیں گنا جائے گا۔',
  },
  yesCancel: { ro: 'Haan, cancel karo', ur: 'ہاں، منسوخ کرو' },
  no: { ro: 'Nahi', ur: 'نہیں' },
  entryCancelled: { ro: 'Entry cancel ho gayi', ur: 'اندراج منسوخ ہو گیا' },
  archive: { ro: 'Customer chhupayein', ur: 'کسٹمر چھپائیں' },
  archiveAsk: {
    ro: 'Chhupa dein? Hisaab mehfooz rahega, bas list mein nahi dikhega.',
    ur: 'چھپا دیں؟ حساب محفوظ رہے گا، بس فہرست میں نہیں دکھے گا۔',
  },
  yesArchive: { ro: 'Haan, chhupayein', ur: 'ہاں، چھپائیں' },
  archivedDone: { ro: 'Customer chhupa diya', ur: 'کسٹمر چھپا دیا گیا' },
  partyNotFound: { ro: 'Ye customer nahi mila', ur: 'یہ کسٹمر نہیں ملا' },
  goHome: { ro: 'Pehli screen par jayein', ur: 'پہلی اسکرین پر جائیں' },

  // Diye / Mile entry
  confirmQuestion: { ro: 'Kya ye theek hai?', ur: 'کیا یہ ٹھیک ہے؟' },
  newBalance: { ro: 'Naya hisaab', ur: 'نیا حساب' },
  errorGeneric: {
    ro: 'Kuch ghalat ho gaya. Dobara koshish karein.',
    ur: 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔',
  },

  // Bottom navigation
  navHome: { ro: 'Home', ur: 'ہوم' },
  navCustomers: { ro: 'Customers', ur: 'کسٹمرز' },
  navSettings: { ro: 'Settings', ur: 'سیٹنگز' },

  // Home
  todayTitle: { ro: 'Aaj ka hisaab', ur: 'آج کا حساب' },
  todayDiye: { ro: 'Aaj diye', ur: 'آج دیے' },
  todayMile: { ro: 'Aaj mile', ur: 'آج ملے' },
  recentTitle: { ro: 'Haal ki entries', ur: 'حال کے اندراج' },
  hiddenBanner: {
    ro: 'Raqam chhupi hai. Dikhane ke liye dabayein',
    ur: 'رقم چھپی ہے۔ دکھانے کے لیے دبائیں',
  },
  micSoonTitle: { ro: 'Voice jald aa raha hai', ur: 'آواز سے لکھنا جلد آ رہا ہے' },
  micSoonBody: {
    ro: 'Bolkar entry likhna bohat jald shuru hoga. Tab tak Diye ya Mile dabakar likhein.',
    ur: 'بول کر اندراج لکھنا بہت جلد شروع ہوگا۔ تب تک دیے یا ملے دبا کر لکھیں۔',
  },

  // Choosing a customer for a new entry
  pickWho: { ro: 'Kis ke saath?', ur: 'کس کے ساتھ؟' },
  recentCustomers: { ro: 'Haal ke customers', ur: 'حال کے کسٹمرز' },
  otherCustomers: { ro: 'Baaqi customers', ur: 'باقی کسٹمرز' },

  // Note on an entry
  addNote: { ro: 'Note likhein', ur: 'نوٹ لکھیں' },
  noteLabel: { ro: 'Note (zaroori nahi)', ur: 'نوٹ (ضروری نہیں)' },
  notePlaceholder: { ro: 'jaise: chawal 5 kilo', ur: 'جیسے: چاول 5 کلو' },

  // Customers tab
  archivedSection: { ro: 'Chhupe hue customers', ur: 'چھپے ہوئے کسٹمرز' },

  // Settings
  langSection: { ro: 'Zabaan', ur: 'زبان' },
  cancelEdit: { ro: 'Rehne dein', ur: 'رہنے دیں' },
  logoutAsk: {
    ro: 'Logout karein? Aap ka hisaab is phone par mehfooz rahega.',
    ur: 'لاگ آؤٹ کریں؟ آپ کا حساب اس فون پر محفوظ رہے گا۔',
  },
  yesLogout: { ro: 'Haan, logout', ur: 'ہاں، لاگ آؤٹ' },

  // Voice parser questions (shown when the spoken sentence is not clear)
  qAmount: { ro: 'Kitni raqam?', ur: 'کتنی رقم؟' },
  qWhichAmount: { ro: 'Kaunsi raqam?', ur: 'کون سی رقم؟' },
  qKind: { ro: 'Diye ya Mile?', ur: 'دیے یا ملے؟' },
  qWho: { ro: 'Kis ka hisaab?', ur: 'کس کا حساب؟' },
  qWhichParty: { ro: 'Kaunsa {name}?', ur: 'کون سا {name}؟' },
  qSettled: { ro: '{name} ka hisaab pehle se saaf hai', ur: '{name} کا حساب پہلے سے صاف ہے' },
  settleAll: { ro: 'Poora hisaab: {amount}', ur: 'پورا حساب: {amount}' },
  qNewParty: { ro: 'Naya naam hai, add karoon?', ur: 'نیا نام ہے، شامل کروں؟' },

  // Voice screen
  voiceTitle: { ro: 'Bol kar likhein', ur: 'بول کر لکھیں' },
  voiceHint: { ro: 'Jaise: "Aslam ko 500 diye"', ur: 'جیسے: "اسلم کو 500 دیے"' },
  ruko: { ro: 'Ruko', ur: 'رکو' },
  heard: { ro: 'Aap ne kaha', ur: 'آپ نے کہا' },
  understood: { ro: 'Ab tak samjha', ur: 'اب تک سمجھا' },
  voiceRetry: { ro: 'Dobara bolein', ur: 'دوبارہ بولیں' },
  writeByHand: { ro: 'Haath se likhein', ur: 'ہاتھ سے لکھیں' },
  voiceNothing: { ro: 'Kuch suna nahi. Dobara bolein.', ur: 'کچھ سنائی نہیں دیا۔ دوبارہ بولیں۔' },
  voiceOffline: {
    ro: 'Voice ke liye internet chahiye, haath se likh lo',
    ur: 'آواز کے لیے انٹرنیٹ چاہیے، ہاتھ سے لکھ لو',
  },
  voiceDenied: {
    ro: 'Mic ki ijazat nahi mili. Browser mein mic allow karein, ya haath se likh lo.',
    ur: 'مائیک کی اجازت نہیں ملی۔ براؤزر میں مائیک کی اجازت دیں، یا ہاتھ سے لکھ لو۔',
  },
  voiceUnsupported: {
    ro: 'Is phone par bol kar likhna nahi chalta. Haath se likh lo.',
    ur: 'اس فون پر بول کر لکھنا نہیں چلتا۔ ہاتھ سے لکھ لو۔',
  },
  voiceError: {
    ro: 'Voice mein masla aaya. Dobara koshish karein ya haath se likh lo.',
    ur: 'آواز میں مسئلہ آیا۔ دوبارہ کوشش کریں یا ہاتھ سے لکھ لو۔',
  },
  checkCarefully: { ro: 'Zara dhyan se dekh lein', ur: 'ذرا دھیان سے دیکھ لیں' },
  tapToChange: { ro: 'Galat ho to naam, Diye/Mile ya raqam par dabayein', ur: 'غلط ہو تو نام، دیے/ملے یا رقم پر دبائیں' },
  promiseOn: { ro: 'Wada: {day}', ur: 'وعدہ: {day}' },
  yesAddParty: { ro: 'Haan, add karo', ur: 'ہاں، شامل کرو' },
  anotherCustomer: { ro: 'Koi aur customer', ur: 'کوئی اور کسٹمر' },

  // "Sunao": the phone reads a balance aloud
  sayLene: { ro: '{name} se aap ko {amount} rupay lene hain.', ur: '{name} سے آپ کو {amount} روپے لینے ہیں۔' },
  sayDene: { ro: 'Aap ko {name} ko {amount} rupay dene hain.', ur: 'آپ کو {name} کو {amount} روپے دینے ہیں۔' },
  saySettled: { ro: '{name} ka hisaab barabar hai.', ur: '{name} کا حساب برابر ہے۔' },

  // WhatsApp: Yaad dilao (reminder), receipt, statement, today's summary
  waLabel: { ro: 'WhatsApp', ur: 'واٹس ایپ' },
  toneSoft: { ro: 'Naram', ur: 'نرم' },
  toneNormal: { ro: 'Normal', ur: 'عام' },
  toneFirm: { ro: 'Sakht', ur: 'سخت' },
  remindHint: {
    ro: 'Tone chunein. WhatsApp khulega, bhejna aap ke haath mein hai.',
    ur: 'انداز چنیں۔ واٹس ایپ کھلے گا، بھیجنا آپ کے ہاتھ میں ہے۔',
  },
  remindNone: { ro: 'Is customer ka koi udhaar baqi nahi.', ur: 'اس کسٹمر کا کوئی ادھار باقی نہیں۔' },
  existingCustomer: { ro: 'Ye purana customer hai', ur: 'یہ پرانا کسٹمر ہے' },
  learnedTitle: { ro: 'Awaaz ki yaad', ur: 'آواز کی یاد' },
  learnedBody: {
    ro: 'App ne {n} galat suni hui baatein yaad ki hain (jaise Sahib = Saeed), taake agli baar sahi customer khud mile. Ye sirf aap ke phone par hain.',
    ur: 'ایپ نے {n} غلط سنی ہوئی باتیں یاد کی ہیں (جیسے صاحب = سعید)، تاکہ اگلی بار صحیح کسٹمر خود ملے۔ یہ صرف آپ کے فون پر ہیں۔',
  },
  learnedClear: { ro: 'Sab bhool jao', ur: 'سب بھول جاؤ' },
  typeInstead: { ro: 'Likh kar batayein', ur: 'لکھ کر بتائیں' },
  typeLabel: { ro: 'Kya hua? Likh dein', ur: 'کیا ہوا؟ لکھ دیں' },
  typePlaceholder: { ro: 'Jaise: Saeed ne 500 udhar liye', ur: 'جیسے: سعید نے 500 ادھار لیے' },
  nameLabelEdit: { ro: 'Naam (galat ho to theek karein)', ur: 'نام (غلط ہو تو ٹھیک کریں)' },
  findCustomer: { ro: 'Naam likh kar dhoondein', ur: 'نام لکھ کر ڈھونڈیں' },
  addNamed: { ro: 'Naya customer: {name}', ur: 'نیا کسٹمر: {name}' },
  addPhoneTitle: { ro: 'WhatsApp number ek baar save karein', ur: 'واٹس ایپ نمبر ایک بار محفوظ کریں' },
  addPhoneBody: {
    ro: 'Phir Yaad dilao aur Hisaab bhejo seedha isi ki chat kholenge.',
    ur: 'پھر یاد دلاؤ اور حساب بھیجو سیدھا اسی کی چیٹ کھولیں گے۔',
  },
  phoneNumberLabel: { ro: 'Number', ur: 'نمبر' },
  phoneInvalid: { ro: 'Number theek nahi lagta. Jaise 0300 1234567', ur: 'نمبر ٹھیک نہیں لگتا۔ جیسے 0300 1234567' },
  msgSoft: {
    ro: 'Assalam o alaikum {name}, umeed hai aap khairiyat se honge. {shop} ka {amount} aap ke zimme baqi hai. Jab suhoolat ho ada kar dijiye ga. Bohot shukriya.',
    ur: 'السلام علیکم {name}، امید ہے آپ خیریت سے ہوں گے۔ {shop} کا {amount} آپ کے ذمے باقی ہے۔ جب سہولت ہو ادا کر دیجیے گا۔ بہت شکریہ۔',
  },
  msgNormal: {
    ro: 'Assalam o alaikum {name}, {shop} mein aap ka {amount} baqi hai. Meherbani karke jald ada kar dein. Shukriya.',
    ur: 'السلام علیکم {name}، {shop} میں آپ کا {amount} باقی ہے۔ مہربانی کر کے جلد ادا کر دیں۔ شکریہ۔',
  },
  msgFirm: {
    ro: '{name}, {shop} mein aap ka {amount} kaafi dinon se baqi hai. Baraye meherbani aaj ya kal tak ada kar dein.',
    ur: '{name}، {shop} میں آپ کا {amount} کافی دنوں سے باقی ہے۔ برائے مہربانی آج یا کل تک ادا کر دیں۔',
  },
  msgReceiptDiye: {
    ro: 'Assalam o alaikum {name}, {shop} mein aap ka {amount} ka udhaar likha gaya. {balance}',
    ur: 'السلام علیکم {name}، {shop} میں آپ کا {amount} کا ادھار لکھا گیا۔ {balance}',
  },
  msgReceiptMile: {
    ro: 'Assalam o alaikum {name}, {shop} ko aap ke {amount} mile. Shukriya. {balance}',
    ur: 'السلام علیکم {name}، {shop} کو آپ کے {amount} ملے۔ شکریہ۔ {balance}',
  },
  balOwes: { ro: 'Ab tak ka baqi hisaab: {amount}.', ur: 'اب تک کا باقی حساب: {amount}۔' },
  balZero: { ro: 'Aap ka hisaab barabar hai.', ur: 'آپ کا حساب برابر ہے۔' },
  balAdvance: { ro: 'Aap ke {amount} hamare paas jama hain.', ur: 'آپ کے {amount} ہمارے پاس جمع ہیں۔' },
  msgStatementTitle: { ro: '{shop}: {name} ka hisaab', ur: '{shop}: {name} کا حساب' },
  todayShareTitle: { ro: '{shop}: aaj ka hisaab ({day})', ur: '{shop}: آج کا حساب ({day})' },

  // Aaj ka hisaab page, and writing a sale or a kharcha
  todaySale: { ro: 'Aaj ki sale', ur: 'آج کی سیل' },
  todayKharcha: { ro: 'Aaj ka kharcha', ur: 'آج کا خرچہ' },
  todayEntries: { ro: 'Aaj ki entries', ur: 'آج کے اندراج' },
  todayEmpty: { ro: 'Aaj abhi koi entry nahi', ur: 'آج ابھی کوئی اندراج نہیں' },
  saleLabel: { ro: 'Sale', ur: 'سیل' },
  kharchaLabel: { ro: 'Kharcha', ur: 'خرچہ' },
  writeSale: { ro: 'Sale', ur: 'سیل' },
  writeKharcha: { ro: 'Kharcha', ur: 'خرچہ' },

  // Sync (backup to the internet), restore on a new phone
  syncSynced: { ro: 'Save ho gaya', ur: 'محفوظ ہو گیا' },
  syncQueued: { ro: 'Internet aate hi save hoga', ur: 'انٹرنیٹ آتے ہی محفوظ ہوگا' },
  syncSaving: { ro: 'Save ho raha hai...', ur: 'محفوظ ہو رہا ہے...' },
  syncProblem: { ro: 'Kuch entries server par save nahi hui', ur: 'کچھ اندراج سرور پر محفوظ نہیں ہوئے' },
  backupTitle: { ro: 'Hisaab ka backup', ur: 'حساب کا بیک اپ' },
  backupBody: {
    ro: 'Aap ka hisaab internet par bhi mehfooz hota hai. Phone kho jaye to naye phone par isi Google account se login karein, sab wapas aa jayega.',
    ur: 'آپ کا حساب انٹرنیٹ پر بھی محفوظ ہوتا ہے۔ فون کھو جائے تو نئے فون پر اسی گوگل اکاؤنٹ سے لاگ ان کریں، سب واپس آ جائے گا۔',
  },
  backupAccount: { ro: 'Google account', ur: 'گوگل اکاؤنٹ' },
  backupLast: { ro: 'Aakhri baar mehfooz: {when}', ur: 'آخری بار محفوظ: {when}' },
  backupNever: { ro: 'Abhi tak internet par save nahi hua', ur: 'ابھی تک انٹرنیٹ پر محفوظ نہیں ہوا' },
  backupPending: { ro: '{n} cheezein internet ka intezar kar rahi hain', ur: '{n} چیزیں انٹرنیٹ کا انتظار کر رہی ہیں' },
  backupNow: { ro: 'Abhi save karo', ur: 'ابھی محفوظ کریں' },
  backupProblem: {
    ro: 'Server ne kuch entries qubool nahi kin. Wo aap ke phone par mehfooz hain.',
    ur: 'سرور نے کچھ اندراج قبول نہیں کیے۔ وہ آپ کے فون پر محفوظ ہیں۔',
  },
  restoreTitle: { ro: 'Aap ka hisaab wapas la rahe hain...', ur: 'آپ کا حساب واپس لا رہے ہیں...' },
  restoreWait: { ro: 'Thora intezar karein', ur: 'تھوڑا انتظار کریں' },
  restoreFailed: {
    ro: 'Hisaab wapas nahi aa saka. Internet check karke dobara koshish karein.',
    ur: 'حساب واپس نہیں آ سکا۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔',
  },
  restoreRetry: { ro: 'Dobara koshish karein', ur: 'دوبارہ کوشش کریں' },

  // Install the app on the phone
  installTitle: { ro: 'App ko phone mein rakh lein', ur: 'ایپ کو فون میں رکھ لیں' },
  installBody: {
    ro: 'Home screen par icon aa jayega, aur internet ke bina bhi khulegi.',
    ur: 'ہوم اسکرین پر آئیکن آ جائے گا، اور انٹرنیٹ کے بغیر بھی کھلے گی۔',
  },
  installButton: { ro: 'Install karein', ur: 'انسٹال کریں' },
  installLater: { ro: 'Baad mein', ur: 'بعد میں' },
  installIos: {
    ro: 'Safari mein neeche Share dabayein, phir "Add to Home Screen" chunein.',
    ur: 'سفاری میں نیچے شیئر دبائیں، پھر "Add to Home Screen" چنیں۔',
  },
  installSettings: { ro: 'App install karein', ur: 'ایپ انسٹال کریں' },

  // Privacy policy (the page at /privacy, readable without logging in)
  privacyLink: { ro: 'Privacy Policy', ur: 'رازداری کی پالیسی' },
  privacyTitle: { ro: 'Privacy Policy (raazdaari ki policy)', ur: 'رازداری کی پالیسی' },
  privacyUpdated: { ro: 'Aakhri tabdeeli: 4 November 2026', ur: 'آخری تبدیلی: 4 نومبر 2026' },
  privacyIntro: {
    ro: 'HisabView chhoti dukaanon ke liye udhaar khata hai. Yahan seedhe lafzon mein likha hai ke hum kya jankari lete hain, kyun, aur aap ke kya haq hain.',
    ur: 'حساب ویو چھوٹی دکانوں کے لیے ادھار کھاتا ہے۔ یہاں سیدھے لفظوں میں لکھا ہے کہ ہم کیا معلومات لیتے ہیں، کیوں، اور آپ کے کیا حق ہیں۔',
  },
  privacy1T: { ro: '1. Hum kya jankari lete hain', ur: 'ہم کیا معلومات لیتے ہیں' },
  privacy1B: {
    ro: 'Google login se aap ka email aur naam (sirf login ke liye). Aap ki dukaan ka naam. Aap ke customers ke naam, pehchaan (jaise "chai wala"), aur phone number agar aap likhein. Aap ki entries: raqam, tareekh, note. Bol kar likhne par jo jumla likha gaya (text).',
    ur: 'گوگل لاگ ان سے آپ کا ای میل اور نام (صرف لاگ ان کے لیے)۔ آپ کی دکان کا نام۔ آپ کے کسٹمرز کے نام، پہچان (جیسے "چائے والا")، اور فون نمبر اگر آپ لکھیں۔ آپ کے اندراج: رقم، تاریخ، نوٹ۔ بول کر لکھنے پر جو جملہ لکھا گیا (ٹیکسٹ)۔',
  },
  privacy2T: { ro: '2. Ye jankari kahan rehti hai', ur: 'یہ معلومات کہاں رہتی ہیں' },
  privacy2B: {
    ro: 'Pehle aap ke apne phone mein. Phir backup ke liye Supabase (internet ka database) mein, taake phone kho jaye to hisaab wapas aa sake. Har dukaan sirf apna hisaab dekh sakti hai, doosri dukaan ka nahi.',
    ur: 'پہلے آپ کے اپنے فون میں۔ پھر بیک اپ کے لیے سپابیس (انٹرنیٹ کے ڈیٹابیس) میں، تاکہ فون کھو جائے تو حساب واپس آ سکے۔ ہر دکان صرف اپنا حساب دیکھ سکتی ہے، دوسری دکان کا نہیں۔',
  },
  privacy3T: { ro: '3. Aap ki awaaz', ur: 'آپ کی آواز' },
  privacy3B: {
    ro: 'Bol kar likhne par aap ke phone ka browser (Chrome) aap ki awaaz ko likhai mein badalne ke liye Google ki service ko bhejta hai, is liye internet chahiye. HisabView awaaz record ya save nahi karta, sirf wo text rakhta hai jo aap confirm karte hain.',
    ur: 'بول کر لکھنے پر آپ کے فون کا براؤزر (کروم) آپ کی آواز کو لکھائی میں بدلنے کے لیے گوگل کی سروس کو بھیجتا ہے، اس لیے انٹرنیٹ چاہیے۔ حساب ویو آواز ریکارڈ یا محفوظ نہیں کرتا، صرف وہ ٹیکسٹ رکھتا ہے جو آپ تصدیق کرتے ہیں۔',
  },
  privacy4T: { ro: '4. WhatsApp', ur: 'واٹس ایپ' },
  privacy4B: {
    ro: 'Jab aap "Yaad dilao" ya "Hisaab bhejo" dabate hain, to sirf aap ke apne WhatsApp mein message tayyar hota hai. Bhejna aap ke haath mein hai. HisabView khud koi message nahi bhejta.',
    ur: 'جب آپ "یاد دلاؤ" یا "حساب بھیجو" دباتے ہیں تو صرف آپ کے اپنے واٹس ایپ میں پیغام تیار ہوتا ہے۔ بھیجنا آپ کے ہاتھ میں ہے۔ حساب ویو خود کوئی پیغام نہیں بھیجتا۔',
  },
  privacy5T: { ro: '5. Kis ke saath share hota hai', ur: 'کس کے ساتھ شیئر ہوتا ہے' },
  privacy5B: {
    ro: 'Hum aap ki jankari bechte nahi, kisi ko dete nahi, aur ads nahi dikhate. Sirf ye service dene wale: Google (login aur awaaz ki likhai), Supabase (backup database), Cloudflare (website chalane ke liye). HisabView ka Google ki jankari ka istemal sirf login ke liye hai.',
    ur: 'ہم آپ کی معلومات بیچتے نہیں، کسی کو دیتے نہیں، اور اشتہار نہیں دکھاتے۔ صرف یہ سروس دینے والے: گوگل (لاگ ان اور آواز کی لکھائی)، سپابیس (بیک اپ ڈیٹابیس)، کلاؤڈفلیئر (ویب سائٹ چلانے کے لیے)۔ حساب ویو کا گوگل کی معلومات کا استعمال صرف لاگ ان کے لیے ہے۔',
  },
  privacy6T: { ro: '6. Hifazat', ur: 'حفاظت' },
  privacy6B: {
    ro: 'Sara rabta HTTPS (mehfooz connection) se hota hai. Hisaab ki entries kabhi mitai nahi jatin, sirf "cancel" hoti hain aur history mein rehti hain, taake jhagre mein saboot rahe. Phir bhi koi system 100% mehfooz nahi hota.',
    ur: 'سارا رابطہ HTTPS (محفوظ کنکشن) سے ہوتا ہے۔ حساب کے اندراج کبھی مٹائے نہیں جاتے، صرف "منسوخ" ہوتے ہیں اور ہسٹری میں رہتے ہیں، تاکہ جھگڑے میں ثبوت رہے۔ پھر بھی کوئی نظام سو فیصد محفوظ نہیں ہوتا۔',
  },
  privacy7T: { ro: '7. Aap ke haq', ur: 'آپ کے حق' },
  privacy7B: {
    ro: 'Aap apna hisaab kabhi bhi app mein dekh sakte hain. Agar aap chahte hain ke aap ka poora hisaab aur account hamesha ke liye mita diya jaye, to hamein likhein (neeche rabta dekhein). Hum aap ki darkhwast par sab kuch mita dete hain.',
    ur: 'آپ اپنا حساب کبھی بھی ایپ میں دیکھ سکتے ہیں۔ اگر آپ چاہتے ہیں کہ آپ کا پورا حساب اور اکاؤنٹ ہمیشہ کے لیے مٹا دیا جائے تو ہمیں لکھیں (نیچے رابطہ دیکھیں)۔ ہم آپ کی درخواست پر سب کچھ مٹا دیتے ہیں۔',
  },
  privacy8T: { ro: '8. Customers ki jankari', ur: 'کسٹمرز کی معلومات' },
  privacy8B: {
    ro: 'Aap apne customers ke naam aur phone number khud likhte hain. Wo sirf aap ke hisaab ke liye hain. Hum unhein kisi aur kaam mein istemal nahi karte, na unhein message bhejte hain.',
    ur: 'آپ اپنے کسٹمرز کے نام اور فون نمبر خود لکھتے ہیں۔ وہ صرف آپ کے حساب کے لیے ہیں۔ ہم انہیں کسی اور کام میں استعمال نہیں کرتے، نہ انہیں پیغام بھیجتے ہیں۔',
  },
  privacy9T: { ro: '9. Bachche', ur: 'بچے' },
  privacy9B: {
    ro: 'HisabView dukandaron ke liye hai, bachchon ke liye nahi.',
    ur: 'حساب ویو دکانداروں کے لیے ہے، بچوں کے لیے نہیں۔',
  },
  privacy10T: { ro: '10. Tabdeeli aur rabta', ur: 'تبدیلی اور رابطہ' },
  privacy10B: {
    ro: 'Ye policy badal sakti hai; naya waqt upar likha hoga. Sawal ya mitwane ki darkhwast ke liye app ke Settings mein "Hamein batayein" dabayein',
    ur: 'یہ پالیسی بدل سکتی ہے؛ نیا وقت اوپر لکھا ہوگا۔ سوال یا مٹانے کی درخواست کے لیے ایپ کی سیٹنگز میں "ہمیں بتائیں" دبائیں',
  },
  privacyEmail: { ro: 'ya email karein:', ur: 'یا ای میل کریں:' },

  // Feedback ("Hamein batayein") and the "something broke" screen
  feedbackTitle: { ro: 'Hamein batayein', ur: 'ہمیں بتائیں' },
  feedbackHint: { ro: 'Koi masla hai ya kya behtar ho sakta hai? Likh dein.', ur: 'کوئی مسئلہ ہے یا کیا بہتر ہو سکتا ہے؟ لکھ دیں۔' },
  kindProblem: { ro: 'Masla hai', ur: 'مسئلہ ہے' },
  kindIdea: { ro: 'Idea hai', ur: 'آئیڈیا ہے' },
  kindThanks: { ro: 'Shukriya', ur: 'شکریہ' },
  feedbackPlaceholder: { ro: 'Yahan likhein...', ur: 'یہاں لکھیں...' },
  feedbackSend: { ro: 'Bhejein', ur: 'بھیجیں' },
  feedbackSent: { ro: 'Shukriya! Aap ka paigham mil gaya.', ur: 'شکریہ! آپ کا پیغام مل گیا۔' },
  feedbackQueued: { ro: 'Internet aate hi chala jayega.', ur: 'انٹرنیٹ آتے ہی چلا جائے گا۔' },
  versionLabel: { ro: 'Version', ur: 'ورژن' },
  errTitle: { ro: 'Kuch gadbad ho gayi', ur: 'کچھ گڑبڑ ہو گئی' },
  errBody: {
    ro: 'Maaf kijiye. Aap ka hisaab phone mein mehfooz hai. App dobara kholein.',
    ur: 'معاف کیجیے۔ آپ کا حساب فون میں محفوظ ہے۔ ایپ دوبارہ کھولیں۔',
  },
  errReload: { ro: 'Dobara kholein', ur: 'دوبارہ کھولیں' },

  // Language names (always shown in their own language)
  langRo: { ro: 'Roman Urdu', ur: 'Roman Urdu' },
  langUr: { ro: 'اردو', ur: 'اردو' },
  langEn: { ro: 'English', ur: 'English' },
} as const;

export type TextKey = keyof typeof base;

// Every key with all three languages
export const text = Object.fromEntries(
  (Object.keys(base) as TextKey[]).map((k) => [k, { ...base[k], en: english[k] }]),
) as Record<TextKey, { ro: string; ur: string; en: string }>;

// The server only knows 'ro' and 'ur' for a shop's language, so English is kept as 'ro' there
// (the phone remembers the real choice).
export const shopLanguage = (lang: Lang): 'ro' | 'ur' => (lang === 'en' ? 'ro' : lang);

export const isRtl = (lang: Lang) => lang === 'ur';
