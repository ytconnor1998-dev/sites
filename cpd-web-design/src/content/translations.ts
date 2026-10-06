/**
 * ───────────────────────────────────────────────────────────────
 *  ALL MAIN-SITE COPY (English + Italian)
 *  Keep both languages in sync: `it` must have the same shape as `en`
 *  (TypeScript will complain if a key is missing).
 *  Tokens like {price}, {months}, {fee}, {name} are filled in from src/config/site.ts.
 *
 *  Voice: first person, plain, specific. Say what happens, not slogans.
 * ───────────────────────────────────────────────────────────────
 */

const en = {
  meta: {
    // Shown in Google results. Keep titles under ~65 characters and descriptions under ~155.
    title: "Web Designer in Rome: Website Built Free, From {min} a Month",
    description:
      "Web designer in Rome for small businesses. I build your website free, then {min}–{max} a month covers hosting, updates, changes and support. English and Italian.",
    examplesTitle: "Example Websites for Restaurants, Hotels & Shops in Rome",
    examplesDescription:
      "Working example sites for a restaurant, hotel, tour company, salon, yoga studio and photographer in Rome. Try the bookings and see what you'd get, built free.",
    ogLocale: "en_GB",
  },
  nav: {
    how: "How it works",
    pricing: "Prices",
    work: "Work",
    examples: "Examples",
    faq: "FAQ",
    about: "About",
    cta: "Get your free site",
    menu: "Menu",
    close: "Close",
    skip: "Skip to content",
    language: "Language",
  },
  hero: {
    eyebrow: "Web designer in Rome",
    titleA: "Your website,",
    titleB: "built free.",
    sub: "You just pay to keep it running, from {price} a month.",
    cta: "Get your free site",
    secondary: "See example sites",
    showcase: "Example sites, with the plan each one is on",
  },
  how: {
    title: "How it works",
    steps: [
      { title: "We talk", body: "Twenty minutes on the phone or over a coffee. You tell me what the business does and what the site needs to do. There's no charge and no commitment." },
      { title: "I design and build it", body: "Usually within two weeks. I write or tidy up the text, sort out the photos and build it to work properly on phones. You see it first and tell me what to change." },
      { title: "It goes live", body: "I connect your domain, set up your Google Business Profile and analytics, and switch it on." },
      { title: "I look after it", body: "Every month I handle hosting, updates and backups, and make the changes you send me. New price or new photo? Send it on WhatsApp." },
    ],
  },
  included: {
    title: "What the monthly fee covers",
    intro: "Everything a site needs after launch. Most agencies charge for these separately.",
    items: [
      { key: "hosting", title: "Hosting", body: "Fast, reliable hosting. You never have to deal with a hosting company." },
      { key: "ssl", title: "SSL and security", body: "The padlock in the address bar, and security updates applied as soon as they're released." },
      { key: "maintenance", title: "Updates", body: "Software and integrations kept current, so nothing quietly stops working." },
      { key: "backups", title: "Daily backups", body: "If something breaks, I restore yesterday's version." },
      { key: "edits", title: "Changes", body: "New menu, new prices, new photos. Send them over and I'll update the site." },
      { key: "support", title: "Support", body: "Me, on WhatsApp or email, in English or Italian." },
      { key: "speed", title: "Speed", body: "Compressed images and lean code, so pages open quickly on a phone signal." },
      { key: "mobile", title: "Phones first", body: "Most people will find you on a phone, so that's what I design for first." },
    ],
  },
  pricing: {
    title: "Prices",
    intro: "Two plans. The design and build are free on both; the monthly fee covers everything after that.",
    perMonth: "/month",
    vat: "+ VAT",
    free: "€0 to design and build.",
    choose: "Choose {name}",
    termTitle: "There's a {months}-month minimum term.",
    termBody:
      "That's how the design and build get paid for without an upfront fee. After {months} months it's month to month, and you can cancel with 30 days' notice.",
    compareTitle: "Compared with a typical agency",
    compareIntro: "What a small business website usually costs in its first year.",
    agency: "Typical agency",
    you: "CPD Web Design",
    rows: {
      build: "Design and build",
      hosting: "Hosting and SSL",
      maintenance: "Maintenance",
      edits: "Changes",
      support: "Support",
      dueToday: "Due today",
      yearOne: "First year",
    },
    perMonthShort: "/mo",
    billed: "by the hour",
    included: "included",
    basedOn: "Compared with the Business plan. Agency figures are typical for small Italian businesses.",
  },
  catch: {
    title: "What's the catch?",
    points: [
      {
        title: "There's a minimum term",
        body: "{months} months. That's how I get paid for the design and build without charging you up front. After that it's month to month.",
      },
      {
        title: "I host the site",
        body: "It runs on my hosting so I can keep it fast, secure and up to date. You never have to touch a server, a plugin or a password reset.",
      },
      {
        title: "You can leave",
        body: "Your domain and your content are always yours. After the minimum term you can take the whole site with you for a one-off {fee}, or simply cancel.",
      },
    ],
  },
  industries: {
    title: "What each example includes",
    intro: "Every feature below works in the example site. Each example shows which plan it's built on.",
    demo: "Open the {name} example",
    note: "Need something that isn't listed? Ask and I'll tell you whether it's included or what it would cost.",
  },
  work: {
    title: "Example sites",
    intro: "Complete sites for made-up businesses in Rome, built the way I'd build yours. Open one and try it: the bookings, menus and language switch all work.",
    visit: "Visit site",
    view: "Open example",
    all: "All example sites",
    soon: "Case study coming soon",
  },
  examples: {
    title: "Example sites",
    intro:
      "Complete, working websites for made-up businesses in Rome, built the way I'd build yours. Try the language switch and the booking forms, and turn on Features to see what each part is for.",
    open: "Open example",
    more: "Don't see your kind of business? I build sites for almost any local business: shops, B&Bs, dentists, architects, mechanics.",
    ask: "Get in touch",
  },
  faq: {
    title: "Questions",
    items: [
      {
        q: "What's the catch?",
        a: "There's a {months}-month minimum term, which is how the design and build are paid for over time instead of up front. I host and maintain the site so it stays fast and secure. After the minimum term it's month to month, and you can leave whenever you like.",
      },
      {
        q: "Who owns the site?",
        a: "Your domain, your content (text, photos, logo) and your data are always yours. The design and code are licensed to you while you're on a plan. After the minimum term you can buy them outright for a one-off {fee} and host them anywhere.",
      },
      {
        q: "What if I want to cancel?",
        a: "After the minimum term, give 30 days' notice. There's no penalty. If you cancel during the minimum term, the remaining months are still due, as with any fixed-term contract.",
      },
      {
        q: "Can I get my domain back?",
        a: "It's always yours. I register domains in your name, or use the one you already have, and I'll transfer it to you or a new provider whenever you ask, at no cost.",
      },
      {
        q: "How long does it take?",
        a: "Most sites go live one to two weeks after we first talk. The main thing that slows it down is gathering photos and text, and I help with both.",
      },
      {
        q: "Do you build sites in Italian?",
        a: "Yes. I work in English and Italian, and every site can have both, with a language switch like the one on this site. It's included in the Business plan.",
      },
      {
        q: "What counts as a small change?",
        a: "Anything that takes up to about 30 minutes: changing text, prices or opening hours, swapping photos, adding a dish or an event. The One page plan includes one a month and the Business plan three. New pages and new features are quoted separately.",
      },
      {
        q: "Which plan do I need?",
        a: "If you need a single page that says who you are and how to reach you, such as a portfolio, CV, event or small side project, One page is enough. If you're a business that needs a menu, bookings, several pages or two languages, choose Business. You can move up at any time.",
      },
      {
        q: "Is anything not included?",
        a: "Bigger jobs: more than five pages, an online shop, new features or a full redesign. I'll quote those before doing any work, so there are no surprise invoices.",
      },
    ],
  },
  about: {
    title: "About me",
    paragraphs: [
      "I'm {name}, a designer and developer based in Rome. I've built websites for small businesses for years, and kept seeing the same thing: thousands paid up front for a site that nobody looked after once it launched.",
      "So I changed how I charge. I build the site properly for free, and I'm paid each month for keeping it working. If your site isn't doing its job, I hear about it.",
      "I work with restaurants, hotels, studios and shops in Rome and further afield, in English and Italian.",
    ],
    photoAlt: "Photo of {name}",
    photoPlaceholder: "Your photo here",
  },
  contact: {
    title: "Get in touch",
    intro: "Tell me about your business and what you need. I reply within one working day.",
    whatsapp: "WhatsApp me",
    email: "Email me",
    or: "Or send a message here:",
    details: ["I reply within one working day", "English or Italian, whichever you prefer", "Based in Rome, working with businesses anywhere"],
    form: {
      name: "Your name",
      business: "Business name",
      email: "Email",
      need: "What do you need?",
      needPlaceholder: "For example: a site for my restaurant with the menu and online bookings",
      consent: "I've read the",
      privacy: "privacy policy",
      consentAfter: " and understand my details will be used to reply to my enquiry.",
      submit: "Send enquiry",
      sending: "Sending…",
      successTitle: "Enquiry sent",
      successBody: "Thanks. I'll reply within one working day.",
      error: "Your enquiry couldn't be sent. Check your connection and try again, or email me directly.",
      required: "Fill in this field",
      invalidEmail: "Enter an email address like name@example.com",
      submitWhatsApp: "Send on WhatsApp",
      waNote: "Opens WhatsApp with your message ready. Just press send.",
      waTitle: "Nearly there",
      waBody: "WhatsApp has opened with your message filled in. Press send there and I'll reply within one working day.",
      waOpen: "WhatsApp didn't open? Tap here",
      waInstead: "Send it on WhatsApp instead.",
      waMessage: "Hi! I'd like a website.\n\nName: {name}\nBusiness: {business}\nEmail: {email}\n\n{message}",
      waMessageNoBusiness: "Hi! I'd like a website.\n\nName: {name}\nEmail: {email}\n\n{message}",
    },
  },
  footer: {
    vat: "VAT no.",
    based: "Based in Rome, working in English and Italian.",
    legalNav: "Legal",
    privacy: "Privacy policy",
    cookies: "Cookie policy",
    terms: "Terms of service",
    legal: "Legal notice",
    cookieSettings: "Cookie settings",
  },
  examplesPage: {
    back: "Back to CPD Web Design",
  },
  cookieBanner: {
    title: "Cookies",
    body: "This site only uses the storage it needs to work, like remembering your language. The example sites can also show Google Maps, which sets its own cookies, but only if you allow it.",
    accept: "Accept all",
    reject: "Reject",
    customise: "Choose",
    save: "Save choices",
    close: "Close and reject optional cookies",
    policy: "Cookie policy",
    necessary: "Necessary",
    necessaryBody: "Remembers your language and this choice. Always on.",
    external: "External content",
    externalBody: "Google Maps on the example sites.",
    alwaysOn: "Always on",
  },
  legalPage: {
    updated: "Last updated",
    contents: "Contents",
    more: "Other legal pages",
    settings: "Change cookie settings",
    plans: "{name}: {price} a month",
  },
  notFound: {
    title: "This page doesn't exist",
    body: "The link may be old or mistyped.",
    home: "Go to the home page",
  },
};

