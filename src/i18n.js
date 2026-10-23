// index.html chooses the preferred language before the reservation widget loads.
// Keep one language for the whole visit, including routes and third-party embeds.
export const language = document.documentElement.lang === 'de' ? 'de' : 'en'

export const translations = {
  de: {
    menu: 'MENÜ',
    home: 'ZURÜCK',
    navigation: 'Hauptnavigation',
    pageNavigation: 'Seitennavigation',
    mobileNavigation: 'Mobile Seitennavigation',
    openMenu: 'Menü öffnen',
    menuDialog: 'Menü',
    goHome: 'Zurück',
    news: {
      label: 'Neuigkeiten',
      text: 'Neue Herbstkarte • Weihnachtsmarkt Eröffnung Freitag 13.11.2026 • Wir suchen Verstärkung • Bewerbungen per Mail',
      pause: 'Lauftext pausieren',
      resume: 'Lauftext fortsetzen',
    },
    links: { drinks: 'DRINKS', photos: 'FOTOS', floorplan: 'RAUMPLAN', legal: 'IMPRESSUM' },
    description: 'Kleinlaut | Die bunte Bar im Herzen Wiens <3',
    days: 'Dienstag bis Samstag',
    hours: '18:00–02:00 Uhr',
    contact: {
      beforeCall: 'Bei Fragen ',
      call: 'ruf uns gerne an',
      beforeInstagram: ', schreib uns auf ',
      instagram: 'Instagram',
      beforeEmail: ' oder schick uns eine ',
      email: 'E-Mail',
      afterEmail: ' :)',
    },
    heroAlt: 'Cocktail in einer stimmungsvoll beleuchteten Bar',
    mapAlt: 'Kleinlaut auf Google Maps',
    mapTitle: 'Standort von Kleinlaut auf Google Maps',
    galleryCaption: ['Die bunte', 'Bar im Herzen', 'Wiens <3'],
    galleryAlt: 'Foto aus der Kleinlaut-Galerie',
    floorplanAlt: 'Raumplan',
    floorplanRooms: ['Garten', 'Séparée', 'Bar', 'WC', 'Floor', 'Hinterraum'],
    business: 'Gastronomiebetrieb',
  },
  en: {
    menu: 'MENU',
    home: 'BACK',
    navigation: 'Main navigation',
    pageNavigation: 'Page navigation',
    mobileNavigation: 'Mobile page navigation',
    openMenu: 'Open menu',
    menuDialog: 'Menu',
    goHome: 'Back',
    news: {
      label: 'Latest news',
      text: 'New autumn menu • Christmas market opening Friday 13 November 2026 • We’re hiring • Apply by email',
      pause: 'Pause scrolling text',
      resume: 'Resume scrolling text',
    },
    links: { drinks: 'DRINKS', photos: 'PHOTOS', floorplan: 'FLOOR PLAN', legal: 'LEGAL NOTICE' },
    description: 'Kleinlaut | The colourful bar in the heart of Vienna <3',
    days: 'Tuesday to Saturday',
    hours: '6 pm–2 am',
    contact: {
      beforeCall: 'Questions? ',
      call: 'Give us a call',
      beforeInstagram: ', message us on ',
      instagram: 'Instagram',
      beforeEmail: ' or ',
      email: 'send us an email',
      afterEmail: ' :)',
    },
    heroAlt: 'Cocktail in a softly lit bar',
    mapAlt: 'Kleinlaut on Google Maps',
    mapTitle: 'Kleinlaut location on Google Maps',
    galleryCaption: null,
    galleryAlt: 'Photo from the Kleinlaut gallery',
    floorplanAlt: 'Floor plan',
    floorplanRooms: ['Garden', 'Séparée', 'Bar', 'WC', 'Floor', 'Back room'],
    business: 'Hospitality business',
  },
}

export const copy = translations[language]

export function localizeMetadata() {
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    document.querySelector(selector)?.setAttribute('content', copy.description)
  }
}
