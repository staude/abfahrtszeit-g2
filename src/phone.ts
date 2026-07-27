// Handy-Seite (Flutter-WebView im Even Hub). Die Brille zeigt das eigentliche
// UI; diese Seite macht das WebView sinnvoll statt leer (Review-Anforderung):
// Kopf mit App-Identitaet, Live-Liste der Haltestellen in der Naehe (gleiche
// Daten wie die Brille), Bedienhinweise. Farben/Typo nach den Even-Design-
// Guidelines (Phone-Side Tokens, hell/dunkel; Akzent sparsam, NIE das
// Brillen-Gruen).

import type { Stop } from './transit'
import type { GeoResult } from './location'

const CSS = `
:root {
  --text: #232323;
  --text-dim: #7B7B7B;
  --bg: #FFFFFF;
  --surface: #EEEEEE;
  --accent: #FEF991;
}
@media (prefers-color-scheme: dark) {
  :root {
    --text: #FFFFFF;
    --text-dim: #8A8A8A;
    --bg: #111111;
    --surface: #1A1A1A;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: "FK Grotesk Neue", -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 640px; margin: 0 auto; padding: 24px 20px 32px; }
.head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.head svg { width: 40px; height: 40px; flex: none; color: var(--text); }
h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.tagline { font-size: 13px; color: var(--text-dim); margin: 4px 0 24px; }
.status {
  background: var(--surface); border-radius: 12px; padding: 12px 16px;
  font-size: 13px; color: var(--text-dim); margin-bottom: 24px;
}
.status b { color: var(--text); font-weight: 500; }
.label {
  font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px;
}
.rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.row {
  background: var(--surface); border-radius: 12px; padding: 12px 16px;
  display: flex; gap: 12px; align-items: baseline;
}
.row .dist { font-size: 13px; color: var(--text-dim); white-space: nowrap; flex: none; width: 72px; }
.row .name { font-size: 16px; font-weight: 500; letter-spacing: -0.01em; }
.hints { font-size: 13px; color: var(--text-dim); line-height: 1.7; margin-bottom: 24px; }
.hints b { color: var(--text); font-weight: 500; }
.foot { font-size: 11px; color: var(--text-dim); }
`

// Uhr-Silhouette (Abfahrtszeit), currentColor.
const ICON_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3.5 2"/>
</svg>`

function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}

export interface PhoneUi {
  setStatus(text: string): void
  setStops(stops: Stop[], geo: GeoResult): void
}

/** Baut die Handy-Seite in #app auf. Sofort aufrufen (vor dem Bridge-Await),
 *  damit das WebView nie leer ist. */
export function initPhoneUi(): PhoneUi {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return { setStatus: () => {}, setStops: () => {} }

  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  app.innerHTML = `
    <main class="wrap">
      <div class="head">${ICON_SVG}<h1>Abfahrten G2</h1></div>
      <p class="tagline">&Ouml;PNV-Abfahrten in deiner N&auml;he auf der Brille</p>
      <div class="status" id="ph-status">Standort wird ermittelt ...</div>
      <div class="label">Haltestellen in der N&auml;he</div>
      <div class="rows" id="ph-rows"></div>
      <div class="label">Bedienung auf der Brille</div>
      <p class="hints">
        <b>Wischen</b> &ndash; Liste scrollen<br>
        <b>Tippen</b> &ndash; Haltestelle &ouml;ffnen, Abfahrt zeigt den Fahrtverlauf<br>
        <b>Doppeltippen</b> &ndash; zur&uuml;ck / beenden
      </p>
      <p class="foot">Daten: Transitous (transitous.org) &middot; deutschlandweit, mit Echtzeit</p>
    </main>`

  const statusEl = app.querySelector<HTMLDivElement>('#ph-status')!
  const rowsEl = app.querySelector<HTMLDivElement>('#ph-rows')!

  return {
    setStatus(text: string): void {
      statusEl.textContent = text
    },
    setStops(stops: Stop[], geo: GeoResult): void {
      const src = geo.source === 'ip' ? ' (ungefähr, per IP)' : ''
      statusEl.innerHTML = `<b>${stops.length} Haltestellen in der Nähe</b>${src} &ndash; Auswahl und Abfahrten laufen auf der Brille.`
      rowsEl.innerHTML = stops
        .slice(0, 10)
        .map(
          (s) => `
          <div class="row">
            <span class="dist">${fmtDist(s.distance)}</span>
            <span class="name">${escapeHtml(s.name)}</span>
          </div>`,
        )
        .join('')
    },
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  )
}
