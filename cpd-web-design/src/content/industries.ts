/**
 * ───────────────────────────────────────────────────────────────
 *  INDUSTRY PAGES (/websites/<slug> and /it/websites/<slug>)
 *  One landing page per kind of business, written for the searches
 *  people make ("restaurant website Rome", "sito web ristorante Roma").
 *  Each links to its example site. To add one, copy an entry; it then
 *  appears in the footer, the sitemap and on /examples automatically.
 *  {price} is replaced with the monthly price of the entry's plan.
 * ───────────────────────────────────────────────────────────────
 */
import type { PlanId } from "@/config/site";
import type { L } from "@/lib/i18n";

export type Industry = {
  slug: string;
  /** Matching example site in src/content/examples (its slug). */
  example: string;
  plan: PlanId;
  /** Short name for links: "Restaurants". */
  name: L;
  metaTitle: L;
  metaDescription: L;
  h1: L;
  intro: L;
  needs: { title: L; body: L }[];
  faqs: { q: L; a: L }[];
};

export const industries: Industry[] = [
  {
    slug: "restaurants",
    example: "restaurant",
    plan: "business",
    name: { en: "Restaurants", it: "Ristoranti" },
    metaTitle: { en: "Restaurant Websites in Rome, Built Free", it: "Siti Web per Ristoranti a Roma, Gratis" },
    metaDescription: {
      en: "A website for your restaurant in Rome: menu, table bookings, opening hours and Google Maps. Built free, then {price} a month for hosting, updates and changes.",
      it: "Un sito per il tuo ristorante a Roma: menu, prenotazioni, orari e Google Maps. Realizzato gratis, poi {price} al mese per hosting, aggiornamenti e modifiche.",
    },
    h1: { en: "Restaurant websites in Rome", it: "Siti web per ristoranti a Roma" },
    intro: {
      en: "Most people decide where to eat on their phone, in a few seconds. Your site needs to show the menu, the prices, whether you're open and how to book, without a PDF in sight. I build it for free and keep it up to date for a monthly fee.",
      it: "Quasi tutti scelgono dove mangiare dal telefono, in pochi secondi. Il tuo sito deve mostrare menu, prezzi, se sei aperto e come prenotare, senza PDF. Lo realizzo gratis e lo tengo aggiornato con un canone mensile.",
    },
    needs: [
      { title: { en: "A menu people can read on a phone", it: "Un menu leggibile dal telefono" }, body: { en: "Real text, not a PDF: faster, searchable on Google, and easy to change when a dish does.", it: "Testo vero, non un PDF: più veloce, trovabile su Google e facile da cambiare quando cambia un piatto." } },
      { title: { en: "Table bookings", it: "Prenotazione del tavolo" }, body: { en: "A simple request form, or a link to the booking system you already use.", it: "Un modulo di richiesta semplice, o il collegamento al sistema di prenotazione che usi già." } },
      { title: { en: "Opening hours that are always right", it: "Orari sempre giusti" }, body: { en: "Shows whether you're open right now, and I update holidays and closures for you.", it: "Mostra se sei aperto in questo momento, e aggiorno io ferie e chiusure." } },
      { title: { en: "Map, WhatsApp and delivery links", it: "Mappa, WhatsApp e link alla consegna" }, body: { en: "One tap to get directions, send a message or order on Glovo or Deliveroo.", it: "Un tocco per le indicazioni, un messaggio o un ordine su Glovo o Deliveroo." } },
      { title: { en: "English and Italian", it: "Italiano e inglese" }, body: { en: "For locals and for visitors, with a language switch.", it: "Per chi abita qui e per i turisti, con il cambio lingua." } },
    ],
    faqs: [
      { q: { en: "Can I change the menu myself?", it: "Posso cambiare il menu da solo?" }, a: { en: "You don't need to: send me the changes on WhatsApp or by email and I update it. Small changes are included in the plan.", it: "Non serve: mandami le modifiche su WhatsApp o via email e lo aggiorno io. Le piccole modifiche sono incluse nel piano." } },
      { q: { en: "Will it work with TheFork or my booking system?", it: "Funziona con TheFork o il mio sistema di prenotazione?" }, a: { en: "Yes. I can link or embed the system you use, or set up a simple booking request form that comes to your email.", it: "Sì. Posso collegare o inserire il sistema che usi, o creare un semplice modulo di richiesta che arriva nella tua email." } },
      { q: { en: "Will people find it on Google?", it: "Le persone lo troveranno su Google?" }, a: { en: "The site is built for local search, and I help you set up your Google Business Profile, which is what shows on Google Maps.", it: "Il sito è pensato per la ricerca locale, e ti aiuto a configurare il profilo Google Business, quello che appare su Google Maps." } },
    ],
  },
  {
    slug: "hotels",
    example: "hotel",
    plan: "business",
    name: { en: "Hotels & B&Bs", it: "Hotel e B&B" },
    metaTitle: { en: "Hotel & B&B Websites in Rome, Built Free", it: "Siti Web per Hotel e B&B a Roma, Gratis" },
    metaDescription: {
      en: "A website for your hotel or B&B in Rome: rooms, photos, availability requests and direct bookings. Built free, then {price} a month, all included.",
      it: "Un sito per il tuo hotel o B&B a Roma: camere, foto, richieste di disponibilità e prenotazioni dirette. Realizzato gratis, poi {price} al mese, tutto incluso.",
    },
    h1: { en: "Websites for hotels and B&Bs in Rome", it: "Siti web per hotel e B&B a Roma" },
    intro: {
      en: "Guests often find you on Booking.com, then look for your own site before they book. A good site gives them the confidence to book with you directly, which saves you the commission.",
      it: "Gli ospiti spesso ti trovano su Booking.com, poi cercano il tuo sito prima di prenotare. Un buon sito dà la fiducia per prenotare direttamente con te, e ti fa risparmiare la commissione.",
    },
    needs: [
      { title: { en: "Rooms with real photos", it: "Camere con foto vere" }, body: { en: "Each room with its photos, size, beds and price from.", it: "Ogni camera con foto, metratura, letti e prezzo di partenza." } },
      { title: { en: "Availability and booking requests", it: "Disponibilità e richieste di prenotazione" }, body: { en: "Dates and guests in, request out. Or a link to your booking engine.", it: "Date e ospiti, e parte la richiesta. Oppure il collegamento al tuo booking engine." } },
      { title: { en: "The neighbourhood", it: "Il quartiere" }, body: { en: "What's nearby and how to get there from the airport and Termini.", it: "Cosa c'è vicino e come arrivare dall'aeroporto e da Termini." } },
      { title: { en: "English first, Italian too", it: "Prima in inglese, anche in italiano" }, body: { en: "Most of your guests read English; both versions are included in the Business plan.", it: "La maggior parte degli ospiti legge l'inglese; entrambe le versioni sono incluse nel piano Business." } },
    ],
    faqs: [
      { q: { en: "Can it connect to my booking engine?", it: "Si collega al mio booking engine?" }, a: { en: "Yes, I can link or embed most booking engines. If you don't have one, the site sends booking requests to your email.", it: "Sì, posso collegare o inserire la maggior parte dei booking engine. Se non ne hai uno, il sito invia le richieste alla tua email." } },
      { q: { en: "Do I need a website if I'm on Booking.com?", it: "Mi serve un sito se sono su Booking.com?" }, a: { en: "It's where guests check you're real and where direct bookings come from, without commission.", it: "È dove gli ospiti verificano che sei reale e da dove arrivano le prenotazioni dirette, senza commissione." } },
      { q: { en: "Who takes the photos?", it: "Chi fa le foto?" }, a: { en: "Your own good photos work well. If you need new ones, I can recommend a photographer.", it: "Le tue foto, se buone, vanno benissimo. Se ne servono di nuove, posso consigliarti un fotografo." } },
    ],
  },
  {
    slug: "tours",
    example: "tours",
    plan: "business",
    name: { en: "Tours & activities", it: "Tour e attività" },
    metaTitle: { en: "Websites for Tour Companies in Rome, Built Free", it: "Siti Web per Tour e Guide a Roma, Gratis" },
    metaDescription: {
      en: "A website for your tours in Rome: tour list, dates, prices, guides and booking requests. Built free, then {price} a month for hosting and changes.",
      it: "Un sito per i tuoi tour a Roma: elenco tour, date, prezzi, guide e richieste di prenotazione. Realizzato gratis, poi {price} al mese per hosting e modifiche.",
    },
    h1: { en: "Websites for tour companies and guides in Rome", it: "Siti web per tour e guide a Roma" },
    intro: {
      en: "Travellers compare tours on their phones, often the night before. Your site should make it obvious what each tour includes, how long it is, what it costs and how to book, in a couple of taps.",
      it: "I viaggiatori confrontano i tour dal telefono, spesso la sera prima. Il tuo sito deve chiarire subito cosa include ogni tour, quanto dura, quanto costa e come prenotare, in pochi tocchi.",
    },
    needs: [
      { title: { en: "A clear list of tours", it: "Un elenco chiaro dei tour" }, body: { en: "Duration, group size, languages and price, with filters by type.", it: "Durata, gruppo, lingue e prezzo, con filtri per tipo." } },
      { title: { en: "Dates, times and booking", it: "Date, orari e prenotazione" }, body: { en: "Pick a date and number of guests and see the total, or link to your booking platform.", it: "Scegli data e partecipanti e vedi il totale, oppure il collegamento alla tua piattaforma di prenotazione." } },
      { title: { en: "Meet the guides", it: "Le guide" }, body: { en: "People book people: faces, languages and a line about each guide.", it: "Si prenota una persona: volti, lingue e due righe su ogni guida." } },
      { title: { en: "Meeting points and WhatsApp", it: "Punti d'incontro e WhatsApp" }, body: { en: "A map for each tour and a WhatsApp button for last-minute questions.", it: "Una mappa per ogni tour e un pulsante WhatsApp per le domande dell'ultimo minuto." } },
    ],
    faqs: [
      { q: { en: "Can it work with my booking platform?", it: "Funziona con la mia piattaforma di prenotazione?" }, a: { en: "Yes. I can link or embed platforms like Bókun or FareHarbor, or send booking requests to your email.", it: "Sì. Posso collegare o inserire piattaforme come Bókun o FareHarbor, o inviare le richieste alla tua email." } },
      { q: { en: "Can I add new tours?", it: "Posso aggiungere nuovi tour?" }, a: { en: "Send me the details and I add it. Updating prices and times counts as a small change, included in the plan.", it: "Mandami i dettagli e lo aggiungo. Aggiornare prezzi e orari è una piccola modifica, inclusa nel piano." } },
      { q: { en: "What about reviews?", it: "E le recensioni?" }, a: { en: "I can link your Google or TripAdvisor reviews, so travellers see real ones.", it: "Posso collegare le tue recensioni Google o TripAdvisor, così i viaggiatori vedono quelle vere." } },
    ],
  },
  {
    slug: "salons",
    example: "salon",
    plan: "business",
    name: { en: "Salons & barbers", it: "Parrucchieri e barbieri" },
    metaTitle: { en: "Hair Salon & Barber Websites in Rome, Built Free", it: "Siti Web per Parrucchieri e Barbieri a Roma" },
    metaDescription: {
      en: "A website for your salon or barber shop in Rome: price list, team, online appointments and opening hours. Built free, then {price} a month.",
      it: "Un sito per il tuo salone o barbiere a Roma: listino, team, appuntamenti online e orari. Realizzato gratis, poi {price} al mese.",
    },
    h1: { en: "Websites for hair salons and barbers in Rome", it: "Siti web per parrucchieri e barbieri a Roma" },
    intro: {
      en: "New clients want to see your work, your prices and when they can come in. A clear site answers all three and turns a scroll on Instagram into a booked appointment.",
      it: "I nuovi clienti vogliono vedere il tuo lavoro, i prezzi e quando possono venire. Un sito chiaro risponde a tutte e tre le domande e trasforma uno scroll su Instagram in un appuntamento.",
    },
    needs: [
      { title: { en: "A price list", it: "Un listino prezzi" }, body: { en: "Cuts, colour and treatments with prices from, easy to update.", it: "Tagli, colore e trattamenti con prezzi di partenza, facili da aggiornare." } },
      { title: { en: "Online appointments", it: "Appuntamenti online" }, body: { en: "A request form, or a link to the booking app you already use.", it: "Un modulo di richiesta, o il collegamento all'app di prenotazione che usi già." } },
      { title: { en: "The team and their work", it: "Il team e il suo lavoro" }, body: { en: "Who does what, with photos of real results.", it: "Chi fa cosa, con foto di risultati veri." } },
      { title: { en: "Opening hours and map", it: "Orari e mappa" }, body: { en: "Open now or closed, and how to find you.", it: "Aperto o chiuso, e come trovarti." } },
    ],
    faqs: [
      { q: { en: "Can it use my booking app?", it: "Può usare la mia app di prenotazione?" }, a: { en: "Yes, I can link apps like Treatwell or Fresha, or send appointment requests to your email or WhatsApp.", it: "Sì, posso collegare app come Treatwell o Fresha, o inviare le richieste alla tua email o su WhatsApp." } },
      { q: { en: "Can I show my Instagram?", it: "Posso mostrare il mio Instagram?" }, a: { en: "I link it prominently. Your best photos go on the site itself, where they load fast and show up on Google.", it: "Lo collego bene in vista. Le foto migliori vanno sul sito, dove si caricano veloci e appaiono su Google." } },
      { q: { en: "What if my prices change?", it: "E se cambiano i prezzi?" }, a: { en: "Send me the new list and I update it. That's a small change, included in the plan.", it: "Mandami il nuovo listino e lo aggiorno. È una piccola modifica, inclusa nel piano." } },
    ],
  },
  {
    slug: "studios",
    example: "yoga",
    plan: "business",
    name: { en: "Yoga & fitness studios", it: "Studi di yoga e fitness" },
    metaTitle: { en: "Yoga & Fitness Studio Websites in Rome, Built Free", it: "Siti Web per Studi di Yoga e Fitness a Roma" },
    metaDescription: {
      en: "A website for your yoga, pilates or fitness studio in Rome: timetable, class booking, passes and teachers. Built free, then {price} a month.",
      it: "Un sito per il tuo studio di yoga, pilates o fitness a Roma: orario, prenotazione lezioni, abbonamenti e insegnanti. Realizzato gratis, poi {price} al mese.",
    },
    h1: { en: "Websites for yoga and fitness studios in Rome", it: "Siti web per studi di yoga e fitness a Roma" },
    intro: {
      en: "Before someone tries a class, they want the timetable, the prices and a feel for the place. Your site should give them all three and make the first booking easy.",
      it: "Prima di provare una lezione, le persone vogliono l'orario, i prezzi e un'idea del posto. Il tuo sito deve dare tutte e tre le cose e rendere facile la prima prenotazione.",
    },
    needs: [
      { title: { en: "A weekly timetable", it: "Un orario settimanale" }, body: { en: "Filter by day and style, and kept up to date by me.", it: "Filtri per giorno e stile, e lo tengo aggiornato io." } },
      { title: { en: "Class booking", it: "Prenotazione delle lezioni" }, body: { en: "Book a spot in a couple of taps, or link your booking system.", it: "Prenota un posto in pochi tocchi, o collega il tuo sistema di prenotazione." } },
      { title: { en: "Passes and prices", it: "Abbonamenti e prezzi" }, body: { en: "Clear prices, including your intro offer.", it: "Prezzi chiari, compresa l'offerta di prova." } },
      { title: { en: "Teachers and the space", it: "Insegnanti e spazio" }, body: { en: "Faces and photos that show what a class feels like.", it: "Volti e foto che fanno capire com'è una lezione." } },
    ],
    faqs: [
      { q: { en: "Can it connect to my booking software?", it: "Si collega al mio software di prenotazione?" }, a: { en: "Yes, I can link or embed tools like Mindbody or Momence. Without one, bookings come to your email.", it: "Sì, posso collegare o inserire strumenti come Mindbody o Momence. Senza, le prenotazioni arrivano alla tua email." } },
      { q: { en: "Who updates the timetable?", it: "Chi aggiorna l'orario?" }, a: { en: "I do. Send me the changes and I put them live, usually within a couple of working days.", it: "Io. Mandami le modifiche e le metto online, di solito entro un paio di giorni lavorativi." } },
      { q: { en: "Is it only for yoga?", it: "È solo per lo yoga?" }, a: { en: "No: pilates, dance, martial arts, gyms and personal trainers all work the same way.", it: "No: pilates, danza, arti marziali, palestre e personal trainer funzionano allo stesso modo." } },
    ],
  },
  {
    slug: "portfolios",
    example: "portfolio",
    plan: "onepage",
    name: { en: "Photographers & freelancers", it: "Fotografi e freelance" },
    metaTitle: { en: "Portfolio Websites in Rome, From {price} a Month", it: "Siti Portfolio a Roma, da {price} al Mese" },
    metaDescription: {
      en: "A one-page portfolio website for photographers, artists and freelancers in Rome: gallery, services, prices and an enquiry form. Built free, then {price} a month.",
      it: "Un sito portfolio di una pagina per fotografi, artisti e freelance a Roma: galleria, servizi, prezzi e modulo di richiesta. Realizzato gratis, poi {price} al mese.",
    },
    h1: { en: "Portfolio websites for photographers and freelancers", it: "Siti portfolio per fotografi e freelance" },
    intro: {
      en: "A portfolio has one job: show your best work and make it easy to hire you. One well-designed page usually does that better than ten, and it's the cheapest plan.",
      it: "Un portfolio ha un solo compito: mostrare il tuo lavoro migliore e rendere facile contattarti. Una pagina ben fatta di solito lo fa meglio di dieci, ed è il piano più economico.",
    },
    needs: [
      { title: { en: "Your work, big", it: "Il tuo lavoro, in grande" }, body: { en: "A fast gallery with filters, so people jump to what they need.", it: "Una galleria veloce con filtri, per arrivare subito a ciò che serve." } },
      { title: { en: "Services and prices from", it: "Servizi e prezzi di partenza" }, body: { en: "Answers the first question before it's asked.", it: "Risponde alla prima domanda prima che venga fatta." } },
      { title: { en: "An enquiry form", it: "Un modulo di richiesta" }, body: { en: "Date, type of job and a message, straight to your inbox.", it: "Data, tipo di lavoro e messaggio, dritti nella tua email." } },
      { title: { en: "Your own domain", it: "Il tuo dominio" }, body: { en: "yourname.com looks far more professional than a profile link.", it: "tuonome.it è molto più professionale di un link a un profilo." } },
    ],
    faqs: [
      { q: { en: "Is one page enough?", it: "Basta una pagina?" }, a: { en: "For most portfolios, yes. If you grow into needing more pages, you can move up to Business at any time.", it: "Per quasi tutti i portfolio sì. Se poi servono più pagine, puoi passare al piano Business quando vuoi." } },
      { q: { en: "Can I swap photos?", it: "Posso cambiare le foto?" }, a: { en: "Send me new ones and I update the gallery. One small change a month is included.", it: "Mandami le nuove e aggiorno la galleria. È inclusa una piccola modifica al mese." } },
      { q: { en: "Is it only for photographers?", it: "È solo per fotografi?" }, a: { en: "No: designers, illustrators, makeup artists, musicians and consultants use the same kind of page.", it: "No: designer, illustratori, truccatori, musicisti e consulenti usano lo stesso tipo di pagina." } },
    ],
  },
];

export const industryBySlug = (slug: string) => industries.find((i) => i.slug === slug);
