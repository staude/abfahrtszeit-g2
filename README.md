# abfahrtszeit-g2

Even-G2-Plugin, das die naechsten Abfahrten des OePNV rund um den eigenen
Standort anzeigt. Ablauf: Standort ermitteln -> Haltestellen in der Naehe
auflisten -> Haltestelle antippen -> Abfahrten von Bus, Tram, S-/U-Bahn und
Zug sehen.

Datenquelle ist [Transitous](https://transitous.org) (MOTIS v2,
`api.transitous.org`) - eine freie, deutschland- und europaweite OePNV-API
auf Basis der DELFI-GTFS-Feeds inkl. Echtzeit. Keine API-Keys noetig.

> Hinweis: Urspruenglich war die HAFAS-API der Deutschen Bahn
> (`v6.db.transport.rest`) geplant. Die ist inzwischen deutschlandweit
> abgeschaltet (nur regionale HAFAS-Instanzen laufen noch). Transitous ist
> der offene, nationale Ersatz mit demselben Funktionsumfang fuer diese App.

## Bedienung auf der Brille

- **Swipe hoch/runter** — durch die Liste scrollen
- **Einfachtipp** — Haltestelle auswaehlen / Abfahrten oeffnen
- **Doppeltipp** — von der Abfahrtsliste zurueck zur Haltestellenliste;
  auf der Haltestellenliste beendet der Doppeltipp das Plugin

## Standort

Das Plugin ermittelt den Standort in dieser Reihenfolge:

1. **`bridge.getAppLocation()`** — native Ortung ueber die Even-App (SDK ab
   0.0.12). Nutzt die iOS/Android-Standortfreigabe der App und funktioniert
   auch im Prototype-Betrieb ueber `http://<LAN-IP>`. Voraussetzung: die
   Even-App hat in den Systemeinstellungen die Ortungsfreigabe.
2. **`navigator.geolocation`** — GPS der WebView, nur bei sicherem Origin
   (HTTPS); im http-Prototype blockiert.
3. **IP-Geolocation** — grober Fallback (`ipwho.is`, dann `ipapi.co`).

Im Simulator wird i. d. R. der IP-Fallback verwendet (Titel zeigt dann `(ca.)`).

## Voraussetzungen

- Node 20 LTS oder 22+
- Globale Tools: `npm install -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator`
- Even-Realities-App mit aktiviertem Developer Mode (hub.evenrealities.com)

## Entwickeln

```bash
./setup.sh          # npm install + git init mit richtiger Identitaet
npm run dev         # Terminal 1: Vite-Dev-Server
evenhub-simulator http://localhost:5173   # Terminal 2: Simulator
```

## Auf der Brille testen

```bash
ipconfig getifaddr en0                    # LAN-IP des Macs
evenhub qr --url "http://<LAN-IP>:5173"   # QR-Code erzeugen
```

QR-Code mit der Even-Realities-App scannen. Handy und Mac muessen im
selben Netz sein, Firewall und WLAN-Client-Isolation beachten.

## Packen

```bash
npm run build
evenhub pack app.json dist -o abfahrtszeit-g2.ehpk
```
