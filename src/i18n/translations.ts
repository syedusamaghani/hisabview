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
  remindNoPhone: {
    ro: 'Is customer ka number nahi hai. WhatsApp mein khud chun lein.',
    ur: 'اس کسٹمر کا نمبر نہیں ہے۔ واٹس ایپ میں خود چن لیں۔',
  },
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

  // Language names (always shown in their own language)
  langRo: { ro: 'Roman Urdu', ur: 'Roman Urdu' },
  langUr: { ro: 'اردو', ur: 'اردو' },
} as const;

export type TextKey = keyof typeof text;

export const isRtl = (lang: Lang) => lang === 'ur';
