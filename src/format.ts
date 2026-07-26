// Formatierung der Listen-Labels fuer die Brille. Monochrom, ein Blick
// genuegt: kompakte Zeilen, ASCII-sicher (keine exotischen Glyphen).
// Listen-Items: max. 64 Zeichen (SDK-Grenze).

import type { Departure, Stop } from './transit'

/** Auf max. `max` Zeichen kuerzen (ohne Ellipsis-Glyph, firmware-sicher). */
export function clamp(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max)
}

function hhmm(iso: string): string {
  const dt = new Date(iso)
  if (isNaN(dt.getTime())) return '--:--'
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function fmtDelayMin(whenIso: string | null, schedIso: string | null): string {
  if (!whenIso || !schedIso) return ''
  const diff = new Date(whenIso).getTime() - new Date(schedIso).getTime()
  if (isNaN(diff)) return ''
  const m = Math.round(diff / 60000)
  if (m === 0) return ''
  return m > 0 ? `+${m}` : `${m}`
}

function fmtDist(m?: number): string {
  if (m == null) return ''
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}

/** "Hauptbahnhof (120 m)" */
export function stopLabel(s: Stop): string {
  const dist = fmtDist(s.distance)
  return clamp(dist ? `${s.name} (${dist})` : s.name, 64)
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function localDateKey(dt: Date): string {
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}

/** Datums-Trennzeile, z. B. "-- Mo 27.07. --" */
function dateHeader(dt: Date): string {
  const wd = WEEKDAYS[dt.getDay()]
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  return `-- ${wd} ${dd}.${mm}. --`
}

/** True, wenn die Zeile eine Datums-Trennzeile ist (kein anwaehlbarer Eintrag). */
export function isDateHeader(row: string): boolean {
  return row.startsWith('-- ')
}

/**
 * Abfahrtsliste mit Datumszeilen: vor dem ersten Eintrag und immer dann,
 * wenn sich das (lokale) Datum aendert, wird eine Datums-Trennzeile eingefuegt.
 * Auf `max` Zeilen begrenzt, endet nie auf einer Trennzeile.
 */
export function departureRows(deps: Departure[], max = 20): string[] {
  const rows: string[] = []
  let lastKey = ''
  for (const d of deps) {
    const iso = d.when ?? d.scheduledWhen
    const dt = iso ? new Date(iso) : null
    if (dt && !isNaN(dt.getTime())) {
      const k = localDateKey(dt)
      if (k !== lastKey) {
        rows.push(dateHeader(dt))
        lastKey = k
      }
    }
    rows.push(departureLabel(d))
  }
  if (rows.length > max) rows.length = max
  while (rows.length && isDateHeader(rows[rows.length - 1])) rows.pop()
  return rows
}

/** "12:34+2  751  Schlossplatz"  (ausgefallen: "12:34  751  X Ziel") */
export function departureLabel(d: Departure): string {
  const iso = d.when ?? d.scheduledWhen
  const time = iso ? hhmm(iso) : '--:--'
  const delay = fmtDelayMin(d.when, d.scheduledWhen)
  const timePart = delay ? `${time}${delay}` : time
  const dir = d.direction ?? ''
  const marker = d.cancelled ? 'X ' : ''
  const label = dir
    ? `${timePart}  ${d.line}  ${marker}${dir}`
    : `${timePart}  ${d.line}${d.cancelled ? '  X' : ''}`
  return clamp(label, 64)
}
