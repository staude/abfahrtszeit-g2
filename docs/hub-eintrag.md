# Hub-Eintrag (Even Hub Dev Portal) - Abfahrten G2

Copy-paste-Vorlage fuer die Einreichung auf hub.evenrealities.com. Felder, die
schon in der `app.json` stehen, sind hier nur zur Kontrolle wiederholt.

## Basisdaten (aus app.json)

| Feld | Wert |
|---|---|
| Name | Abfahrten G2 |
| package_id | net.staude.abfahrtszeitg2 |
| version | 0.1.0 |
| edition | 202601 |
| min_app_version | 0.1.0 |
| min_sdk_version | 0.0.12 |
| author | Frank Neumann-Staude |
| supported_languages | de, en |

## Kurzbeschreibung / Tagline (max. 50 Zeichen)

- DE: `ÖPNV-Abfahrten in deiner Nähe auf der Brille`  (44)
- EN: `Transit departures near you, on your glasses`  (44)

## Beschreibung

### Deutsch

Abfahrten G2 zeigt die nächsten Abfahrten des öffentlichen Nahverkehrs direkt auf deiner Even-G2-Brille - ohne zum Handy greifen zu müssen.

So funktioniert es:
- Standort ermitteln: Die App bestimmt deinen Standort über die Even-App und findet die Haltestellen in deiner Nähe.
- Haltestelle wählen: alle Stopps in der Umgebung, nach Entfernung sortiert.
- Abfahrten sehen: Bus, Tram, S-Bahn, U-Bahn und Zug in einer Liste, mit Uhrzeit, Linie, Ziel und Echtzeit-Verspätung. Datumszeilen trennen die Tage.
- Fahrtverlauf: Tippe auf eine Abfahrt und sieh alle Halte dieser Fahrt mit ihren Zeiten.

Bedienung: Wischen scrollt die Liste, Tippen wählt aus, Doppeltippen geht zurück.

Die Fahrplandaten kommen deutschlandweit von Transitous (transitous.org) auf Basis der offiziellen DELFI-Feeds, inklusive Echtzeit. Es werden keine Konten, keine Anmeldung und keine persönlichen Daten benötigt.

Die Oberfläche ist auf Deutsch und Englisch verfügbar und folgt automatisch der Sprache deines Handys.

### English (max. 2000 Zeichen)

Abfahrten G2 shows the next public transport departures right on your Even G2 glasses - no need to reach for your phone.

How it works:
- Locate: the app determines your position through the Even app and finds the stops around you.
- Pick a stop: every nearby stop, sorted by distance.
- See departures: bus, tram, metro, suburban and regional trains in one list, with time, line, destination and real-time delay. Date rows separate the days.
- Route: tap a departure to see every stop on that trip with its time.

Controls: swipe to scroll, tap to select, double-tap to go back.

Timetable data covers all of Germany via Transitous (transitous.org), based on the official DELFI feeds and including real-time updates. No account, no sign-in and no personal data required.

The interface is available in German and English and follows your phone's language automatically.

## Tags (5)

`Public transport`, `Departures`, `Timetable`, `Bus`, `Train`

(DE-Entsprechung, falls das Portal deutsche Tags will: Nahverkehr, Abfahrten, Fahrplan, Bus, Bahn)

## Access Permissions (Begruendung fuers Review)

- **location** - Ermittelt den Standort, um Haltestellen in der Nähe zu finden. / Determines the user's location to find nearby stops.
- **network** - Lädt Haltestellen und Abfahrtszeiten aus der Fahrplan-API. / Loads stops and departure times from the timetable API. Whitelist:
  - `https://api.transitous.org` - Fahrplandaten (Haltestellen, Abfahrten, Fahrtverlauf)
  - `https://ipwho.is` - grobe IP-Ortung, nur als Fallback ohne GPS
  - `https://ipapi.co` - IP-Ortung, zweiter Fallback

## Privacy-Text

### Deutsch

Abfahrten G2 speichert keine personenbezogenen Daten und legt keine Konten an. Zur Nutzung wird der ungefähre Standort verwendet, um Haltestellen in der Nähe zu finden. Die Koordinaten werden ausschließlich an die Fahrplan-API von Transitous (api.transitous.org) übertragen, um Haltestellen und Abfahrten abzufragen. Steht über die Even-App kein Standort zur Verfügung, wird ersatzweise eine grobe, IP-basierte Ortung über ipwho.is bzw. ipapi.co genutzt. Es findet kein Tracking statt, es werden keine Daten zu Werbezwecken an Dritte weitergegeben, und es wird nichts dauerhaft gespeichert.

### English

Abfahrten G2 stores no personal data and creates no accounts. It uses your approximate location to find nearby stops. Coordinates are sent only to the Transitous timetable API (api.transitous.org) to look up stops and departures. If no location is available through the Even app, a coarse IP-based lookup via ipwho.is or ipapi.co is used as a fallback. There is no tracking, no sharing of data with third parties for advertising, and nothing is stored permanently.

## Assets

- App-Icon: `docs/icon-24.png` (24x24, monochrom, weiß auf transparent)
- Screenshots (Brillen-Display 576x288): `docs/stops-ansbach.png`, `docs/departures-ansbach.png`, `docs/trip-re80.png`
- Support-/Kontakt-E-Mail: __________ (vor der Einreichung eintragen)

## Vor dem Absenden

- [ ] `npm run build`, dann `evenhub pack app.json dist -o abfahrtszeit-g2.ehpk` (globales `evenhub`, nicht `npx`).
- [ ] Die gepackte `.ehpk` einmal selbst laufen lassen - `evenhub pack` prueft die network-Whitelist NICHT, ein leerer/fehlender Eintrag blockiert die Daten erst im Paket.
- [ ] Auf der echten Brille gegenpruefen: Ortung greift (nicht IP-Fallback), Auto-Select oeffnet keine Haltestelle beim Laden, Sprachwechsel folgt der Systemsprache.
- [ ] Handy-WebView zeigt Inhalt (Review-Anforderung) - erfuellt durch `src/phone.ts`.
