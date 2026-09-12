// lib/i18n/locales/ceb.ts — Cebuano (Binisaya).
//
// The language Ormoc actually speaks, so this is the locale that decides whether
// a kasambahay can use CareLink without help.
//
// HOW THIS IS WRITTEN
//
// Everyday spoken Cebuano, not formal or academic register — the way people in
// Ormoc talk. English loanwords stay where they are genuinely what people say:
// nobody asks for a "pultahan sa trabaho" when they mean an application, and a
// forced native coinage reads as stilted and is often less clear than the
// borrowed word.
//
// Deliberately UNTRANSLATED, in any locale:
//   - "PESO", "TESDA", "DOLE", "RA 10361", "Barangay Clearance", "Valid ID" —
//     these are proper names of offices and documents. A helper asking for a
//     "Barangay Clearance" at the barangay hall must use those exact words.
//   - "CareLink", "kasambahay".
//
// ⚠ NEEDS A NATIVE REVIEW before the defense. This is careful, checked Cebuano,
// but a fluent Ormocanon reading it aloud will catch register and word-choice
// slips that no amount of care from a non-native writer prevents. Wrong-sounding
// Cebuano is worse than English, because it reads as carelessness about the
// people the system is for.
export default {
  common: {
    save: 'I-save',
    cancel: 'Kanselahon',
    close: 'Sirado',
    back: 'Balik',
    next: 'Sunod',
    submit: 'Ipadala',
    confirm: 'Kumpirmahon',
    delete: 'Papason',
    edit: 'Usbon',
    retry: 'Sulayi pag-usab',
    loading: 'Gikarga…',
    search: 'Pangitaa',
    filter: 'Salaon',
    all: 'Tanan',
    yes: 'Oo',
    no: 'Dili',
    optional: 'dili kinahanglan',
    required: 'kinahanglan',
    today: 'Karong adlawa',
    yesterday: 'Gahapon',
    somethingWentWrong: 'Naay sayop nga nahitabo',
    checkConnection: 'Susiha ang imong koneksyon ug sulayi pag-usab.',
    noResults: 'Wala pay ipakita.',
  },

  roles: {
    helper: 'Katabang',
    employer: 'Amo sa Balay',
    peso: 'Opisyal sa PESO',
    admin: 'System Administrator',
  },

  auth: {
    login: {
      title: 'Maayong pagbalik',
      subtitle: 'Sulod aron magpadayon.',
      emailOrMobile: 'Email o numero sa cellphone',
      password: 'Password',
      signIn: 'Sulod',
      forgot: 'Nakalimtan ang password?',
      noAccount: 'Wala pa kay account?',
      createOne: 'Paghimo ug usa',
      wrongCredentials: 'Palihug isulat ang husto nga email/numero ug password.',
      pending: 'Ang imong account gipaabot pa nga aprubahan.',
      verifyEmail:
        'Palihug i-verify ang imong email aron magpadayon. Tan-awa ang 6 ka numero nga code sa imong inbox.',
    },
    signup: {
      helperTitle: 'Pagparehistro isip Katabang',
      employerTitle: 'Pagparehistro isip Amo sa Balay',
      subtitle: 'Paghimo ug account aron makasugod.',
      firstName: 'Pangalan',
      lastName: 'Apelyido',
      middleName: 'Tunga nga pangalan',
      email: 'Email',
      mobile: 'Numero sa cellphone',
      signInHint: 'Makasulod ka gamit ang imong email o numero sa cellphone.',
      password: 'Password',
      confirm: 'Kumpirmahon',
      repeatPassword: 'Isulat pag-usab ang password',
      createAccount: 'Paghimo ug account',
      creating: 'Gihimo ang imong account…',
      haveAccount: 'Naa na kay account?',
      logIn: 'Sulod',
      needTitle: 'Palihug pagbutang ug mubo nga ulohan.',
      consent:
        'Uyon ko nga kolektahon ug gamiton sa CareLink ang akong personal nga impormasyon para sa pagpangita ug trabaho, subay sa',
      pwAtLeast8: 'Labing menos 8 ka karakter',
      pwLower: '1 gamay nga letra',
      pwUpper: '1 dako nga letra',
      pwNumber: '1 numero',
      pwSpecial: '1 espesyal nga karakter',
    },
    roleSelect: {
      title: 'Unsaon nimo paggamit ang CareLink?',
      hiring: 'Nangita ko ug kasambahay',
      lookingForWork: 'Nangita ko ug trabaho',
    },
  },

  nav: {
    dashboard: 'Dashboard',
    findJobs: 'Pangitag Trabaho',
    browseHelpers: 'Tan-awa ang mga Katabang',
    myApplications: 'Akong mga Aplikasyon',
    jobPosts: 'Mga Trabaho',
    applications: 'Mga Aplikasyon',
    messages: 'Mensahe',
    notifications: 'Mga Pahibalo',
    profile: 'Profile',
    settings: 'Setting',
    work: 'Trabaho',
    logOut: 'Gawas',
  },

  verification: {
    pesoVerified: 'PESO Verified',
    pending: 'Gipaabot',
    unverified: 'Wala pa ma-verify',
    rejected: 'Gibalibaran',
    underReview: 'Gisusi pa sa PESO ang imong account.',
    validId: 'Valid ID',
    barangayClearance: 'Barangay Clearance',
    policeClearance: 'Police Clearance',
    tesda: 'TESDA NC II',
    uploadDocs: 'I-upload ang imong mga dokumento',
    docsHint:
      'Ang PESO magsusi ug Valid ID ug Barangay Clearance. Ang uban dili kinahanglan.',
  },

  jobs: {
    postJob: 'Pag-post ug trabaho',
    salary: 'Sweldo',
    perMonth: 'kada bulan',
    stayIn: 'Stay-in',
    stayOut: 'Stay-out',
    fullTime: 'Full-time',
    partTime: 'Part-time',
    apply: 'Mo-apply',
    applied: 'Ni-apply na',
    saveJob: 'I-save ang trabaho',
    match: 'Bagay',
    minimumSalary:
      'Labing menos ₱6,400 kada bulan, sumala sa regional wage board (Wage Order VIII-DW-06).',
  },

  application: {
    pending: 'Gipaabot',
    reviewed: 'Nasusi na',
    shortlisted: 'Napili para sa sunod nga lakang',
    interviewScheduled: 'Naay naka-iskedyul nga interview',
    hired: 'Gidawat sa trabaho',
    rejected: 'Wala napili',
    withdrawn: 'Gibawi',
  },

  work: {
    checkIn: 'Time in',
    checkOut: 'Time out',
    checkedIn: 'Naka-time in',
    checkedOut: 'Naka-time out',
    restDay: 'Adlaw nga pahulay',
    tasks: 'Mga buluhaton',
    attendance: 'Atendance',
    leave: 'Leave',
    payroll: 'Sweldo',
    hoursThisMonth: 'Mga oras karong bulana',
    totalHours: 'Tanan nga oras',
    daysWorked: 'Adlaw nga nitrabaho',
    regular: 'Regular',
    overtime: 'Overtime',
    daysWithOvertime: 'Mga adlaw nga naay overtime',
    overCeilingWarning:
      'milapas sa 12 ka oras nga gitakda sa kontrata. Sumala sa RA 10361, ang normal nga trabaho kada adlaw kay 8 ka oras, ug ang sobra niini kay overtime.',
    notCheckedOut: 'wala pa naka-time out, mao nga wala pa maapil.',
    noCompletedDays:
      'Wala pay nahuman nga adlaw karong bulana. Makita ang mga oras kung naka-time out na.',
  },

  complaint: {
    report: 'Ireport ang problema',
    category: 'Klase',
    shortTitle: 'Mubo nga ulohan',
    whatHappened: 'Unsa ang nahitabo?',
    whenHappened: 'Kanus-a kini nahitabo?',
    whereHappened: 'Asa kini nahitabo?',
    submitted: 'Ang imong report gipadala sa system administrator sa CareLink.',
    goesToAdmin: 'Moadto kini sa system administrator aron susihon.',
    catConduct: 'Pamatasan / pagtratar',
    catPayment: 'Sweldo o bayad',
    catContract: 'Kontrata o buluhaton',
    catUnsafe: 'Delikado nga kahimtang sa trabaho',
    catAbuse: 'Pag-abuso o dautang pagtratar',
    catHarassment: 'Panghasi',
    catTheft: 'Kawat / nawala nga butang',
    catDamage: 'Nadaot nga butang',
    catAbandonment: 'Mibiya sa trabaho nga walay pahibalo',
    catFraud: 'Peke nga profile o panglimbong',
    catTechnical: 'Problema sa app',
    catOther: 'Uban pa',
  },

  settings: {
    title: 'Setting',
    language: 'Pinulongan',
    languageHint: 'Mausab ang app niini nga device.',
    appearance: 'Hitsura',
    account: 'Account',
    privacyPolicy: 'Privacy Policy',
    logOut: 'Gawas',
    logOutConfirm: 'Sigurado ka nga mogawas?',
  },
} as const;
