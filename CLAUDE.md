# abfahrtszeit-g2 - Projektregeln

## Plattform

@../../_shared/platform-glasses.md
@../../_shared/design-evenapps.md

## Zweck

Even-G2-Plugin: zeigt Abfahrten von OePNV-Haltestellen in der Naehe.
Standort per GPS (WebView) oder IP-Fallback, Haltestellen und Abfahrten
ueber Transitous (MOTIS, api.transitous.org), deutschlandweit.

## Setup und Start

- Installieren: `./setup.sh` (oder `npm install`)
- Lokal starten: `npm run dev` und in zweitem Terminal
  `evenhub-simulator http://localhost:5173`
- Typecheck: `npm run typecheck`
- Auf die Brille: `evenhub qr --url "http://<LAN-IP>:5173"` und den
  QR-Code in der Even-Realities-App scannen (Developer Mode noetig)

## Deploy

- Packen: `npm run build`, dann `evenhub pack app.json dist -o abfahrtszeit-g2.ehpk`
  (globales `evenhub`-Binary, NICHT `npx evenhub` - das sucht ein npm-Paket).
- Einreichen im Dev Portal (hub.evenrealities.com). Icon `docs/icon-24.png`
  dort hochladen (steckt nicht in der .ehpk).

## Architektur

- `src/transit.ts` - API-Client (Transitous/MOTIS): nearbyStops, departures
  (merge über Steige, time=jetzt, Filter auf zukünftig), tripStops.
- `src/location.ts` - Standort: URL-Override, getAppLocation, navigator, IP.
- `src/i18n.ts` - de/en-Wörterbuch, `t(key)`, `weekdays()`. Sprache aus
  navigator.language (Systemsprache im WebView), Fallback en, `?lang=` zum Test.
- `src/format.ts` - Labels, Datumszeilen, DepartureRow-Mapping, clamp.
- `src/render.ts` - Renderer (text/list), prüft rebuild-Ergebnis, Fallback.
- `src/phone.ts` - Handy-Seite (WebView), Pflicht fürs Store-Review.
- `src/main.ts` - State-Machine (locating/stops/departures/trip/error).

## Besonderheiten

- package_id: net.staude.abfahrtszeitg2
- Store-Metadaten in app.json: name, description, tagline, author, edition,
  min_app_version, min_sdk_version. Ohne die lehnt der Store ab.
- SDK exakt auf 0.0.12 gepinnt (nicht `^`): `getAppLocation` gibt es erst ab
  0.0.12. Kein Bild-Container in dieser App -> der 0.0.12-Bild-Bug
  (updateImageRawData -> sendFailed, siehe dorfkino-g2) trifft hier nicht.
- FIRMWARE-AUTO-SELECT: Nach jedem Listenaufbau feuert die Firmware einen
  Auto-Select auf Index 0 (im Protobuf ohne Index, von einem echten Tipp auf
  Zeile 0 nicht unterscheidbar). Deshalb ist Zeile 0 jeder Liste eine No-Op-
  Kopfzeile ("- Haltestelle waehlen -", Datumszeile, "- Fahrtverlauf -");
  echte Eintraege ab Index 1 (Stops-Mapping: `stops[index - 1]`). Ohne das
  oeffnet die Brille beim Aufbau sofort die erste Haltestelle. Auf Hardware
  bei dorfkino-g2 erarbeitet.
- Handy-Seite (`phone.ts`) ist Pflicht: ein leeres WebView ist ein
  Store-Ablehnungsgrund. Zeigt Identitaet, Haltestellen in der Naehe,
  Bedienhinweise. Akzent `#FEF991`, NIE das Brillen-Gruen.
- Store-Screenshots: die ROHE Simulator-Ausgabe verwenden (`/api/screenshot/glasses`
  bzw. der Screenshot-Button des Simulators, 576x288 RGBA, transparenter
  Hintergrund, anti-aliased grün) und mit der NEUESTEN Simulator-Version
  aufnehmen. NICHT auf Schwarz flachrechnen oder umfärben - genau daran
  scheiterte das erste Store-Review (2026-07-31: "Screenshot does not pass the
  standard. Please use the simulator (latest version)"). Format wie dorfkino-g2
  (im Store akzeptiert).
- Zweisprachig (de/en), Muster wie dorfkino-g2: alle UI-Texte in `i18n.ts`,
  Sprache aus navigator.language, Test per `?lang=de|en`. Fahrplan-Daten und
  Eigennamen (Haltestellen, Linien) bleiben unuebersetzt. app.json:
  `supported_languages: ["de","en"]`. Deutsche Glasses-Texte mit echten
  Umlauten (Font rendert sie korrekt).
- Datenquelle: https://api.transitous.org (MOTIS v2, DELFI-GTFS + Echtzeit,
  deutschlandweit). Sendet CORS `*`, keine API-Keys. Domain steht in der
  app.json network-whitelist. Ersetzt die urspruenglich geplante DB-HAFAS-API
  (v6.db.transport.rest) - die ist deutschlandweit abgeschaltet (503),
  nur noch regionale HAFAS-Instanzen laufen.
- map/stops liefert steig-genaue Knoten -> nach Name zu Stationen gruppiert;
  Abfahrten werden aus bis zu 4 Steig-IDs zusammengefuehrt (stripped Parent-ID
  liefert 0 Abfahrten).
- Standort: primaer `bridge.getAppLocation()` (native Even-App-Ortung, ab
  SDK 0.0.12; nutzt die iOS/Android-Standortfreigabe der App und funktioniert
  auch im Prototype ueber http://LAN). Fallback 1: `navigator.geolocation`
  (nur bei sicherem Origin, im http-Prototype blockiert). Fallback 2: grobe
  IP-Geolocation (ipwho.is, ipapi.co, in der network-whitelist).
  Wichtig: dafuer muss die "location"-Permission in app.json stehen und die
  Even-App in den iOS-Einstellungen die Ortungsfreigabe haben.
- Listen koennen nicht in-place aktualisiert werden -> jeder Seitenwechsel
  ist ein `rebuildPageContainer`. Bewusst turn-based (kein Live-Refresh).
- Navigation: Liste scrollen per Swipe, Einfachtipp waehlt aus,
  Doppeltipp geht zurueck bzw. beendet auf der Haltestellen-Liste.
