/**
 * ───────────────────────────────────────────────────────────────
 *  LEGAL PAGES: privacy policy, cookie policy, terms, legal notice
 *
 *  A careful starting point written for a sole web designer in Italy
 *  (GDPR, Italian Privacy Code, Garante cookie guidelines, Consumer
 *  Code, Civil Code). It is NOT legal advice: have a lawyer or your
 *  commercialista check it before relying on it.
 *
 *  Your details come from `legal`, `site`, `contact` and `pricing` in
 *  src/config/site.ts via {placeholders}. A line whose placeholder is
 *  empty (e.g. {pec} with no PEC) is dropped automatically.
 *  Links: [text](/path) or [text](https://…).
 *  If you add a tool that sets cookies or collects data (analytics,
 *  chat widget, newsletter), update the privacy and cookie policies.
 * ───────────────────────────────────────────────────────────────
 */
import type { Lang } from "@/lib/i18n";

export type LegalBlock =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } }
  /** The list of plans and monthly prices, from src/config/site.ts. */
  | { plans: true };

export type LegalSection = { id: string; heading: string; body: LegalBlock[] };
export type LegalDoc = { title: string; description: string; intro: string; sections: LegalSection[] };
export type LegalKind = "privacy" | "cookies" | "terms" | "legal";

export const legalRoutes: Record<LegalKind, string> = {
  privacy: "/privacy",
  cookies: "/cookies",
  terms: "/terms",
  legal: "/legal",
};

