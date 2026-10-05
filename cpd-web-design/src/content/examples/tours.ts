/**
 * DEMO: Sette Colli Tours (fictional small-group tour company in Rome). Business plan.
 */
import { unsplash, type ExampleMeta, type Img } from "./types";

export type TourCategory = "history" | "food" | "evening" | "family";

export type Tour = {
  id: string;
  category: TourCategory;
  name: { en: string; it: string };
  blurb: { en: string; it: string };
  hours: number;
  /** Adult price in euro. */
  price: number;
  /** Child price (ages 4–12) in euro. */
  childPrice: number;
  maxGroup: number;
  times: string[];
  languages: string;
  meetingPoint: string;
  image: Img;
};

export const toursMeta: ExampleMeta = {
  slug: "tours",
  name: "Sette Colli Tours",
  industry: { en: "Tours & tourism", it: "Tour e turismo" },
  tagline: { en: "Small-group walking and food tours in Rome", it: "Tour a piedi e gastronomici per piccoli gruppi a Roma" },
  location: "Roma",
  plan: "business",
  domain: "settecollitours.it",
  screenshot: "/images/work/tours.jpg",
  cover: unsplash("1552832230-c0197dd311b5"),
  palette: { bg: "#F4EDE2", fg: "#2B211C", accent: "#B4472A" },
  features: [
    { id: "hero", label: { en: "Hero with trust points", it: "Hero con punti di fiducia" }, description: { en: "Small groups, licensed guides, free cancellation: said up front.", it: "Gruppi piccoli, guide abilitate, cancellazione gratuita: detto subito." } },
    { id: "tours", label: { en: "Tour list with filters", it: "Elenco tour con filtri" }, description: { en: "History, food, evening or family, with prices and times.", it: "Storia, cibo, sera o famiglie, con prezzi e orari." } },
    { id: "booking", label: { en: "Live booking widget", it: "Prenotazione in tempo reale" }, description: { en: "Date, time, guests and the total price, without leaving the page.", it: "Data, orario, partecipanti e prezzo totale, senza lasciare la pagina." } },
    { id: "included", label: { en: "What's included", it: "Cosa è incluso" }, description: { en: "Answers the questions that stop people booking.", it: "Risponde ai dubbi che frenano le prenotazioni." } },
    { id: "guides", label: { en: "Meet the guides", it: "Le guide" }, description: { en: "People book people. Faces and languages build trust.", it: "Si prenota una persona. Volti e lingue creano fiducia." } },
    { id: "gallery", label: { en: "Gallery + lightbox", it: "Galleria + lightbox" }, description: { en: "A taste of the day before it starts.", it: "Un assaggio della giornata prima che inizi." } },
    { id: "faq", label: { en: "FAQ", it: "FAQ" }, description: { en: "Cancellation, weather, accessibility, tickets.", it: "Cancellazione, meteo, accessibilità, biglietti." } },
    { id: "map", label: { en: "Meeting point map", it: "Mappa del punto d'incontro" }, description: { en: "Nobody gets lost on the morning of the tour.", it: "Nessuno si perde la mattina del tour." } },
    { id: "whatsapp", label: { en: "WhatsApp button", it: "Pulsante WhatsApp" }, description: { en: "Travellers message, they don't call.", it: "I viaggiatori scrivono, non telefonano." } },
    { id: "lang", label: { en: "English / Italian", it: "Inglese / Italiano" }, description: { en: "English first, for visitors from abroad.", it: "Prima in inglese, per chi arriva dall'estero." } },
  ],
};

