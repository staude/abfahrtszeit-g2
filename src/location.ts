// Standortermittlung. Das Even-Hub-SDK bietet KEINE Standort-API, daher:
//   1. navigator.geolocation (GPS des Handys, sofern die WebView die
//      Freigabe durchreicht bzw. im Simulator der Rechner-Standort)
//   2. Fallback auf grobe IP-Geolocation (ipwho.is, dann ipapi.co)
// Beide Netz-Hosts stehen in der app.json network-whitelist.

import { fetchJson } from './http'

export interface GeoResult {
  lat: number
  lon: number
  source: 'gps' | 'ip'
  accuracy?: number // Meter (nur GPS)
  label?: string // Stadt (nur IP)
}

function browserGeolocation(timeoutMs = 6000): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation nicht verfuegbar'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'gps',
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(err.message || 'geolocation abgelehnt')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

async function ipGeolocation(): Promise<GeoResult> {
  // 1) ipwho.is  -> { success, latitude, longitude, city }
  try {
    const d = (await fetchJson('https://ipwho.is/', 6000)) as any
    if (
      d &&
      d.success !== false &&
      typeof d.latitude === 'number' &&
      typeof d.longitude === 'number'
    ) {
      return { lat: d.latitude, lon: d.longitude, source: 'ip', label: d.city }
    }
  } catch {
    // weiter zum naechsten Anbieter
  }
  // 2) ipapi.co  -> { latitude, longitude, city }
  const d = (await fetchJson('https://ipapi.co/json/', 6000)) as any
  if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
    return { lat: d.latitude, lon: d.longitude, source: 'ip', label: d.city }
  }
  throw new Error('IP-Standort fehlgeschlagen')
}

/** Bester verfuegbarer Standort: GPS zuerst, sonst IP. */
export async function getLocation(): Promise<GeoResult> {
  try {
    return await browserGeolocation()
  } catch {
    return await ipGeolocation()
  }
}