const en: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Privacy policy",
    description: "How CPD Web Design collects and uses personal data, and your rights under the GDPR.",
    intro:
      "This policy explains what personal data I collect through this website and when you work with me, why I collect it, and what your rights are. It follows the EU General Data Protection Regulation (GDPR, Regulation (EU) 2016/679) and the Italian Privacy Code (Legislative Decree 196/2003).",
    sections: [
      {
        id: "controller",
        heading: "Who is responsible for your data",
        body: [
          "The data controller is {owner}, trading as {business}.",
          { list: ["Address: {address}", "VAT no.: {vat}", "Email: {email}", "PEC: {pec}"] },
          "I haven't appointed a Data Protection Officer, because the GDPR doesn't require one for this kind of processing.",
        ],
      },
      {
        id: "data",
        heading: "What I collect",
        body: [
          {
            list: [
              "Contact form: your name, business name (optional), email address and message, and when you sent it. It's delivered to my inbox by email.",
              "Email and WhatsApp: whatever you choose to send me, plus your email address or phone number.",
              "Clients: the details needed to set up and run our contract and to invoice you, such as name, business name, tax code or VAT number, billing address and payment records.",
              "Technical data: when you visit the site, the hosting provider automatically records your IP address, browser type, the page requested and the time, in server logs used for security and to keep the site running.",
              "Your choices on this site: your language and cookie preferences, stored in your own browser (see the [cookie policy](/cookies)).",
            ],
          },
          "I don't use analytics, advertising or tracking tools, and I don't build profiles of visitors. The fonts on this site are served from my own hosting, so no data goes to font providers.",
        ],
      },
      {
        id: "purposes",
        heading: "Why I use it, and the legal basis",
        body: [
          {
            table: {
              head: ["Purpose", "Legal basis (GDPR art. 6)"],
              rows: [
                ["Replying to your enquiry and preparing a proposal", "Steps you've asked for before a contract (art. 6(1)(b))"],
                ["Building, hosting and maintaining your website, and support", "Performance of the contract (art. 6(1)(b))"],
                ["Invoicing, accounting and tax records", "Legal obligation (art. 6(1)(c))"],
                ["Keeping the site secure and working, and stopping spam and abuse", "Legitimate interest (art. 6(1)(f))"],
                ["Establishing or defending legal claims", "Legitimate interest (art. 6(1)(f))"],
                ["Showing Google Maps on the example sites", "Your consent (art. 6(1)(a)), which you can withdraw at any time"],
              ],
            },
          },
          "Giving me your details is voluntary, but without your name, email address and message I can't reply to you. I don't make decisions about you by automated means alone.",
        ],
      },
      {
        id: "recipients",
        heading: "Who I share it with",
        body: [
          "I don't sell your data. I share it only with providers that help me run the business, who act on my instructions as data processors, or with others where the law requires it:",
          {
            list: [
              "Vercel Inc. (USA): website hosting and server logs.",
              "FormSubmit (formsubmit.co): delivers contact form messages to my inbox by email.",
              "My email provider, which stores the emails I send and receive.",
              "WhatsApp (Meta Platforms Ireland Ltd.), only if you choose to message me there. WhatsApp's own privacy policy applies.",
              "Unsplash, which serves some photos on the example sites and receives your IP address to do so.",
              "Google Ireland Ltd., only if you choose to show a map on an example site.",
              "My accountant (commercialista), banks and the tax authorities, for invoicing and tax records.",
            ],
          },
        ],
      },
      {
        id: "transfers",
        heading: "Transfers outside the EU",
        body: [
          "Some of these providers are based in the USA. Transfers rely on the EU–US Data Privacy Framework where the provider is certified under it, or on the European Commission's Standard Contractual Clauses. You can ask me for more details.",
        ],
      },
      {
        id: "retention",
        heading: "How long I keep it",
        body: [
          {
            list: [
              "Enquiries that don't lead to a contract: up to {retention} months after our last contact, then deleted.",
              "Client and contract data: for the length of the contract, then up to 10 years for accounting and tax purposes (art. 2220 of the Italian Civil Code), or longer if needed for a legal claim.",
              "Server logs: for a short period set by the hosting provider.",
              "Preferences stored in your browser: until you clear them. Your cookie choice expires after 6 months.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        body: [
          "Under articles 15 to 22 of the GDPR you can ask me at any time to:",
          {
            list: [
              "tell you what data I hold about you and give you a copy;",
              "correct data that's wrong or incomplete;",
              "delete your data, unless I have to keep it by law;",
              "restrict how I use it;",
              "stop using it where I rely on legitimate interest;",
              "send it to you or another provider in a common format;",
              "withdraw your consent, without affecting anything done before.",
            ],
          },
          "Email {email} to do any of these. I'll reply within one month.",
          "You can also complain to the Italian data protection authority, the [Garante per la protezione dei dati personali](https://www.garanteprivacy.it), or to the authority in the EU country where you live or work.",
        ],
      },
      {
        id: "security",
        heading: "How I protect it",
        body: [
          "The site is served only over HTTPS with strict security headers, and contact form messages aren't stored on the website itself. My email and provider accounts are protected with strong passwords and two-factor authentication.",
        ],
      },
      {
        id: "clients",
        heading: "If I build your website",
        body: [
          "If your site collects personal data from your own visitors, for example through a booking form, you are the controller of that data and I process it on your behalf. We'll sign a data processing agreement under article 28 of the GDPR as part of our contract. Your site will need its own privacy policy, which I can help you set up.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        body: ["If I change this policy, I'll update the date at the top of this page. I'll tell clients about significant changes by email."],
      },
    ],
  },

  cookies: {
    title: "Cookie policy",
    description: "The cookies and browser storage this site uses, and how to change your choices.",
    intro:
      "Cookies and similar technologies, such as your browser's local storage, let a website remember things on your device. This page lists everything this site uses. It follows the Italian data protection authority's cookie guidelines of 10 June 2021 and article 122 of the Italian Privacy Code.",
    sections: [
      {
        id: "used",
        heading: "What this site uses",
        body: [
          "This site only uses what it needs to work. There are no analytics, advertising or social media tracking cookies.",
          {
            table: {
              head: ["Name", "Type", "What it does", "How long"],
              rows: [
                ["cpd-lang", "Technical (local storage)", "Remembers whether you chose English or Italian", "Until you clear it"],
                ["cpd-consent", "Technical (local storage)", "Remembers your cookie choices so you aren't asked on every page", "6 months"],
                ["Google Maps cookies", "Third-party, optional", "Shows interactive maps on the example sites. Set by Google only if you allow external content or click a map.", "Set by Google"],
              ],
            },
          },
          "Technical storage doesn't need your consent, but it's listed here so you know it's there.",
        ],
      },
      {
        id: "third-party",
        heading: "Third-party content",
        body: [
          "Some example sites can show a Google map. It only loads if you've allowed external content, or if you click “Show interactive map”. Google then handles your data under its own [privacy policy](https://policies.google.com/privacy) and [cookie policy](https://policies.google.com/technologies/cookies).",
          "Photos on the example sites are loaded from Unsplash, which receives your IP address in order to send the image.",
        ],
      },
      {
        id: "choices",
        heading: "Your choices",
        body: [
          "On your first visit, a banner lets you accept or reject optional cookies. Rejecting, or closing the banner with the X, keeps everything optional switched off, and the site works just the same.",
          "You can change your mind at any time with the button below, or with “Cookie settings” at the bottom of every page.",
          "You can also block or delete cookies and site data in your browser's settings. If you block local storage, the site won't remember your language.",
        ],
      },
      {
        id: "more",
        heading: "More information",
        body: ["For how personal data is handled, see the [privacy policy](/privacy). Questions: {email}."],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    description: "The terms for website design, hosting and maintenance plans from CPD Web Design.",
    intro:
      "These terms apply to the website design, hosting and maintenance services offered by {business}. Please read them before signing up, and ask me first if anything isn't clear.",
    sections: [
      {
        id: "who",
        heading: "Who I am",
        body: [
          "{business} is run by {owner}.",
          { list: ["Address: {address}", "VAT no.: {vat}", "Email: {email}", "PEC: {pec}"] },
        ],
      },
      {
        id: "contract",
        heading: "How a contract is made",
        body: [
          "Prices on this site are for information. Before any work starts, I'll send you a written proposal setting out your plan, what's included and the expected launch date. The contract is made when you accept it in writing, by signing it or confirming by email. The proposal and these terms together form the contract. If they disagree, the proposal applies.",
          "My services are for businesses and professionals. If you sign up as a consumer, for purposes outside your trade or profession, section 13 also applies.",
        ],
      },
      {
        id: "prices",
        heading: "Plans and prices",
        body: [
          "There's no charge to design and build your site. Instead you pay a monthly fee for your plan:",
          { plans: true },
          "Prices exclude VAT, which is added where due. What each plan includes is listed on the home page and in your proposal. Work outside your plan, such as extra pages, an online shop, new features or a redesign, is quoted separately and only done once you've approved the quote.",
        ],
      },
      {
        id: "term",
        heading: "Minimum term and cancelling",
        body: [
          "Each plan has a minimum term of {months} months, starting on the day your site goes live. This is how the cost of designing and building your site is covered.",
          "After the minimum term your plan continues month to month, and you can cancel at any time with {notice} days' notice by email.",
          "If you cancel before the minimum term ends, the fees for the rest of the minimum term are still due.",
          "I can end the contract with {notice} days' notice after the minimum term, or straight away if you seriously breach these terms, for example by not paying after a reminder or by using the site for illegal content.",
        ],
      },
      {
        id: "payment",
        heading: "Payment",
        body: [
          "Monthly fees are invoiced in advance and paid by the method set out in your proposal, by the due date on the invoice.",
          "If a payment is late, I'll send you a reminder. If it's still unpaid 15 days after the reminder, I may suspend the site until it's paid. Late payments between businesses accrue interest under Legislative Decree 231/2002.",
        ],
      },
      {
        id: "changes-support",
        heading: "Small changes and support",
        body: [
          "Your plan includes a set number of small changes each month, as listed in the plan. A small change is anything that takes up to about 30 minutes, such as updating text, prices, opening hours or photos. Unused changes don't carry over to the next month. I'll make them within a reasonable time, usually a few working days.",
        ],
      },
      {
        id: "client",
        heading: "Your responsibilities",
        body: [
          {
            list: [
              "Give me the text, photos, logos and information for your site, and make sure they're accurate.",
              "Make sure you have the right to use everything you give me, and that it doesn't break the law or anyone else's rights. You're responsible for claims arising from content you supplied.",
              "Keep the legal information on your site correct, such as your business details and VAT number. I can set up privacy and cookie pages for you, but you're responsible for what they say about your business.",
              "Reply to my questions within a reasonable time. Delays on your side can delay the launch, but your minimum term only starts once the site is live.",
            ],
          },
        ],
      },
      {
        id: "domain",
        heading: "Domain names",
        body: [
          "Your domain is registered in your name, or you keep the one you already have, and it's always yours. I'll transfer it to you or any provider you choose whenever you ask, at no charge. Your proposal says whether the domain renewal fee is included in your plan.",
        ],
      },
      {
        id: "ownership",
        heading: "Ownership",
        body: [
          {
            list: [
              "Your content (text, photos, logos and data) is always yours.",
              "I keep the copyright in the design and code I create. While your plan is active, you have a licence to use them for your site.",
              "After the minimum term you can buy the design and code outright for a one-off fee of {fee}, plus VAT where due. I'll then hand over all the files so you can host the site anywhere.",
              "If you leave without buying them, I'll send you an export of your content, and the site will go offline at the end of the notice period.",
              "I may show your site in my portfolio unless you ask me not to.",
            ],
          },
        ],
      },
      {
        id: "hosting",
        heading: "Hosting and availability",
        body: [
          "I host your site with established providers and aim to keep it online at all times, but I can't guarantee it will never be unavailable. Planned maintenance and problems at hosting or other providers can cause short outages. I keep regular backups and will restore your site as quickly as reasonably possible if something goes wrong.",
        ],
      },
      {
        id: "data",
        heading: "Personal data",
        body: [
          "If your site collects personal data from your visitors, you are the controller and I process it on your behalf. We'll sign a data processing agreement under article 28 of the GDPR together with the proposal. How I handle your own data is described in the [privacy policy](/privacy).",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        body: [
          "I'll do the work with reasonable skill and care. As far as the law allows, my total liability under the contract is limited to the fees you paid in the 12 months before the event that led to the claim, and I'm not liable for indirect losses such as lost profits or lost business. Nothing in these terms limits liability for wilful misconduct or gross negligence (art. 1229 of the Italian Civil Code), or any other liability that can't be limited by law.",
        ],
      },
      {
        id: "consumers",
        heading: "If you're a consumer",
        body: [
          "If you sign up as a consumer, the Italian Consumer Code (Legislative Decree 206/2005) protects you, and nothing in these terms reduces those rights.",
          "You can withdraw from a contract made at a distance within 14 days, without giving a reason, by telling me by email. If you ask me to start work during those 14 days and then withdraw, you only pay for the service provided up to that point.",
          "Disputes are heard by the court where you live.",
        ],
      },
      {
        id: "updates",
        heading: "Changes to these terms",
        body: [
          "I may update these terms. Changes to an existing contract, including price changes, are sent to you by email at least {notice} days before they apply, and you can cancel without penalty before they take effect.",
        ],
      },
      {
        id: "law",
        heading: "Law and disputes",
        body: [
          "These terms are governed by Italian law. For business clients, the courts of {court} have exclusive jurisdiction. Before going to court, we'll both try to settle any problem by talking it through.",
          "For business clients, the clauses on the minimum term and cancelling (section 4), suspension (section 5), ownership (section 9), liability (section 12) and jurisdiction (this section) are specifically approved in writing when the proposal is signed, as required by articles 1341 and 1342 of the Italian Civil Code.",
        ],
      },
    ],
  },

  legal: {
    title: "Legal notice",
    description: "Business details for CPD Web Design, as required by Italian law.",
    intro: "Information required by Italian law (art. 7 of Legislative Decree 70/2003 and art. 35 of Presidential Decree 633/1972).",
    sections: [
      {
        id: "business",
        heading: "Business details",
        body: [
          {
            list: [
              "Business: {business}",
              "Owner: {owner}",
              "Address: {address}",
              "VAT no. (Partita IVA): {vat}",
              "REA: {rea}",
              "Email: {email}",
              "PEC: {pec}",
              "Phone: {phone}",
            ],
          },
        ],
      },
      { id: "hosting", heading: "Hosting", body: ["This site is hosted by {host}."] },
      {
        id: "copyright",
        heading: "Copyright",
        body: ["The design, text and code of this site are © {year} {business} unless stated otherwise. Please don't copy them without permission."],
      },
      {
        id: "examples",
        heading: "Example sites",
        body: [
          "The businesses on the example sites, such as Trattoria Alba and Hotel Via Giulia, are fictional. Any resemblance to real businesses is unintended. Photos on the example sites come from [Unsplash](https://unsplash.com) and are used under the Unsplash License.",
        ],
      },
      { id: "links", heading: "Links to other sites", body: ["This site links to other websites. I'm not responsible for their content or how they handle your data."] },
      { id: "privacy", heading: "Privacy and cookies", body: ["See the [privacy policy](/privacy) and the [cookie policy](/cookies)."] },
    ],
  },
};

const it: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Informativa sulla privacy",
    description: "Come CPD Web Design raccoglie e usa i dati personali, e i tuoi diritti secondo il GDPR.",
    intro:
      "Questa informativa spiega quali dati personali raccolgo tramite questo sito e quando lavori con me, perché li raccolgo e quali sono i tuoi diritti. È redatta ai sensi del Regolamento generale sulla protezione dei dati (GDPR, Regolamento (UE) 2016/679) e del Codice in materia di protezione dei dati personali (D.Lgs. 196/2003).",
    sections: [
      {
        id: "controller",
        heading: "Titolare del trattamento",
        body: [
          "Il titolare del trattamento è {owner}, che opera come {business}.",
          { list: ["Indirizzo: {address}", "P.IVA: {vat}", "Email: {email}", "PEC: {pec}"] },
          "Non ho nominato un Responsabile della protezione dei dati (DPO), perché il GDPR non lo richiede per questo tipo di trattamento.",
        ],
      },
      {
        id: "data",
        heading: "Quali dati raccolgo",
        body: [
          {
            list: [
              "Modulo di contatto: nome, nome dell'attività (facoltativo), indirizzo email e messaggio, e quando l'hai inviato. Mi arriva via email.",
              "Email e WhatsApp: ciò che scegli di inviarmi, insieme al tuo indirizzo email o numero di telefono.",
              "Clienti: i dati necessari per attivare e gestire il contratto e per la fatturazione, come nome, ragione sociale, codice fiscale o partita IVA, indirizzo di fatturazione e pagamenti.",
              "Dati tecnici: quando visiti il sito, il fornitore di hosting registra automaticamente indirizzo IP, tipo di browser, pagina richiesta e orario, in log usati per la sicurezza e il funzionamento del sito.",
              "Le tue scelte su questo sito: lingua e preferenze sui cookie, salvate nel tuo browser (vedi la [cookie policy](/cookies)).",
            ],
          },
          "Non uso strumenti di analisi, pubblicità o tracciamento e non creo profili dei visitatori. I font di questo sito sono serviti dal mio hosting, quindi nessun dato viene inviato a fornitori di font.",
        ],
      },
      {
        id: "purposes",
        heading: "Finalità e base giuridica",
        body: [
          {
            table: {
              head: ["Finalità", "Base giuridica (art. 6 GDPR)"],
              rows: [
                ["Rispondere alla tua richiesta e preparare una proposta", "Misure precontrattuali richieste da te (art. 6, par. 1, lett. b)"],
                ["Realizzare, ospitare e mantenere il tuo sito, e assistenza", "Esecuzione del contratto (art. 6, par. 1, lett. b)"],
                ["Fatturazione, contabilità e obblighi fiscali", "Obbligo di legge (art. 6, par. 1, lett. c)"],
                ["Sicurezza e funzionamento del sito, prevenzione di spam e abusi", "Legittimo interesse (art. 6, par. 1, lett. f)"],
                ["Accertare o difendere un diritto in sede giudiziaria", "Legittimo interesse (art. 6, par. 1, lett. f)"],
                ["Mostrare Google Maps nei siti di esempio", "Il tuo consenso (art. 6, par. 1, lett. a), revocabile in qualsiasi momento"],
              ],
            },
          },
          "Fornire i dati è facoltativo, ma senza nome, email e messaggio non posso risponderti. Non prendo decisioni che ti riguardano basate unicamente su trattamenti automatizzati.",
        ],
      },
      {
        id: "recipients",
        heading: "A chi comunico i dati",
        body: [
          "Non vendo i tuoi dati. Li comunico solo ai fornitori che mi aiutano a gestire l'attività, che agiscono su mie istruzioni come responsabili del trattamento, o ad altri soggetti quando la legge lo richiede:",
          {
            list: [
              "Vercel Inc. (USA): hosting del sito e log del server.",
              "FormSubmit (formsubmit.co): recapita via email alla mia casella i messaggi del modulo di contatto.",
              "Il mio fornitore di posta elettronica, che conserva le email che invio e ricevo.",
              "WhatsApp (Meta Platforms Ireland Ltd.), solo se scegli di scrivermi lì. Si applica l'informativa di WhatsApp.",
              "Unsplash, che fornisce alcune foto dei siti di esempio e per farlo riceve il tuo indirizzo IP.",
              "Google Ireland Ltd., solo se scegli di mostrare una mappa in un sito di esempio.",
              "Il mio commercialista, le banche e l'amministrazione finanziaria, per fatturazione e obblighi fiscali.",
            ],
          },
        ],
      },
      {
        id: "transfers",
        heading: "Trasferimenti fuori dall'UE",
        body: [
          "Alcuni di questi fornitori hanno sede negli Stati Uniti. I trasferimenti si basano sull'EU–US Data Privacy Framework, se il fornitore vi aderisce, oppure sulle Clausole contrattuali standard della Commissione europea. Puoi chiedermi maggiori dettagli.",
        ],
      },
      {
        id: "retention",
        heading: "Per quanto tempo conservo i dati",
        body: [
          {
            list: [
              "Richieste che non portano a un contratto: fino a {retention} mesi dall'ultimo contatto, poi vengono cancellate.",
              "Dati dei clienti e del contratto: per tutta la durata del contratto e poi fino a 10 anni per fini contabili e fiscali (art. 2220 del Codice civile), o più a lungo se necessario per una controversia.",
              "Log del server: per un breve periodo stabilito dal fornitore di hosting.",
              "Preferenze salvate nel browser: finché non le cancelli. La scelta sui cookie scade dopo 6 mesi.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "I tuoi diritti",
        body: [
          "Ai sensi degli articoli da 15 a 22 del GDPR puoi chiedermi in qualsiasi momento di:",
          {
            list: [
              "sapere quali dati conservo su di te e riceverne una copia;",
              "correggere dati inesatti o incompleti;",
              "cancellare i tuoi dati, salvo quelli che devo conservare per legge;",
              "limitarne l'uso;",
              "smettere di usarli quando la base è il legittimo interesse;",
              "riceverli, o farli inviare a un altro fornitore, in un formato di uso comune;",
              "revocare il consenso, senza effetti su quanto fatto prima.",
            ],
          },
          "Scrivi a {email} per esercitare questi diritti. Ti rispondo entro un mese.",
          "Puoi anche presentare reclamo al [Garante per la protezione dei dati personali](https://www.garanteprivacy.it) o all'autorità del paese UE in cui vivi o lavori.",
        ],
      },
      {
        id: "security",
        heading: "Come proteggo i dati",
        body: [
          "Il sito è servito solo tramite HTTPS con intestazioni di sicurezza rigorose, e i messaggi del modulo di contatto non vengono salvati sul sito. Gli account di posta e dei fornitori sono protetti da password robuste e autenticazione a due fattori.",
        ],
      },
      {
        id: "clients",
        heading: "Se realizzo il tuo sito",
        body: [
          "Se il tuo sito raccoglie dati personali dei tuoi visitatori, per esempio tramite un modulo di prenotazione, il titolare di quei dati sei tu e io li tratto per tuo conto. Firmeremo un accordo sul trattamento dei dati ai sensi dell'articolo 28 del GDPR insieme al contratto. Il tuo sito avrà bisogno di una propria informativa privacy, che posso aiutarti a predisporre.",
        ],
      },
      {
        id: "changes",
        heading: "Modifiche a questa informativa",
        body: ["Se modifico questa informativa, aggiorno la data in cima alla pagina. Comunico ai clienti le modifiche importanti via email."],
      },
    ],
  },

  cookies: {
    title: "Cookie policy",
    description: "I cookie e i dati del browser usati da questo sito, e come cambiare le tue scelte.",
    intro:
      "I cookie e le tecnologie simili, come la memoria locale del browser, permettono a un sito di ricordare informazioni sul tuo dispositivo. Questa pagina elenca tutto ciò che usa questo sito, secondo le Linee guida cookie del Garante del 10 giugno 2021 e l'articolo 122 del Codice privacy.",
    sections: [
      {
        id: "used",
        heading: "Cosa usa questo sito",
        body: [
          "Questo sito usa solo ciò che serve per funzionare. Non ci sono cookie di analisi, pubblicità o tracciamento dei social network.",
          {
            table: {
              head: ["Nome", "Tipo", "A cosa serve", "Durata"],
              rows: [
                ["cpd-lang", "Tecnico (memoria locale)", "Ricorda se hai scelto italiano o inglese", "Finché non lo cancelli"],
                ["cpd-consent", "Tecnico (memoria locale)", "Ricorda le tue scelte sui cookie, così non te lo chiediamo a ogni pagina", "6 mesi"],
                ["Cookie di Google Maps", "Di terze parti, facoltativo", "Mostra mappe interattive nei siti di esempio. Impostati da Google solo se consenti i contenuti esterni o fai clic su una mappa.", "Stabilita da Google"],
              ],
            },
          },
          "Gli strumenti tecnici non richiedono il consenso, ma li elenchiamo perché tu sappia che ci sono.",
        ],
      },
      {
        id: "third-party",
        heading: "Contenuti di terze parti",
        body: [
          "Alcuni siti di esempio possono mostrare una mappa di Google, che si carica solo se hai consentito i contenuti esterni o se fai clic su “Mostra mappa interattiva”. Da quel momento Google tratta i tuoi dati secondo la propria [informativa privacy](https://policies.google.com/privacy?hl=it) e [cookie policy](https://policies.google.com/technologies/cookies?hl=it).",
          "Le foto dei siti di esempio vengono caricate da Unsplash, che riceve il tuo indirizzo IP per inviare l'immagine.",
        ],
      },
      {
        id: "choices",
        heading: "Le tue scelte",
        body: [
          "Alla prima visita un banner ti permette di accettare o rifiutare i cookie facoltativi. Se rifiuti, o chiudi il banner con la X, tutto ciò che è facoltativo resta disattivato e il sito funziona allo stesso modo.",
          "Puoi cambiare idea in qualsiasi momento con il pulsante qui sotto, o con “Impostazioni cookie” in fondo a ogni pagina.",
          "Puoi anche bloccare o cancellare cookie e dati dei siti dalle impostazioni del browser. Se blocchi la memoria locale, il sito non ricorderà la lingua scelta.",
        ],
      },
      {
        id: "more",
        heading: "Ulteriori informazioni",
        body: ["Per il trattamento dei dati personali, leggi l'[informativa sulla privacy](/privacy). Per domande: {email}."],
      },
    ],
  },

  terms: {
    title: "Termini e condizioni",
    description: "Le condizioni dei piani di realizzazione, hosting e manutenzione siti di CPD Web Design.",
    intro:
      "Questi termini si applicano ai servizi di progettazione, hosting e manutenzione di siti web offerti da {business}. Leggili prima di aderire e, se qualcosa non è chiaro, chiedimelo prima.",
    sections: [
      {
        id: "who",
        heading: "Chi sono",
        body: [
          "{business} è un'attività di {owner}.",
          { list: ["Indirizzo: {address}", "P.IVA: {vat}", "Email: {email}", "PEC: {pec}"] },
        ],
      },
      {
        id: "contract",
        heading: "Come si conclude il contratto",
        body: [
          "I prezzi su questo sito sono indicativi. Prima di iniziare ti invio una proposta scritta con il piano, cosa include e la data prevista di pubblicazione. Il contratto si conclude quando la accetti per iscritto, firmandola o confermando via email. La proposta e questi termini formano insieme il contratto. In caso di contrasto prevale la proposta.",
          "I miei servizi sono rivolti a imprese e professionisti. Se aderisci come consumatore, per scopi estranei alla tua attività professionale, si applica anche la sezione 13.",
        ],
      },
      {
        id: "prices",
        heading: "Piani e prezzi",
        body: [
          "La progettazione e la realizzazione del sito non costano nulla. Paghi invece un canone mensile per il tuo piano:",
          { plans: true },
          "I prezzi sono IVA esclusa, se dovuta. Cosa include ogni piano è indicato nella home page e nella proposta. I lavori fuori dal piano, come pagine in più, un negozio online, nuove funzioni o un nuovo design, si preventivano a parte e si eseguono solo dopo la tua approvazione.",
        ],
      },
      {
        id: "term",
        heading: "Durata minima e disdetta",
        body: [
          "Ogni piano ha una durata minima di {months} mesi, a partire dal giorno in cui il sito viene pubblicato. È così che si copre il costo di progettazione e realizzazione.",
          "Dopo la durata minima il piano prosegue di mese in mese e puoi disdirlo in qualsiasi momento con {notice} giorni di preavviso via email.",
          "Se disdici prima della fine della durata minima, i canoni per i mesi restanti della durata minima restano dovuti.",
          "Posso recedere con {notice} giorni di preavviso dopo la durata minima, oppure immediatamente in caso di grave inadempimento, per esempio un mancato pagamento dopo un sollecito o l'uso del sito per contenuti illeciti.",
        ],
      },
      {
        id: "payment",
        heading: "Pagamenti",
        body: [
          "I canoni mensili sono fatturati in anticipo e pagati con il metodo indicato nella proposta, entro la scadenza riportata in fattura.",
          "In caso di ritardo ti invio un sollecito. Se il pagamento non arriva entro 15 giorni dal sollecito, posso sospendere il sito fino al saldo. Tra imprese, sui ritardi maturano gli interessi previsti dal D.Lgs. 231/2002.",
        ],
      },
      {
        id: "changes-support",
        heading: "Piccole modifiche e assistenza",
        body: [
          "Il piano include ogni mese un certo numero di piccole modifiche, come indicato nel piano. Una piccola modifica è qualcosa che richiede fino a circa 30 minuti, come aggiornare testi, prezzi, orari o foto. Le modifiche non usate non si accumulano. Le eseguo in tempi ragionevoli, di solito entro pochi giorni lavorativi.",
        ],
      },
      {
        id: "client",
        heading: "I tuoi impegni",
        body: [
          {
            list: [
              "Fornirmi testi, foto, loghi e informazioni per il sito, e assicurarti che siano corretti.",
              "Assicurarti di avere il diritto di usare tutto ciò che mi fornisci, e che non violi la legge o i diritti di altri. Rispondi tu delle contestazioni relative ai contenuti che hai fornito.",
              "Mantenere corrette le informazioni legali del tuo sito, come i dati dell'attività e la partita IVA. Posso predisporre le pagine privacy e cookie, ma il loro contenuto relativo alla tua attività è sotto la tua responsabilità.",
              "Rispondere alle mie domande in tempi ragionevoli. I ritardi da parte tua possono spostare la pubblicazione, ma la durata minima decorre solo dalla messa online.",
            ],
          },
        ],
      },
      {
        id: "domain",
        heading: "Nomi a dominio",
        body: [
          "Il dominio è registrato a tuo nome, oppure mantieni quello che hai già, ed è sempre tuo. Lo trasferisco a te o a qualsiasi fornitore tu scelga quando vuoi, senza costi. La proposta indica se il rinnovo del dominio è incluso nel piano.",
        ],
      },
      {
        id: "ownership",
        heading: "Proprietà",
        body: [
          {
            list: [
              "I tuoi contenuti (testi, foto, loghi e dati) sono sempre tuoi.",
              "I diritti d'autore sul design e sul codice che realizzo restano miei. Finché il piano è attivo hai una licenza d'uso per il tuo sito.",
              "Dopo la durata minima puoi acquistare design e codice con un pagamento unico di {fee}, più IVA se dovuta. Ti consegno tutti i file e puoi ospitare il sito dove vuoi.",
              "Se interrompi il servizio senza acquistarli, ti invio un'esportazione dei tuoi contenuti e il sito va offline alla fine del preavviso.",
              "Posso mostrare il tuo sito nel mio portfolio, salvo tua diversa richiesta.",
            ],
          },
        ],
      },
      {
        id: "hosting",
        heading: "Hosting e disponibilità",
        body: [
          "Ospito il tuo sito presso fornitori affermati e faccio il possibile perché sia sempre online, ma non posso garantire che non sia mai irraggiungibile. Manutenzioni programmate e problemi dei fornitori di hosting o di altri servizi possono causare brevi interruzioni. Eseguo backup regolari e, se qualcosa va storto, ripristino il sito il prima possibile.",
        ],
      },
      {
        id: "data",
        heading: "Dati personali",
        body: [
          "Se il tuo sito raccoglie dati personali dei visitatori, il titolare sei tu e io li tratto per tuo conto. Firmeremo un accordo sul trattamento dei dati ai sensi dell'articolo 28 del GDPR insieme alla proposta. Il modo in cui tratto i tuoi dati è descritto nell'[informativa sulla privacy](/privacy).",
        ],
      },
      {
        id: "liability",
        heading: "Responsabilità",
        body: [
          "Svolgo il lavoro con la diligenza professionale richiesta. Nei limiti consentiti dalla legge, la mia responsabilità complessiva per il contratto è limitata ai canoni che hai pagato nei 12 mesi precedenti il fatto che ha dato origine alla richiesta, e non rispondo di danni indiretti come mancati guadagni o perdita di clientela. Nulla in questi termini limita la responsabilità per dolo o colpa grave (art. 1229 del Codice civile) o qualsiasi altra responsabilità che per legge non può essere limitata.",
        ],
      },
      {
        id: "consumers",
        heading: "Se sei un consumatore",
        body: [
          "Se aderisci come consumatore, sei tutelato dal Codice del consumo (D.Lgs. 206/2005) e nulla in questi termini riduce i tuoi diritti.",
          "Puoi recedere da un contratto concluso a distanza entro 14 giorni, senza indicarne il motivo, comunicandolo via email. Se mi chiedi di iniziare il lavoro durante quei 14 giorni e poi recedi, paghi solo il servizio prestato fino a quel momento.",
          "Per le controversie è competente il giudice del luogo in cui risiedi.",
        ],
      },
      {
        id: "updates",
        heading: "Modifiche a questi termini",
        body: [
          "Posso aggiornare questi termini. Le modifiche a un contratto in corso, comprese quelle di prezzo, ti vengono comunicate via email almeno {notice} giorni prima di applicarsi, e puoi recedere senza penali prima che entrino in vigore.",
        ],
      },
      {
        id: "law",
        heading: "Legge applicabile e controversie",
        body: [
          "Questi termini sono regolati dalla legge italiana. Per i clienti business è competente in via esclusiva il Foro di {court}. Prima di rivolgerci a un giudice, cercheremo entrambi di risolvere il problema parlandone.",
          "Per i clienti business, le clausole su durata minima e disdetta (sezione 4), sospensione (sezione 5), proprietà (sezione 9), responsabilità (sezione 12) e foro competente (questa sezione) sono approvate specificamente per iscritto alla firma della proposta, ai sensi degli articoli 1341 e 1342 del Codice civile.",
        ],
      },
    ],
  },

  legal: {
    title: "Note legali",
    description: "I dati dell'attività CPD Web Design, come previsto dalla legge italiana.",
    intro: "Informazioni previste dalla legge italiana (art. 7 del D.Lgs. 70/2003 e art. 35 del D.P.R. 633/1972).",
    sections: [
      {
        id: "business",
        heading: "Dati dell'attività",
        body: [
          {
            list: [
              "Attività: {business}",
              "Titolare: {owner}",
              "Indirizzo: {address}",
              "Partita IVA: {vat}",
              "REA: {rea}",
              "Email: {email}",
              "PEC: {pec}",
              "Telefono: {phone}",
            ],
          },
        ],
      },
      { id: "hosting", heading: "Hosting", body: ["Questo sito è ospitato da {host}."] },
      {
        id: "copyright",
        heading: "Diritti d'autore",
        body: ["Design, testi e codice di questo sito sono © {year} {business}, salvo diversa indicazione. Non copiarli senza autorizzazione."],
      },
      {
        id: "examples",
        heading: "Siti di esempio",
        body: [
          "Le attività dei siti di esempio, come Trattoria Alba e Hotel Via Giulia, sono immaginarie. Ogni somiglianza con attività reali è casuale. Le foto dei siti di esempio provengono da [Unsplash](https://unsplash.com) e sono usate secondo la Unsplash License.",
        ],
      },
      { id: "links", heading: "Link ad altri siti", body: ["Questo sito contiene link ad altri siti. Non sono responsabile dei loro contenuti né di come trattano i tuoi dati."] },
      { id: "privacy", heading: "Privacy e cookie", body: ["Leggi l'[informativa sulla privacy](/privacy) e la [cookie policy](/cookies)."] },
    ],
  },
};

export const legalDocs: Record<Lang, Record<LegalKind, LegalDoc>> = { en, it };
