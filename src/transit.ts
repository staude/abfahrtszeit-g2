// Datenquelle: Transitous (MOTIS v2), https://api.transitous.org
// Deutschlandweite OePNV-Daten (DELFI-GTFS + regionale Feeds), inkl. Echtzeit.
// Frei, ohne API-Key, sendet CORS `*`. Host steht in der app.json-Whitelist.
//
// Hinweis: Die urspruenglich geplante HAFAS-API der DB (v6.db.transport.rest)
// ist deutschlandweit abgeschaltet (nur noch regionale Instanzen laufen).
// Transitous ist der offene, nationale Ersatz.

import { fetchJson } from './http'

const API = 'https://api.transitous.org/api/v1'

export interface Stop {
  name: string
  lat: number
  lon: number
  distance: number // Meter vom Suchpunkt
  childIds: string[] // alle Steig-/Bahnsteig-IDs dieser Station
}

export interface Departure {
  when: string | null // Echtzeit-Abfahrt (ISO)
  scheduledWhen: string | null // Soll-Abfahrt (ISO)
  line: string // z. B. "751", "S1", "RE7"
  direction: string | null // Fahrtziel (headsign)
  mode: string // BUS, TRAM, SUBWAY, RAIL, ...
  realtime: boolean
  cancelled: boolean
  tripId: string
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Haltestellen in der Naehe. map/stops liefert Steig-genaue Knoten; wir
 * gruppieren nach Name zu Stationen, merken uns alle Steig-IDs und sortieren
 * nach Entfernung. `radiusDeg` ~0.02 entspricht grob 1,5-2 km.
 */
export async function nearbyStops(
  lat: number,
  lon: number,
  max = 20,
  radiusDeg = 0.02,
): Promise<Stop[]> {
  const min = `${lat - radiusDeg},${lon - radiusDeg}`
  const maxc = `${lat + radiusDeg},${lon + radiusDeg}`
  const data = await fetchJson(`${API}/map/stops?min=${min}&max=${maxc}`)
  if (!Array.isArray(data)) return []

  // Gruppen-Schluessel normalisieren, damit dieselbe Station aus mehreren
  // GTFS-Feeds ("Ansbach Herrieder Tor" vs "Ansbach, Herrieder Tor")
  // zusammenfaellt. Kommas raus, Whitespace glaetten, klein schreiben.
  const keyOf = (name: string) =>
    name.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()

  const groups = new Map<string, Stop>()
  for (const s of data as any[]) {
    if (!s || !s.stopId || !s.name) continue
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue
    // reine On-Demand-Knoten (Rufbus/ODM) ohne Linienverkehr ueberspringen
    if (Array.isArray(s.modes) && s.modes.length > 0 && s.modes.every((m: string) => m === 'ODM')) {
      continue
    }
    const dist = haversine(lat, lon, s.lat, s.lon)
    const k = keyOf(String(s.name))
    const g = groups.get(k)
    if (!g) {
      groups.set(k, {
        name: String(s.name),
        lat: s.lat,
        lon: s.lon,
        distance: dist,
        childIds: [String(s.stopId)],
      })
    } else {
      g.childIds.push(String(s.stopId))
      // Anzeigename ohne Komma bevorzugen (sauberer auf der Brille)
      if (String(s.name).indexOf(',') === -1 && g.name.indexOf(',') !== -1) {
        g.name = String(s.name)
      }
      if (dist < g.distance) {
        g.distance = dist
        g.lat = s.lat
        g.lon = s.lon
      }
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max)
}

function mapDeparture(s: any): Departure {
  const place = s?.place ?? {}
  return {
    when: place.departure ?? null,
    scheduledWhen: place.scheduledDeparture ?? null,
    line: s.routeShortName || s.displayName || s.mode || '?',
    direction: s.headsign ?? null,
    mode: s.mode ?? '',
    realtime: s.realTime === true,
    cancelled:
      place.cancelled === true ||
      s.cancelled === true ||
      s.tripCancelled === true,
    tripId: s.tripId ?? '',
  }
}

async function stoptimesFor(
  stopId: string,
  n: number,
  timeIso: string,
): Promise<Departure[]> {
  const url =
    `${API}/stoptimes?stopId=${encodeURIComponent(stopId)}` +
    `&n=${n}&arriveBy=false&time=${encodeURIComponent(timeIso)}`
  const data = (await fetchJson(url)) as any
  const arr: any[] = Array.isArray(data?.stopTimes) ? data.stopTimes : []
  return arr.map(mapDeparture)
}

/** Effektive Abfahrtszeit (Echtzeit, sonst Soll) in ms. */
function departureTime(d: Departure): number {
  return new Date(d.when ?? d.scheduledWhen ?? 0).getTime()
}

/**
 * Naechste Abfahrten einer Station AB JETZT. Fragt bis zu 4 Steige parallel
 * mit time=jetzt ab, fuehrt sie zusammen, dedupliziert nach Fahrt, filtert
 * bereits vergangene Abfahrten heraus (60 s Toleranz) und sortiert nach Zeit.
 */
export async function departures(stop: Stop, n = 20): Promise<Departure[]> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const cutoff = now - 60_000 // 60 s Toleranz fuer knapp verpasste/Uhr-Drift

  const ids = stop.childIds.slice(0, 4)
  const lists = await Promise.all(
    ids.map((id) =>
      stoptimesFor(id, n, nowIso).catch(() => [] as Departure[]),
    ),
  )

  const key = (d: Departure) => `${d.tripId}|${d.scheduledWhen ?? ''}`
  const seen = new Set<string>()
  const merged: Departure[] = []
  for (const d of lists.flat()) {
    if (departureTime(d) < cutoff) continue // nur zukuenftige Abfahrten
    const k = key(d)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(d)
  }

  return merged
    .sort((a, b) => departureTime(a) - departureTime(b))
    .slice(0, n)
}
