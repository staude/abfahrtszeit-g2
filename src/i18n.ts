// Zweisprachige UI-Texte (de/en), Muster wie dorfkino-g2 / weather-even-g2:
// Sprache einmal beim Start aus navigator.language ableiten (im Even-WebView =
// Systemsprache), Fallback Englisch, Override zum Testen per ?lang=de|en.
// Fahrplan-Daten aus der API bleiben unveraendert; Eigennamen (Haltestellen,
// Linien, "Transitous") werden nicht uebersetzt. Die G2-Schrift rendert
// Umlaute/ß korrekt -> deutsche Texte mit echten Umlauten.

export type Locale = 'de' | 'en'

const DICT: Record<Locale, Record<string, string>> = {
  de: {
    title: 'ABFAHRTEN',
    locating: 'Standort wird ermittelt ...',
    searchingStops: 'Suche Haltestellen ...',
    noStops: 'Keine Haltestellen in der Nähe gefunden.',
    loadingDepartures: 'Lade Abfahrten ...',
    loadingTrip: 'Lade Fahrt ...',
    stopHeader: '- Haltestelle wählen -',
    noDepartures: 'Keine Abfahrten',
    tripHeader: '- Fahrtverlauf -',
    noTrip: 'Kein Fahrtverlauf',
    approx: ' (ca.)',
    errorTitle: 'FEHLER',
    errorHint: 'Tipp: erneut versuchen\nDoppeltipp: beenden',
    listError: 'LISTEN-FEHLER',
    listErrorBody: 'Anzeige fehlgeschlagen ({n} Zeilen)\n\nDoppeltipp: beenden',
    weekdays: 'So,Mo,Di,Mi,Do,Fr,Sa',
    phTagline: 'ÖPNV-Abfahrten in deiner Nähe auf der Brille',
    phCount:
      '<b>{n} Haltestellen in der Nähe</b>{src} &ndash; Auswahl und Abfahrten laufen auf der Brille.',
    phApproxIp: ' (ungefähr, per IP)',
    phLoadError: 'Fehler beim Laden: {msg}',
    phStopsSection: 'Haltestellen in der Nähe',
    phControlsSection: 'Bedienung auf der Brille',
    phHints:
      '<b>Wischen</b> &ndash; Liste scrollen<br><b>Tippen</b> &ndash; Haltestelle öffnen, Abfahrt zeigt den Fahrtverlauf<br><b>Doppeltippen</b> &ndash; zurück / beenden',
    phFooter: 'Daten: Transitous (transitous.org) &middot; deutschlandweit, mit Echtzeit',
  },
  en: {
    title: 'DEPARTURES',
    locating: 'Getting your location ...',
    searchingStops: 'Searching for stops ...',
    noStops: 'No stops found nearby.',
    loadingDepartures: 'Loading departures ...',
    loadingTrip: 'Loading trip ...',
    stopHeader: '- Select stop -',
    noDepartures: 'No departures',
    tripHeader: '- Route -',
    noTrip: 'No route data',
    approx: ' (approx.)',
    errorTitle: 'ERROR',
    errorHint: 'Tap: retry\nDouble-tap: exit',
    listError: 'LIST ERROR',
    listErrorBody: 'Display failed ({n} rows)\n\nDouble-tap: exit',
    weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    phTagline: 'Public transport departures near you, on your glasses',
    phCount:
      '<b>{n} stops nearby</b>{src} &ndash; selection and departures run on your glasses.',
    phApproxIp: ' (approx., via IP)',
    phLoadError: 'Failed to load: {msg}',
    phStopsSection: 'Stops nearby',
    phControlsSection: 'Controls on the glasses',
    phHints:
      '<b>Swipe</b> &ndash; scroll the list<br><b>Tap</b> &ndash; open a stop, a departure shows its route<br><b>Double-tap</b> &ndash; back / exit',
    phFooter: 'Data: Transitous (transitous.org) &middot; Germany-wide, with realtime',
  },
}

function detect(): Locale {
  if (typeof window !== 'undefined') {
    const forced = new URLSearchParams(window.location.search).get('lang')
    if (forced === 'de' || forced === 'en') return forced
  }
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  return lang.split('-')[0].toLowerCase() === 'de' ? 'de' : 'en'
}

export const LOCALE: Locale = detect()

/** Text zu `key`, mit {platzhalter}-Ersetzung. Fehlender Key -> en -> key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const val = DICT[LOCALE][key] ?? DICT.en[key] ?? key
  if (!params) return val
  return val.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] === undefined ? `{${k}}` : String(params[k]),
  )
}

/** Lokalisierte Wochentags-Kuerzel (Index = Date.getDay()). */
export function weekdays(): string[] {
  return t('weekdays').split(',')
}
