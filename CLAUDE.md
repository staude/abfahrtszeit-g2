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

## Besonderheiten

- package_id: net.staude.abfahrtszeitg2
- Datenquelle: https://api.transitous.org (MOTIS v2, DELFI-GTFS + Echtzeit,
  deutschlandweit). Sendet CORS `*`, keine API-Keys. Domain steht in der
  app.json network-whitelist. Ersetzt die urspruenglich geplante DB-HAFAS-API
  (v6.db.transport.rest) - die ist deutschlandweit abgeschaltet (503),
  nur noch regionale HAFAS-Instanzen laufen.
- map/stops liefert steig-genaue Knoten -> nach Name zu Stationen gruppiert;
  Abfahrten werden aus bis zu 4 Steig-IDs zusammengefuehrt (stripped Parent-ID
  liefert 0 Abfahrten).
- Kein Standort-API im SDK. Standort kommt aus `navigator.geolocation`
  (Handy-WebView), bei Verweigerung Fallback auf IP-Geolocation
  (ipwho.is, ipapi.co). Beide Hosts in der network-whitelist.
- Listen koennen nicht in-place aktualisiert werden -> jeder Seitenwechsel
  ist ein `rebuildPageContainer`. Bewusst turn-based (kein Live-Refresh).
- Navigation: Liste scrollen per Swipe, Einfachtipp waehlt aus,
  Doppeltipp geht zurueck bzw. beendet auf der Haltestellen-Liste.
