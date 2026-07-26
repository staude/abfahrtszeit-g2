// Standortermittlung, in Reihenfolge der Zuverlaessigkeit:
//   1. bridge.getAppLocation()  — native Ortung ueber die Even-App (nutzt die
//      iOS/Android-Standortfreigabe der App). Funktioniert auch im Prototype
//      ueber http://LAN, wo die WebView-Geolocation blockiert ist.
//   2. navigator.geolocation     — GPS der WebView (nur bei sicherem Origin)
//   3. IP-Geolocation            — grober Fallback (ipwho.is, dann ipapi.co)
// Fuer (1) muss in app.json die "location"-Permission stehen.

import { AppLocationAccuracy } from '@evenrealities/even_hub_sdk'
import { fetchJson } from './http'

export interface GeoResult {
  lat: number
  lon: number
  source: 'app' | 'gps' | 'ip'
  accuracy?: number // Meter (app/gps)
  label?: string // Stadt (ip)
}

// Test-/Override-Standort ueber URL-Parameter (?lat=..&lon=..). Praktisch im
// Simulator (der sonst per IP ortet) und fuer reproduzierbare Screenshots.
function overrideFromUrl(): GeoResult | null {
  if (typeof window === 'undefined' || !window.location) return null
  const p = new URLSearchParams(window.location.search)
  const lat = parseFloat(p.get('lat') ?? '')
  const lon = parseFloat(p.get('lon') ?? '')
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon, source: 'gps' }
  }
  return null
}

async function appLocation(bridge: any, timeoutMs = 8000): Promise<GeoResult> {
  if (!bridge || typeof bridge.getAppLocation !== 'function') {
    throw new Error('getAppLocation nicht verfuegbar')
  }
  const loc = await bridge.getAppLocation({
    accuracy: AppLocationAccuracy.High,
    timeoutMs,
  })
  if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return {
      lat: loc.latitude,
      lon: loc.longitude,
      source: 'app',
      accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : undefined,
    }
  }
  throw new Error('App-Ortung ohne Ergebnis')
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

/** Bester verfuegbarer Standort: URL-Override, native App-Ortung, WebView-GPS, IP. */
export async function getLocation(bridge: any): Promise<GeoResult> {
  const override = overrideFromUrl()
  if (override) return override
  try {
    return await appLocation(bridge)
  } catch {
    // native Ortung nicht verfuegbar/verweigert -> weiter
  }
  try {
    return await browserGeolocation()
  } catch {
    return await ipGeolocation()
  }
}
