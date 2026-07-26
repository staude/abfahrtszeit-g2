// abfahrtszeit-g2 — Abfahrten des OePNV rund um den eigenen Standort.
//
// Ablauf:  Standort ermitteln -> Haltestellen in der Naehe (Liste)
//          -> Haltestelle antippen -> Abfahrten (Liste).
//
// Bedienung:
//   Swipe hoch/runter  Liste scrollen (Firmware, kein Event)
//   Einfachtipp        Haltestelle waehlen / Abfahrten aktualisieren
//   Doppeltipp         zurueck; auf der Haltestellen-Liste: beenden

import {
  waitForEvenAppBridge,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { getLocation, type GeoResult } from './location'
import { nearbyStops, departures, type Stop, type Departure } from './transit'
import { departureLabel, stopLabel, clamp } from './format'
import { Renderer } from './render'

const TITLE = 'ABFAHRTEN'

type State =
  | { name: 'locating' }
  | { name: 'stops'; geo: GeoResult; stops: Stop[] }
  | { name: 'departures'; geo: GeoResult; stops: Stop[]; stop: Stop; deps: Departure[] }
  | { name: 'error'; message: string }

async function main(): Promise<void> {
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
      await view.text(TITLE, 'Standort wird ermittelt ...')
      const geo = await getLocation(bridge)

      await view.text(TITLE, 'Suche Haltestellen ...')
      const stops = await nearbyStops(geo.lat, geo.lon, 20)

      if (stops.length === 0) {
        state = { name: 'error', message: 'Keine Haltestellen in der Naehe gefunden.' }
        await renderError()
        return
      }
      state = { name: 'stops', geo, stops }
      await renderStops()
    } catch (e) {
      state = { name: 'error', message: errMsg(e) }
      await renderError()
    } finally {
      busy = false
    }
  }

  async function openDepartures(stop: Stop): Promise<void> {
    if (busy || state.name === 'locating' || state.name === 'error') return
    const base = state // stops oder departures
    busy = true
    try {
      await view.text(TITLE, `${stop.name}\nLade Abfahrten ...`)
      const deps = await departures(stop, 20)
      state = {
        name: 'departures',
        geo: base.geo,
        stops: base.stops,
        stop,
        deps,
      }
      await renderDepartures()
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
    const src = state.geo.source === 'ip' ? ' (ca.)' : ''
    const title = `${TITLE}  ${state.stops.length}${src}`
    await view.list(title, state.stops.map(stopLabel))
  }

  async function renderDepartures(): Promise<void> {
    if (state.name !== 'departures') return
    const title = clamp(state.stop.name, 40)
    const items = state.deps.map(departureLabel)
    await view.list(title, items.length ? items : ['Keine Abfahrten'])
  }

  async function renderError(): Promise<void> {
    if (state.name !== 'error') return
    await view.text(
      'FEHLER',
      `${state.message}\n\nTipp: erneut versuchen\nDoppeltipp: beenden`,
    )
  }

  async function rerender(): Promise<void> {
    switch (state.name) {
      case 'stops':
        return renderStops()
      case 'departures':
        return renderDepartures()
      case 'error':
        return renderError()
      case 'locating':
        return view.text(TITLE, 'Standort wird ermittelt ...')
    }
  }

  // ----- Eingaben ----------------------------------------------------------

  function onListSelect(index: number): void {
    if (busy) return
    if (state.name === 'stops') {
      const stop = state.stops[index]
      if (stop) void openDepartures(stop)
    } else if (state.name === 'departures') {
      // Einfachtipp aktualisiert die aktuelle Haltestelle
      void openDepartures(state.stop)
    }
  }

  function onSingleClick(): void {
    // Klicks auf Text-Container kommen als sysEvent (nicht textEvent).
    // Auf der Fehlerseite: erneut versuchen.
    if (busy) return
    if (state.name === 'error') void loadStops()
  }

  function onDoubleClick(): void {
    if (busy) {
      // Waehrend eines Ladevorgangs keinen harten Abbruch; ignorieren.
      return
    }
    if (state.name === 'departures') {
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
