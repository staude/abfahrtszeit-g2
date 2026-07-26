// Rendering auf die Brille. Kapselt den einmaligen createStartUpPageContainer
// und alle folgenden rebuildPageContainer (Listen lassen sich nicht in-place
// aendern -> jeder Seitenwechsel ist ein Rebuild).
//
// Zwei Layouts:
//   text(): ein Vollbild-Text-Container (Laden/Fehler/Meldung), faengt Events.
//   list(): Titelzeile oben (ohne Event) + Listen-Container darunter (Event).

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

  /** Titelzeile + scrollbare Liste. Leere Liste -> Platzhalter-Item. */
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

    await this.render({
      containerTotalNum: 2,
      textObject: [titleC],
      listObject: [list],
    })
  }

  private async render(spec: PageSpec): Promise<void> {
    if (!this.started) {
      const res = await this.bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer(spec),
      )
      if (res !== 0) console.error('createStartUpPageContainer failed:', res)
      this.started = true
    } else {
      await this.bridge.rebuildPageContainer(new RebuildPageContainer(spec))
    }
  }
}
