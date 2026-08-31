import type { Chart } from 'family-chart'
import { savePerson } from './firestore'
import type { Person } from '../types'

export type PersonOffsets = Map<string, { x: number; y: number }>

export function buildPersonOffsets(people: Person[]): PersonOffsets {
  const offsets: PersonOffsets = new Map()
  for (const person of people) {
    const x = person.treeOffsetX ?? 0
    const y = person.treeOffsetY ?? 0
    if (x !== 0 || y !== 0) offsets.set(person.id, { x, y })
  }
  return offsets
}

export function attachLayoutOffsets(chart: Chart, offsets: PersonOffsets): void {
  chart.setBeforeUpdate(() => {
    const tree = chart.store.getTree()
    if (!tree?.data) return
    for (const node of tree.data) {
      const id = node.data?.id
      if (!id) continue
      const offset = offsets.get(id)
      if (!offset) continue
      node.x = (node.x ?? 0) + offset.x
      node.y = (node.y ?? 0) + offset.y
    }
  })
}

export function attachCardDragHandlers(
  container: HTMLElement,
  chart: Chart,
  offsets: PersonOffsets,
  people: Person[],
  editMode: boolean,
  onPersistOffset: (personId: string, x: number, y: number) => void,
): () => void {
  if (!editMode) return () => {}

  const peopleById = new Map(people.map((p) => [p.id, p]))
  let dragState: {
    personId: string
    startX: number
    startY: number
    originX: number
    originY: number
  } | null = null

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement
    const card = target.closest('.card_cont') as HTMLElement | null
    if (!card || target.closest('.f3-toggle-div') || target.closest('.card_edit')) return

    const cardInner = card.querySelector('[data-rel-type]')
    if (cardInner) return

    const id = card.getAttribute('data-id')
    if (!id || !peopleById.has(id)) return

    event.preventDefault()
    event.stopPropagation()
    card.setPointerCapture(event.pointerId)

    const current = offsets.get(id) ?? { x: 0, y: 0 }
    dragState = {
      personId: id,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
    }
    card.classList.add('card-dragging')
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragState) return
    const scale = getChartScale(container)
    const dx = (event.clientX - dragState.startX) / scale
    const dy = (event.clientY - dragState.startY) / scale
    offsets.set(dragState.personId, {
      x: dragState.originX + dx,
      y: dragState.originY + dy,
    })
    chart.updateTree({ initial: false, tree_position: 'inherit', transition_time: 0 })
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!dragState) return
    const card = container.querySelector(`.card_cont[data-id="${dragState.personId}"]`)
    card?.classList.remove('card-dragging')
    try {
      card?.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    const offset = offsets.get(dragState.personId) ?? { x: 0, y: 0 }
    onPersistOffset(dragState.personId, offset.x, offset.y)
    dragState = null
  }

  container.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  return () => {
    container.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    dragState = null
  }
}

function getChartScale(container: HTMLElement): number {
  const view = container.querySelector('svg.main_svg .view') as SVGGElement | null
  if (!view) return 1
  const transform = view.getAttribute('transform') ?? ''
  const match = transform.match(/scale\(([\d.]+)\)/)
  return match ? Number.parseFloat(match[1]) : 1
}

export async function persistPersonOffset(
  person: Person,
  offsetX: number,
  offsetY: number,
  userId: string | null,
): Promise<void> {
  await savePerson(
    person.id,
    {
      familyId: person.familyId,
      givenNames: person.givenNames,
      familyName: person.familyName,
      maidenName: person.maidenName,
      gender: person.gender,
      birth: person.birth,
      death: person.death,
      birthPlace: person.birthPlace,
      deathPlace: person.deathPlace,
      isLiving: person.isLiving,
      photoBase64: person.photoBase64,
      notes: person.notes,
      importKey: person.importKey,
      treeOffsetX: offsetX === 0 ? null : offsetX,
      treeOffsetY: offsetY === 0 ? null : offsetY,
    },
    userId,
  )
}