export const tours = {
  name: "Sette Colli Tours",
  phone: "+39 06 0000 0005",
  whatsapp: "390000000006",
  email: "ciao@settecolli.example",
  address: "Piazza del Colosseo (demo), 00184 Roma",
  mapsQuery: "Piazza del Colosseo, Roma",
  nav: {
    tours: { en: "Tours", it: "Tour" },
    book: { en: "Book", it: "Prenota" },
    guides: { en: "Guides", it: "Guide" },
    faq: { en: "FAQ", it: "FAQ" },
    cta: { en: "Book a tour", it: "Prenota un tour" },
  },
  hero: {
    kicker: { en: "Rome, on foot, with a local", it: "Roma a piedi, con chi ci vive" },
    title: { en: "See Rome the way Romans tell it.", it: "Roma raccontata dai romani." },
    body: {
      en: "Walking and food tours for no more than 12 people, led by licensed guides who grew up here.",
      it: "Tour a piedi e gastronomici per massimo 12 persone, con guide abilitate cresciute qui.",
    },
    cta: { en: "Find a tour", it: "Trova un tour" },
    points: [
      { en: "Max 12 people", it: "Massimo 12 persone" },
      { en: "Licensed guides", it: "Guide abilitate" },
      { en: "Free cancellation up to 24 h", it: "Cancellazione gratuita fino a 24 h" },
    ],
    image: { src: unsplash("1552832230-c0197dd311b5"), alt: { en: "The Colosseum at dusk", it: "Il Colosseo al tramonto" } } as Img,
  },
  list: {
    title: { en: "Our tours", it: "I nostri tour" },
    all: { en: "All tours", it: "Tutti" },
    categories: {
      history: { en: "History", it: "Storia" },
      food: { en: "Food", it: "Cibo" },
      evening: { en: "Evening", it: "Sera" },
      family: { en: "Families", it: "Famiglie" },
    } as Record<TourCategory, { en: string; it: string }>,
    hours: { en: "{n} h", it: "{n} ore" },
    group: { en: "Max {n}", it: "Max {n}" },
    from: { en: "from", it: "da" },
    perPerson: { en: "per person", it: "a persona" },
    choose: { en: "Check dates", it: "Vedi le date" },
  },
  items: [
    {
      id: "colosseum",
      category: "history",
      name: { en: "Colosseum, Forum & Palatine", it: "Colosseo, Foro e Palatino" },
      blurb: { en: "Skip-the-line entry, the arena floor and the hill where Rome began.", it: "Ingresso senza code, l'arena e il colle dove nacque Roma." },
      hours: 3,
      price: 69,
      childPrice: 45,
      maxGroup: 12,
      times: ["09:00", "13:30"],
      languages: "EN · IT · ES",
      meetingPoint: "Piazza del Colosseo, Roma",
      image: { src: unsplash("1515542622106-78bda8ba0e5b"), alt: { en: "The Colosseum against a blue sky", it: "Il Colosseo contro il cielo azzurro" } },
    },
    {
      id: "vatican",
      category: "history",
      name: { en: "Vatican early entry", it: "Vaticano all'alba" },
      blurb: { en: "In before the crowds: the Museums, the Sistine Chapel and St Peter's.", it: "Dentro prima della folla: Musei, Cappella Sistina e San Pietro." },
      hours: 3.5,
      price: 89,
      childPrice: 59,
      maxGroup: 12,
      times: ["07:30"],
      languages: "EN · IT",
      meetingPoint: "Musei Vaticani, Viale Vaticano, Roma",
      image: { src: unsplash("1531572753322-ad063cecc140"), alt: { en: "St Peter's Square from above", it: "Piazza San Pietro dall'alto" } },
    },
    {
      id: "trastevere",
      category: "food",
      name: { en: "Trastevere food walk", it: "Trastevere da gustare" },
      blurb: { en: "Supplì, pizza al taglio, cacio e pepe and gelato in eight stops.", it: "Supplì, pizza al taglio, cacio e pepe e gelato in otto tappe." },
      hours: 3.5,
      price: 79,
      childPrice: 49,
      maxGroup: 10,
      times: ["11:00", "17:30"],
      languages: "EN · IT",
      meetingPoint: "Piazza Trilussa, Roma",
      image: { src: unsplash("1565299624946-b28f40a0ae38"), alt: { en: "Pizza fresh from the oven", it: "Pizza appena sfornata" } },
    },
    {
      id: "dusk",
      category: "evening",
      name: { en: "Fountains & piazzas at dusk", it: "Fontane e piazze al tramonto" },
      blurb: { en: "Trevi, the Pantheon and Piazza Navona as the lights come on.", it: "Trevi, il Pantheon e Piazza Navona mentre si accendono le luci." },
      hours: 2,
      price: 39,
      childPrice: 19,
      maxGroup: 12,
      times: ["19:00"],
      languages: "EN · IT · FR",
      meetingPoint: "Fontana di Trevi, Roma",
      image: { src: unsplash("1525874684015-58379d421a52"), alt: { en: "The Trevi Fountain", it: "La Fontana di Trevi" } },
    },
    {
      id: "kids",
      category: "family",
      name: { en: "Treasure hunt by the Tiber", it: "Caccia al tesoro sul Tevere" },
      blurb: { en: "Castel Sant'Angelo and the river for ages 6–12, with a map, clues and a prize.", it: "Castel Sant'Angelo e il fiume per bambini dai 6 ai 12 anni, con mappa, indizi e premio." },
      hours: 2,
      price: 35,
      childPrice: 25,
      maxGroup: 12,
      times: ["10:00", "15:30"],
      languages: "EN · IT",
      meetingPoint: "Ponte Sant'Angelo, Roma",
      image: { src: unsplash("1529260830199-42c24126f198"), alt: { en: "Ponte Sant'Angelo and St Peter's across the Tiber", it: "Ponte Sant'Angelo e San Pietro sul Tevere" } },
    },
  ] as Tour[],
  booking: {
    title: { en: "Book your tour", it: "Prenota il tuo tour" },
    tour: { en: "Tour", it: "Tour" },
    date: { en: "Date", it: "Data" },
    time: { en: "Start time", it: "Orario" },
    soldOut: { en: "Full", it: "Completo" },
    left: { en: "{n} left", it: "{n} posti" },
    adults: { en: "Adults", it: "Adulti" },
    children: { en: "Children (4–12)", it: "Bambini (4–12)" },
    fewer: { en: "Fewer", it: "Meno" },
    more: { en: "More", it: "Più" },
    total: { en: "Total", it: "Totale" },
    reserve: { en: "Reserve now, pay on the day", it: "Prenota ora, paghi il giorno del tour" },
    cancel: { en: "Free cancellation up to 24 hours before.", it: "Cancellazione gratuita fino a 24 ore prima." },
    tooMany: { en: "Only {n} places left at this time.", it: "Solo {n} posti rimasti a quest'ora." },
    doneTitle: { en: "You're booked!", it: "Prenotazione fatta!" },
    doneBody: { en: "Booking {ref}. Your guide will message you the day before with the exact meeting point.", it: "Prenotazione {ref}. La guida ti scriverà il giorno prima con il punto d'incontro esatto." },
    again: { en: "Book another tour", it: "Prenota un altro tour" },
    meet: { en: "Meeting point", it: "Punto d'incontro" },
    demoNote: { en: "Demo only: no booking is made.", it: "Solo demo: non viene fatta nessuna prenotazione." },
  },
  included: {
    title: { en: "Every tour includes", it: "Ogni tour include" },
    items: [
      { title: { en: "A licensed guide", it: "Una guida abilitata" }, body: { en: "Every guide holds a Lazio tourist guide licence.", it: "Ogni guida ha l'abilitazione regionale del Lazio." } },
      { title: { en: "Tickets and skip-the-line entry", it: "Biglietti e ingresso senza code" }, body: { en: "Already in the price. No queues, no surprises.", it: "Già nel prezzo. Niente code, niente sorprese." } },
      { title: { en: "Headsets for every guest", it: "Auricolari per tutti" }, body: { en: "Hear every word, even in a busy piazza.", it: "Senti ogni parola, anche in una piazza affollata." } },
      { title: { en: "Our list of where to eat", it: "La nostra lista di dove mangiare" }, body: { en: "Sent after the tour: the places we actually go to.", it: "Inviata dopo il tour: i posti dove andiamo davvero." } },
    ],
  },
  guides: {
    title: { en: "Your guides", it: "Le guide" },
    people: [
      { name: "Chiara", role: { en: "Archaeologist · EN, IT, ES", it: "Archeologa · EN, IT, ES" }, image: { src: unsplash("1494790108377-be9c29b29330"), alt: { en: "Portrait of Chiara", it: "Ritratto di Chiara" } } },
      { name: "Davide", role: { en: "Food tours · EN, IT", it: "Tour gastronomici · EN, IT" }, image: { src: unsplash("1507003211169-0a1dd7228f2d"), alt: { en: "Portrait of Davide", it: "Ritratto di Davide" } } },
      { name: "Elena", role: { en: "Art historian · EN, IT, FR", it: "Storica dell'arte · EN, IT, FR" }, image: { src: unsplash("1544005313-94ddf0286df2"), alt: { en: "Portrait of Elena", it: "Ritratto di Elena" } } },
    ],
  },
  gallery: {
    title: { en: "On the road", it: "Per strada" },
    images: [
      { src: unsplash("1529260830199-42c24126f198"), alt: { en: "St Peter's dome over the Tiber", it: "La cupola di San Pietro sul Tevere" } },
      { src: unsplash("1510812431401-41d2bd2722f3"), alt: { en: "A toast with red wine", it: "Un brindisi con vino rosso" } },
      { src: unsplash("1525874684015-58379d421a52"), alt: { en: "The Trevi Fountain", it: "La Fontana di Trevi" } },
      { src: unsplash("1473093295043-cdd812d0e601"), alt: { en: "A plate of pasta", it: "Un piatto di pasta" } },
      { src: unsplash("1515542622106-78bda8ba0e5b"), alt: { en: "The Colosseum", it: "Il Colosseo" } },
    ] as Img[],
  },
  faq: {
    title: { en: "Good to know", it: "Da sapere" },
    items: [
      { q: { en: "Can I cancel?", it: "Posso cancellare?" }, a: { en: "Yes, free of charge up to 24 hours before the start. After that the tour can't be refunded, because tickets are already bought.", it: "Sì, gratis fino a 24 ore prima. Dopo non è rimborsabile, perché i biglietti sono già acquistati." } },
      { q: { en: "What if it rains?", it: "E se piove?" }, a: { en: "Tours go ahead in light rain. In a storm we'll move you to another day or refund you in full.", it: "Con pioggia leggera il tour si fa. In caso di temporale ti spostiamo a un altro giorno o ti rimborsiamo tutto." } },
      { q: { en: "Is it accessible?", it: "È accessibile?" }, a: { en: "The evening and Vatican tours are step-free. Tell us when you book and we'll plan the route with you.", it: "I tour serali e il Vaticano sono senza barriere. Dillo alla prenotazione e pianifichiamo il percorso insieme." } },
      { q: { en: "Do you do private tours?", it: "Fate tour privati?" }, a: { en: "Yes, any tour can be private. Message us on WhatsApp with your dates.", it: "Sì, ogni tour può essere privato. Scrivici su WhatsApp con le tue date." } },
      { q: { en: "What should I wear?", it: "Come mi vesto?" }, a: { en: "Comfortable shoes. For the Vatican, shoulders and knees must be covered.", it: "Scarpe comode. Per il Vaticano spalle e ginocchia devono essere coperte." } },
    ],
  },
  contact: {
    title: { en: "Where we meet", it: "Dove ci incontriamo" },
    body: { en: "Each tour has its own meeting point, sent with your booking. Most start by the Colosseum metro exit.", it: "Ogni tour ha il suo punto d'incontro, indicato nella prenotazione. Quasi tutti partono dall'uscita della metro Colosseo." },
    directions: { en: "Get directions", it: "Indicazioni stradali" },
    whatsapp: { en: "Message us on WhatsApp", it: "Scrivici su WhatsApp" },
  },
  footer: {
    fictional: { en: "Sette Colli Tours is a fictional business, created as an example site by CPD Web Design.", it: "Sette Colli Tours è un'attività immaginaria, creata come sito di esempio da CPD Web Design." },
  },
};
