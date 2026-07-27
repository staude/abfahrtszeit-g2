// abfahrtszeit-g2 — Abfahrten des OePNV rund um den eigenen Standort.
//
// Ablauf:  Standort ermitteln -> Haltestellen in der Naehe (Liste)
//          -> Haltestelle antippen -> Abfahrten (Liste, mit Datumszeilen)
//          -> Abfahrt antippen -> Fahrtverlauf (alle Halte der Fahrt).
//
// Bedienung:
//   Swipe hoch/runter  Liste scrollen (Firmware, kein Event)
//   Einfachtipp        Haltestelle -> Abfahrten, Abfahrt -> Fahrtverlauf
//   Doppeltipp         zurueck; auf der Haltestellen-Liste: beenden

import {
  waitForEvenAppBridge,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { getLocation, type GeoResult } from './location'
import {
  nearbyStops,
  departures,
  tripStops,
  type Stop,
  type Departure,
  type TripStop,
} from './transit'
import {
  departureRowList,
  tripStopLabel,
  stopLabel,
  clamp,
  type DepartureRow,
} from './format'
import { Renderer } from './render'
import { initPhoneUi } from './phone'
import { t } from './i18n'

const TITLE = t('title')

type StopsState = { name: 'stops'; geo: GeoResult; stops: Stop[] }
type DeparturesState = {
  name: 'departures'
  geo: GeoResult
  stops: Stop[]
  stop: Stop
  deps: Departure[]
  rows: DepartureRow[]
}
type TripState = {
  name: 'trip'
  from: DeparturesState
  dep: Departure
  stops: TripStop[]
}
type State =
  | { name: 'locating' }
  | StopsState
  | DeparturesState
  | TripState
  | { name: 'error'; message: string }

async function main(): Promise<void> {
  // Handy-Seite sofort aufbauen, damit das WebView nie leer ist (Review).
  const phone = initPhoneUi()

  const bridge = await waitForEvenAppBridge()
  const view = new Renderer(bridge)

  let state: State = { name: 'locating' }
  let busy = false

  function errMsg(e: unknown): string {
    const m = e instanceof Error ? e.message : String(e)
    return clamp(m, 120)
  }

  // ----- Uebergaenge -------------------------------------------------------

  async function loadStops(): Promise<void> {
    if (busy) return
    busy = true
    try {
      state = { name: 'locating' }
      phone.setStatus(t('locating'))
      await view.text(TITLE, t('locating'))
      const geo = await getLocation(bridge)

      phone.setStatus(t('searchingStops'))
      await view.text(TITLE, t('searchingStops'))
      const stops = await nearbyStops(geo.lat, geo.lon, 20)

      if (stops.length === 0) {
        phone.setStatus(t('noStops'))
        state = { name: 'error', message: t('noStops') }
        await renderError()
        return
      }
      phone.setStops(stops, geo)
      state = { name: 'stops', geo, stops }
      await renderStops()
    } catch (e) {
      phone.setStatus(t('phLoadError', { msg: errMsg(e) }))
      state = { name: 'error', message: errMsg(e) }
      await renderError()
    } finally {
      busy = false
    }
  }

  async function openDepartures(stop: Stop): Promise<void> {
    if (busy || state.name !== 'stops') return
    const { geo, stops } = state
    busy = true
    try {
      await view.text(TITLE, `${stop.name}\n${t('loadingDepartures')}`)
      const deps = await departures(stop, 20)
      const rows = departureRowList(deps, 20)
      state = { name: 'departures', geo, stops, stop, deps, rows }
      await renderDepartures()
    } catch (e) {
      state = { name: 'error', message: errMsg(e) }
      await renderError()
    } finally {
      busy = false
    }
  }

  async function openTrip(dep: Departure): Promise<void> {
    if (busy || state.name !== 'departures' || !dep.tripId) return
    const from = state
    busy = true
    try {
      await view.text(TITLE, `${dep.line} ${dep.direction ?? ''}\n${t('loadingTrip')}`)
      const { stops } = await tripStops(dep.tripId)

      // Verlauf ab dem Einstieg (zeitlich passender Halt) beginnen, damit die
      // Fahrt ab "hier" gezeigt wird und in die Liste passt.
      const depMs = new Date(dep.when ?? dep.scheduledWhen ?? 0).getTime()
      let start = 0
      if (depMs) {
        const idx = stops.findIndex(
          (s) => s.when && Math.abs(new Date(s.when).getTime() - depMs) < 120_000,
        )
        if (idx > 0) start = idx
      }
      const onward = stops.slice(start)
      state = { name: 'trip', from, dep, stops: onward.length ? onward : stops }
      await renderTrip()
    } catch (e) {
      state = { name: 'error', message: errMsg(e) }
      await renderError()
    } finally {
      busy = false
    }
  }

  // ----- Rendering der aktuellen State ------------------------------------

  async function renderStops(): Promise<void> {
    if (state.name !== 'stops') return
    const src = state.geo.source === 'ip' ? t('approx') : ''
    const title = `${TITLE}  ${state.stops.length}${src}`
    // Zeile 0 = No-Op-Kopfzeile (Firmware-Auto-Select), Stops ab Zeile 1.
    const items = [t('stopHeader'), ...state.stops.map(stopLabel)]
    await view.list(title, items)
  }

  async function renderDepartures(): Promise<void> {
    if (state.name !== 'departures') return
    const title = clamp(state.stop.name, 40)
    const items = state.rows.map((r) => r.label)
    await view.list(title, items.length ? items : [t('noDepartures')])
  }

  async function renderTrip(): Promise<void> {
    if (state.name !== 'trip') return
    const d = state.dep
    const title = clamp(`${d.line} ${d.direction ?? ''}`.trim(), 60)
    // Zeile 0 = No-Op-Kopfzeile (Firmware-Auto-Select), Halte ab Zeile 1.
    const stops = state.stops.map(tripStopLabel)
    const items = [t('tripHeader'), ...(stops.length ? stops : [t('noTrip')])]
    await view.list(title, items)
  }

  async function renderError(): Promise<void> {
    if (state.name !== 'error') return
    await view.text(t('errorTitle'), `${state.message}\n\n${t('errorHint')}`)
  }

  async function rerender(): Promise<void> {
    switch (state.name) {
      case 'stops':
        return renderStops()
      case 'departures':
        return renderDepartures()
      case 'trip':
        return renderTrip()
      case 'error':
        return renderError()
      case 'locating':
        return view.text(TITLE, t('locating'))
    }
  }

  // ----- Eingaben ----------------------------------------------------------

  function onListSelect(index: number): void {
    if (busy) return
    if (state.name === 'stops') {
      // Zeile 0 ist die Kopfzeile -> echte Stops ab Index 1
      const stop = state.stops[index - 1]
      if (stop) void openDepartures(stop)
    } else if (state.name === 'departures') {
      const row = state.rows[index]
      if (row && row.departure) void openTrip(row.departure)
      // Datums-Trennzeile (row.departure === null): ignorieren
    }
    // trip: Tipp auf einen Halt hat keine weitere Aktion
  }

  function onSingleClick(): void {
    // Klicks auf Text-Container kommen als sysEvent (nicht textEvent).
    // Auf der Fehlerseite: erneut versuchen.
    if (busy) return
    if (state.name === 'error') void loadStops()
  }

  function onDoubleClick(): void {
    if (busy) return // waehrend Ladevorgang keinen harten Abbruch
    if (state.name === 'trip') {
      // zurueck zur Abfahrtsliste (ohne neu zu laden)
      state = state.from
      void renderDepartures()
    } else if (state.name === 'departures') {
      // zurueck zur Haltestellen-Liste (ohne neu zu laden)
      state = { name: 'stops', geo: state.geo, stops: state.stops }
      void renderStops()
    } else {
      // Haltestellen-Liste / Fehler / locating: Plugin beenden (Dialog)
      bridge.shutDownPageContainer(1)
    }
  }

  const unsubscribe = bridge.onEvenHubEvent((event: any) => {
    if (event.listEvent) {
      onListSelect(event.listEvent.currentSelectItemIndex ?? 0)
      return
    }
    if (event.sysEvent) {
      switch (event.sysEvent.eventType ?? 0) {
        case OsEventTypeList.CLICK_EVENT:
          onSingleClick()
          break
        case OsEventTypeList.DOUBLE_CLICK_EVENT:
          onDoubleClick()
          break
        case OsEventTypeList.FOREGROUND_ENTER_EVENT:
          void rerender()
          break
        case OsEventTypeList.ABNORMAL_EXIT_EVENT:
        case OsEventTypeList.SYSTEM_EXIT_EVENT:
          unsubscribe()
          break
      }
    }
  })

  window.addEventListener('beforeunload', () => unsubscribe())

  // Los geht's.
  await loadStops()
}

main().catch((err) => console.error('abfahrtszeit-g2:', err))
