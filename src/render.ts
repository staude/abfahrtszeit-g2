// Rendering auf die Brille. Kapselt den einmaligen createStartUpPageContainer
// und alle folgenden rebuildPageContainer (Listen lassen sich nicht in-place
// aendern -> jeder Seitenwechsel ist ein Rebuild).
//
// Zwei Layouts:
//   text(): ein Vollbild-Text-Container (Laden/Fehler/Meldung), faengt Events.
//   list(): Titelzeile oben (ohne Event) + Listen-Container darunter (Event).
//
// Wichtig (auf Hardware erarbeitet, vgl. dorfkino-g2):
//   - Nach jedem Listenaufbau feuert die Firmware einen AUTO-SELECT auf
//     Index 0. Zeile 0 jeder Liste muss daher beim Aufrufer eine No-Op-
//     Kopfzeile sein, echte Eintraege ab Index 1.
//   - rebuild/startup koennen fehlschlagen (oversize, Dev-Reload). Ergebnis
//     pruefen und Fehler sichtbar machen, nie stumm schwarz bleiben.

import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  RebuildPageContainer,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import { clamp } from './format'

type PageSpec = {
  containerTotalNum: number
  textObject?: TextContainerProperty[]
  listObject?: ListContainerProperty[]
}

export class Renderer {
  private started = false

  constructor(private bridge: any) {}

  /** Vollbild-Textseite (Titel + optionaler Rumpf). */
  async text(title: string, body = ''): Promise<void> {
    const content = body ? `${title}\n\n${body}` : title
    const main = new TextContainerProperty({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      height: 288,
      borderWidth: 0,
      borderColor: 5,
      paddingLength: 6,
      containerID: 1,
      containerName: 'main',
      content: clamp(content, 1000),
      isEventCapture: 1,
    })
    await this.render({ containerTotalNum: 1, textObject: [main] })
  }

  /** Titelzeile + scrollbare Liste. Leere Liste -> Platzhalter-Item.
   *  Zeile 0 sollte beim Aufrufer eine No-Op-Kopfzeile sein (Auto-Select). */
  async list(title: string, items: string[]): Promise<void> {
    const safe = items.slice(0, 20).map((s) => clamp(s, 64))
    const names = safe.length ? safe : ['(keine)']

    const titleC = new TextContainerProperty({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      height: 44,
      borderWidth: 0,
      borderColor: 5,
      paddingLength: 6,
      containerID: 1,
      containerName: 'title',
      content: clamp(title, 200),
      isEventCapture: 0,
    })

    const list = new ListContainerProperty({
      xPosition: 0,
      yPosition: 44,
      width: 576,
      height: 244,
      borderWidth: 0,
      borderColor: 5,
      borderRadius: 0,
      paddingLength: 4,
      containerID: 2,
      containerName: 'list',
      isEventCapture: 1,
      itemContainer: new ListItemContainerProperty({
        itemCount: names.length,
        itemWidth: 0,
        isItemSelectBorderEn: 1,
        itemName: names,
      }),
    })

    const ok = await this.render({
      containerTotalNum: 2,
      textObject: [titleC],
      listObject: [list],
    })
    if (!ok) {
      // Nie stumm schwarz bleiben: Fehler sichtbar machen.
      await this.text(
        'LISTEN-FEHLER',
        `Anzeige fehlgeschlagen (${names.length} Zeilen)\n\nDoppeltipp: beenden`,
      )
    }
  }

  /** true = Seite steht; false = Host hat den Aufbau abgelehnt (oversize o. ae.). */
  private async render(spec: PageSpec): Promise<boolean> {
    if (!this.started) {
      const res = await this.bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer(spec),
      )
      this.started = true
      // Bei einem Dev-Reload haelt der Host die Startseite noch -> ein
      // zweites createStartUpPageContainer wird als "invalid" (1) abgelehnt.
      // Dann auf rebuild zurueckfallen, statt leer zu bleiben.
      if (res !== 0) {
        console.warn('createStartUpPageContainer failed:', res, '- fallback to rebuild')
        const ok = await this.bridge.rebuildPageContainer(new RebuildPageContainer(spec))
        return ok !== false
      }
      return true
    }
    const ok = await this.bridge.rebuildPageContainer(new RebuildPageContainer(spec))
    if (ok === false) console.error('rebuildPageContainer failed (oversize?)')
    return ok !== false
  }
}