export type Dict = typeof en;

const it: Dict = {
  meta: {
    title: "Web Designer a Roma: Sito Web Gratis, da {min} al Mese",
    description:
      "Web designer a Roma per piccole attività. Realizzo gratis il tuo sito, poi da {min} a {max} al mese coprono hosting, aggiornamenti, modifiche e assistenza.",
    examplesTitle: "Esempi di Siti Web per Ristoranti, Hotel e Negozi a Roma",
    examplesDescription:
      "Siti di esempio funzionanti per ristorante, hotel, tour operator, parrucchiere, studio di yoga e fotografa a Roma. Prova le prenotazioni e guarda cosa avresti, gratis.",
    ogLocale: "it_IT",
  },
  nav: {
    how: "Come funziona",
    pricing: "Prezzi",
    work: "Lavori",
    examples: "Esempi",
    faq: "Domande",
    about: "Chi sono",
    cta: "Il tuo sito gratis",
    menu: "Menu",
    close: "Chiudi",
    skip: "Vai al contenuto",
    language: "Lingua",
  },
  hero: {
    eyebrow: "Web designer a Roma",
    titleA: "Il tuo sito,",
    titleB: "fatto gratis.",
    sub: "Paghi solo per tenerlo attivo, da {price} al mese.",
    cta: "Il tuo sito gratis",
    secondary: "Guarda i siti di esempio",
    showcase: "Siti di esempio, con il piano di ciascuno",
  },
  how: {
    title: "Come funziona",
    steps: [
      { title: "Ci sentiamo", body: "Venti minuti al telefono o davanti a un caffè. Mi racconti cosa fa la tua attività e cosa deve fare il sito. Gratis e senza impegno." },
      { title: "Lo progetto e lo realizzo", body: "Di solito entro due settimane. Scrivo o sistemo i testi, preparo le foto e lo costruisco perché funzioni bene sul telefono. Lo vedi per primo e mi dici cosa cambiare." },
      { title: "Va online", body: "Collego il dominio, configuro la scheda Google Business e le statistiche, e lo pubblico." },
      { title: "Me ne occupo io", body: "Ogni mese gestisco hosting, aggiornamenti e backup, e faccio le modifiche che mi mandi. Prezzo nuovo o foto nuova? Mandamela su WhatsApp." },
    ],
  },
  included: {
    title: "Cosa copre il canone mensile",
    intro: "Tutto ciò che serve a un sito dopo il lancio. Molte agenzie lo fanno pagare a parte.",
    items: [
      { key: "hosting", title: "Hosting", body: "Hosting veloce e affidabile. Non devi mai avere a che fare con un fornitore di hosting." },
      { key: "ssl", title: "SSL e sicurezza", body: "Il lucchetto nella barra degli indirizzi e gli aggiornamenti di sicurezza appena escono." },
      { key: "maintenance", title: "Aggiornamenti", body: "Software e integrazioni sempre aggiornati, così niente smette di funzionare di nascosto." },
      { key: "backups", title: "Backup giornalieri", body: "Se qualcosa si rompe, ripristino la versione del giorno prima." },
      { key: "edits", title: "Modifiche", body: "Nuovo menu, nuovi prezzi, nuove foto. Me li mandi e aggiorno il sito." },
      { key: "support", title: "Assistenza", body: "Io, su WhatsApp o via email, in italiano o in inglese." },
      { key: "speed", title: "Velocità", body: "Immagini compresse e codice leggero, così le pagine si aprono in fretta anche con poco segnale." },
      { key: "mobile", title: "Prima il telefono", body: "Quasi tutti ti troveranno dal telefono, quindi progetto prima per quello." },
    ],
  },
  pricing: {
    title: "Prezzi",
    intro: "Due piani. Design e sviluppo sono gratis in entrambi; il canone mensile copre tutto il resto.",
    perMonth: "/mese",
    vat: "+ IVA",
    free: "€0 per design e sviluppo.",
    choose: "Scegli {name}",
    termTitle: "La durata minima è di {months} mesi.",
    termBody:
      "È così che design e sviluppo vengono pagati senza un costo iniziale. Dopo {months} mesi si va mese per mese, e puoi disdire con 30 giorni di preavviso.",
    compareTitle: "Rispetto a un'agenzia tipica",
    compareIntro: "Quanto costa di solito il sito di una piccola attività nel primo anno.",
    agency: "Agenzia tipica",
    you: "CPD Web Design",
    rows: {
      build: "Design e sviluppo",
      hosting: "Hosting e SSL",
      maintenance: "Manutenzione",
      edits: "Modifiche",
      support: "Assistenza",
      dueToday: "Da pagare oggi",
      yearOne: "Primo anno",
    },
    perMonthShort: "/mese",
    billed: "a ore",
    included: "incluso",
    basedOn: "Confronto con il piano Business. Le cifre dell'agenzia sono tipiche per le piccole attività italiane.",
  },
  catch: {
    title: "Dov'è la fregatura?",
    points: [
      {
        title: "C'è una durata minima",
        body: "{months} mesi. È così che vengo pagato per design e sviluppo senza chiederti nulla all'inizio. Dopo si va mese per mese.",
      },
      {
        title: "Il sito lo ospito io",
        body: "Gira sul mio hosting, così posso tenerlo veloce, sicuro e aggiornato. Non devi mai toccare un server, un plugin o una password.",
      },
      {
        title: "Puoi andartene",
        body: "Il dominio e i contenuti sono sempre tuoi. Dopo la durata minima puoi portarti via tutto il sito con un pagamento unico di {fee}, oppure semplicemente disdire.",
      },
    ],
  },
  industries: {
    title: "Cosa include ogni esempio",
    intro: "Tutte le funzioni qui sotto sono attive nel sito di esempio. Per ogni esempio è indicato il piano su cui è costruito.",
    demo: "Apri l'esempio {name}",
    note: "Ti serve qualcosa che non è in elenco? Chiedimelo e ti dico se è incluso o quanto costerebbe.",
  },
  work: {
    title: "Siti di esempio",
    intro: "Siti completi per attività immaginarie a Roma, realizzati come realizzerei il tuo. Aprine uno e provalo: prenotazioni, menu e cambio lingua funzionano davvero.",
    visit: "Visita il sito",
    view: "Apri l'esempio",
    all: "Tutti i siti di esempio",
    soon: "Case study in arrivo",
  },
  examples: {
    title: "Siti di esempio",
    intro:
      "Siti completi e funzionanti per attività immaginarie a Roma, realizzati come realizzerei il tuo. Prova il cambio lingua e i moduli di prenotazione, e attiva Funzioni per vedere a cosa serve ogni parte.",
    open: "Apri l'esempio",
    more: "Non vedi il tuo tipo di attività? Realizzo siti per quasi ogni attività locale: negozi, B&B, dentisti, architetti, officine.",
    ask: "Contattami",
  },
  faq: {
    title: "Domande",
    items: [
      {
        q: "Dov'è la fregatura?",
        a: "C'è una durata minima di {months} mesi: è così che design e sviluppo vengono pagati nel tempo invece che all'inizio. Io ospito e mantengo il sito perché resti veloce e sicuro. Dopo la durata minima si va mese per mese e puoi andartene quando vuoi.",
      },
      {
        q: "Di chi è il sito?",
        a: "Il dominio, i contenuti (testi, foto, logo) e i dati sono sempre tuoi. Il design e il codice ti sono concessi in licenza finché hai un piano attivo. Dopo la durata minima puoi acquistarli con un pagamento unico di {fee} e ospitarli dove vuoi.",
      },
      {
        q: "E se voglio disdire?",
        a: "Dopo la durata minima basta un preavviso di 30 giorni, senza penali. Se disdici durante la durata minima, i mesi restanti sono comunque dovuti, come in qualsiasi contratto a termine.",
      },
      {
        q: "Posso riavere il mio dominio?",
        a: "È sempre tuo. Registro i domini a tuo nome, oppure uso quello che hai già, e lo trasferisco a te o a un nuovo fornitore quando vuoi, gratuitamente.",
      },
      {
        q: "Quanto tempo ci vuole?",
        a: "La maggior parte dei siti va online una o due settimane dopo la prima chiacchierata. Di solito rallenta solo la raccolta di foto e testi, e ti aiuto con entrambi.",
      },
      {
        q: "Fai siti in italiano?",
        a: "Sì. Lavoro in italiano e in inglese, e ogni sito può averle entrambe, con un cambio lingua come quello di questo sito. È incluso nel piano Business.",
      },
      {
        q: "Cosa si intende per piccola modifica?",
        a: "Tutto ciò che richiede fino a circa 30 minuti: cambiare testi, prezzi o orari, sostituire foto, aggiungere un piatto o un evento. Il piano Una pagina ne include una al mese, il piano Business tre. Nuove pagine e nuove funzioni si preventivano a parte.",
      },
      {
        q: "Di quale piano ho bisogno?",
        a: "Se ti serve una sola pagina che dica chi sei e come contattarti, come un portfolio, un CV, un evento o un piccolo progetto, basta Una pagina. Se sei un'attività e ti servono menu, prenotazioni, più pagine o due lingue, scegli Business. Puoi passare al piano superiore quando vuoi.",
      },
      {
        q: "C'è qualcosa che non è incluso?",
        a: "I lavori più grandi: più di cinque pagine, un negozio online, nuove funzioni o un restyling completo. Te li preventivo prima di iniziare, così non ci sono fatture a sorpresa.",
      },
    ],
  },
  about: {
    title: "Chi sono",
    paragraphs: [
      "Sono {name}, designer e sviluppatore a Roma. Da anni realizzo siti per piccole attività, e vedevo sempre la stessa cosa: migliaia di euro pagati all'inizio per un sito che nessuno curava più dopo il lancio.",
      "Così ho cambiato il modo in cui mi faccio pagare. Realizzo il sito come si deve, gratis, e vengo pagato ogni mese per farlo funzionare. Se il tuo sito non fa il suo lavoro, lo vengo a sapere.",
      "Lavoro con ristoranti, hotel, studi e negozi a Roma e altrove, in italiano e in inglese.",
    ],
    photoAlt: "Foto di {name}",
    photoPlaceholder: "La tua foto qui",
  },
  contact: {
    title: "Contattami",
    intro: "Raccontami della tua attività e di cosa hai bisogno. Rispondo entro un giorno lavorativo.",
    whatsapp: "Scrivimi su WhatsApp",
    email: "Mandami una email",
    or: "Oppure scrivimi qui:",
    details: ["Rispondo entro un giorno lavorativo", "In italiano o in inglese, come preferisci", "Lavoro da Roma, con attività ovunque"],
    form: {
      name: "Il tuo nome",
      business: "Nome dell'attività",
      email: "Email",
      need: "Di cosa hai bisogno?",
      needPlaceholder: "Per esempio: un sito per il mio ristorante con il menu e le prenotazioni online",
      consent: "Ho letto",
      privacy: "l'informativa sulla privacy",
      consentAfter: " e so che i miei dati saranno usati per rispondere alla mia richiesta.",
      submit: "Invia richiesta",
      sending: "Invio in corso…",
      successTitle: "Richiesta inviata",
      successBody: "Grazie. Ti rispondo entro un giorno lavorativo.",
      error: "Non è stato possibile inviare la richiesta. Controlla la connessione e riprova, oppure scrivimi via email.",
      required: "Compila questo campo",
      invalidEmail: "Inserisci un indirizzo email come nome@esempio.it",
      submitWhatsApp: "Invia su WhatsApp",
      waNote: "Si apre WhatsApp con il messaggio già scritto. Ti basta premere invia.",
      waTitle: "Quasi fatto",
      waBody: "WhatsApp si è aperto con il tuo messaggio. Premi invia e ti rispondo entro un giorno lavorativo.",
      waOpen: "WhatsApp non si è aperto? Tocca qui",
      waInstead: "Invialo invece su WhatsApp.",
      waMessage: "Ciao! Vorrei un sito web.\n\nNome: {name}\nAttività: {business}\nEmail: {email}\n\n{message}",
      waMessageNoBusiness: "Ciao! Vorrei un sito web.\n\nNome: {name}\nEmail: {email}\n\n{message}",
    },
  },
  footer: {
    vat: "P.IVA",
    based: "Lavoro da Roma, in italiano e in inglese.",
    legalNav: "Informazioni legali",
    privacy: "Privacy policy",
    cookies: "Cookie policy",
    terms: "Termini e condizioni",
    legal: "Note legali",
    cookieSettings: "Impostazioni cookie",
  },
  examplesPage: {
    back: "Torna a CPD Web Design",
  },
  cookieBanner: {
    title: "Cookie",
    body: "Questo sito usa solo ciò che serve per funzionare, come ricordare la lingua scelta. I siti di esempio possono mostrare Google Maps, che imposta i propri cookie, ma solo se lo permetti.",
    accept: "Accetta tutti",
    reject: "Rifiuta",
    customise: "Scegli",
    save: "Salva le scelte",
    close: "Chiudi e rifiuta i cookie facoltativi",
    policy: "Cookie policy",
    necessary: "Necessari",
    necessaryBody: "Ricordano la lingua e questa scelta. Sempre attivi.",
    external: "Contenuti esterni",
    externalBody: "Google Maps nei siti di esempio.",
    alwaysOn: "Sempre attivi",
  },
  legalPage: {
    updated: "Ultimo aggiornamento",
    contents: "Indice",
    more: "Altre pagine legali",
    settings: "Modifica le impostazioni dei cookie",
    plans: "{name}: {price} al mese",
  },
  notFound: {
    title: "Questa pagina non esiste",
    body: "Il link potrebbe essere vecchio o scritto male.",
    home: "Vai alla home page",
  },
};

export const translations = { en, it };
