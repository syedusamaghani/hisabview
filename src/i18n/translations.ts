// ALL text shown in the app lives in this one file. No text inside components.
// 'ro' = Roman Urdu (default), 'ur' = Urdu (right-to-left).
// To add text: add one line below with both languages, then use t('yourKey').

export type Lang = 'ro' | 'ur';

export const text = {
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

  // Language names (always shown in their own language)
  langRo: { ro: 'Roman Urdu', ur: 'Roman Urdu' },
  langUr: { ro: 'اردو', ur: 'اردو' },
} as const;

export type TextKey = keyof typeof text;

export const isRtl = (lang: Lang) => lang === 'ur';
