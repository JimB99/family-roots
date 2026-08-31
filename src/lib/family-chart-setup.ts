import type { Chart, Data } from 'family-chart'
import { createChart } from 'family-chart'
import type { NavigateFunction } from 'react-router-dom'
import {
  attachCardDragHandlers,
  attachLayoutOffsets,
  buildPersonOffsets,
  persistPersonOffset,
  type PersonOffsets,
} from './tree-layout'
import {
  convertParentChildToMarriage,
  getMarriageCandidateFromLink,
} from './tree-link-actions'
import { syncChartToFirestore } from './tree-sync'
import { toFamilyChartData } from './tree'
import type { Person, Relationship } from '../types'

export interface ChartSetupOptions {
  el: HTMLDivElement
  people: Person[]
  relationships: Relationship[]
  rootPersonId: string | null
  slug: string
  familyId: string
  editMode: boolean
  isEditor: boolean
  userId: string | null
  navigate: NavigateFunction
  onReload: () => void
  onSelectPerson?: (personId: string) => void
}

export type RelFilter = 'all' | 'child' | 'spouse' | 'parent' | 'sibling'

interface LinkDatum {
  spouse?: boolean
  curve?: boolean
  source?: unknown
  target?: unknown
  d?: Array<[number, number]>
}

interface ChartEnhancementState {
  offsets: PersonOffsets
  relFilter: RelFilter
  dragCleanup: (() => void) | null
  linkHandlerCleanup: (() => void) | null
}

const enhancementByChart = new WeakMap<Chart, ChartEnhancementState>()

export const CARD_X_SPACING = 340
export const CARD_Y_SPACING = 160

export function prepareChartContainer(el: HTMLDivElement): void {
  el.className = 'family-tree-canvas f3 f3-cont h-full w-full'
  el.style.height = '100%'
  el.style.minHeight = '100%'
}

function getEnhancementState(chart: Chart, people: Person[]): ChartEnhancementState {
  const existing = enhancementByChart.get(chart)
  if (existing) return existing
  const state: ChartEnhancementState = {
    offsets: buildPersonOffsets(people),
    relFilter: 'all',
    dragCleanup: null,
    linkHandlerCleanup: null,
  }
  enhancementByChart.set(chart, state)
  return state
}

function relFilterToCanAdd(filter: RelFilter) {
  switch (filter) {
    case 'child':
    case 'sibling':
      return { parent: false, spouse: false, child: true }
    case 'spouse':
      return { parent: false, spouse: true, child: false }
    case 'parent':
      return { parent: true, spouse: false, child: false }
    default:
      return {}
  }
}

export function renderMarriageSymbols(container: HTMLElement): void {
  const svg = container.querySelector('svg.main_svg')
  if (!svg) return

  const view = svg.querySelector('.view')
  if (!view) return

  let group = view.querySelector('#marriage-symbols') as SVGGElement | null
  if (!group) {
    group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('id', 'marriage-symbols')
    group.setAttribute('pointer-events', 'none')
    view.appendChild(group)
  }
  group.innerHTML = ''

  container.querySelectorAll('path.link-spouse').forEach((path) => {
    const datum = (path as SVGPathElement & { __data__?: LinkDatum }).__data__
    if (!datum?.d || datum.d.length < 2) return

    const [start, end] = [datum.d[0], datum.d[datum.d.length - 1]]
    const midX = (start[0] + end[0]) / 2
    const midY = (start[1] + end[1]) / 2

    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    symbol.setAttribute('transform', `translate(${midX - 7}, ${midY - 5})`)

    const leftRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    leftRing.setAttribute('cx', '5')
    leftRing.setAttribute('cy', '5')
    leftRing.setAttribute('r', '4')
    leftRing.setAttribute('fill', 'none')
    leftRing.setAttribute('stroke', '#b45309')
    leftRing.setAttribute('stroke-width', '1.6')

    const rightRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    rightRing.setAttribute('cx', '9')
    rightRing.setAttribute('cy', '5')
    rightRing.setAttribute('r', '4')
    rightRing.setAttribute('fill', 'none')
    rightRing.setAttribute('stroke', '#b45309')
    rightRing.setAttribute('stroke-width', '1.6')

    symbol.appendChild(leftRing)
    symbol.appendChild(rightRing)
    group.appendChild(symbol)
  })
}

export function applyLinkStyles(container: HTMLElement, editMode: boolean): void {
  const paths = container.querySelectorAll('path.link')
  paths.forEach((path) => {
    const datum = (path as SVGPathElement & { __data__?: LinkDatum }).__data__
    if (!datum) return
    path.classList.toggle('link-spouse', Boolean(datum.spouse))
    path.classList.toggle('link-parent', Boolean(datum.curve && !datum.spouse))
    path.classList.toggle('link-editable', editMode && !datum.spouse)
  })
}

function tagCards(container: HTMLElement): void {
  container.querySelectorAll('.card_cont').forEach((node) => {
    const datum = (node as HTMLElement & { __data__?: { data?: { id?: string; _new_rel_data?: unknown } } })
      .__data__
    const id = datum?.data?.id
    if (!id) return
    node.setAttribute('data-id', id)
    if (datum?.data?._new_rel_data) {
      node.setAttribute('data-ghost', '1')
    } else {
      node.removeAttribute('data-ghost')
    }
  })
}

function attachLinkClickHandlers(
  container: HTMLElement,
  familyId: string,
  relationships: Relationship[],
  people: Person[],
  editMode: boolean,
  onReload: () => void,
): () => void {
  if (!editMode) return () => {}

  const peopleById = new Map(people.map((p) => [p.id, p]))

  const onClick = (event: Event) => {
    const path = (event.target as SVGElement).closest('path.link-editable')
    if (!path) return
    event.stopPropagation()

    const datum = (path as SVGPathElement & { __data__?: LinkDatum }).__data__
    if (!datum) return

    const candidate = getMarriageCandidateFromLink(datum, peopleById)
    if (!candidate) return

    void (async () => {
      const changed = await convertParentChildToMarriage(
        candidate,
        familyId,
        relationships,
        peopleById,
      )
      if (changed) onReload()
    })()
  }

  const svg = container.querySelector('svg.main_svg')
  svg?.addEventListener('click', onClick)
  return () => svg?.removeEventListener('click', onClick)
}

function refreshEnhancements(
  chart: Chart,
  el: HTMLDivElement,
  options: ChartSetupOptions,
): void {
  const state = getEnhancementState(chart, options.people)
  state.dragCleanup?.()
  state.linkHandlerCleanup?.()

  applyLinkStyles(el, options.editMode && options.isEditor)
  renderMarriageSymbols(el)
  tagCards(el)

  if (options.editMode && options.isEditor) {
    state.dragCleanup = attachCardDragHandlers(
      el,
      chart,
      state.offsets,
      options.people,
      true,
      (personId, x, y) => {
        const person = options.people.find((p) => p.id === personId)
        if (!person || !options.userId) return
        void persistPersonOffset(person, x, y, options.userId).then(() => options.onReload())
      },
    )
    state.linkHandlerCleanup = attachLinkClickHandlers(
      el,
      options.familyId,
      options.relationships,
      options.people,
      true,
      options.onReload,
    )
  } else {
    state.dragCleanup = null
    state.linkHandlerCleanup = null
  }
}

export function setupFamilyChart(
  options: ChartSetupOptions,
): { chart: Chart; card: ReturnType<Chart['setCardHtml']> } {
  const { el, people, relationships, rootPersonId } = options
  const data = toFamilyChartData(people, relationships)
  const chart = createChart(el, data)
  const state = getEnhancementState(chart, people)

  const card = chart
    .setCardHtml()
    .setCardDisplay([['first name', 'last name'], ['lifespan']])
    .setCardImageField('avatar')
    .setCardDim({ w: 180, h: 86, img_w: 48, img_h: 48, img_x: 8, img_y: 8 })

  chart
    .setTransitionTime(200)
    .setOrientationVertical()
    .setDuplicateBranchToggle(true)
    .setCardXSpacing(CARD_X_SPACING)
    .setCardYSpacing(CARD_Y_SPACING)

  if (rootPersonId) chart.updateMainId(rootPersonId)

  attachLayoutOffsets(chart, state.offsets)

  chart.setAfterUpdate(() => {
    refreshEnhancements(chart, el, options)
  })

  return { chart, card }
}

export function updateChartData(chart: Chart, people: Person[], relationships: Relationship[]): void {
  const state = getEnhancementState(chart, people)
  state.offsets = buildPersonOffsets(people)
  chart.updateData(toFamilyChartData(people, relationships))
}

export function configureEditMode(
  chart: Chart,
  card: ReturnType<Chart['setCardHtml']>,
  options: ChartSetupOptions,
): void {
  const { el, familyId, editMode, isEditor, userId, navigate, slug, onReload, onSelectPerson } =
    options
  const editing = editMode && isEditor && userId
  const state = getEnhancementState(chart, options.people)

  if (!editing) {
    if (chart.editTreeInstance) {
      chart.editTreeInstance.destroy()
      chart.editTreeInstance = null
    }
    card.setOnCardClick((_e: MouseEvent, d: { data: { id: string } }) => {
      navigate(`/families/${slug}/person/${d.data.id}`)
    })
    refreshEnhancements(chart, el, options)
    return
  }

  const editTree = chart.editTreeInstance ?? chart.editTree()
  editTree
    .setEdit()
    .setFields(['first name', 'last name', 'birthday', 'death', 'avatar'])
    .setAddRelLabels({
      father: '↑ Parent',
      mother: '↑ Parent',
      spouse: '↔ Spouse',
      son: '↓ Child',
      daughter: '↓ Child',
    })
    .setCanAdd(() => relFilterToCanAdd(state.relFilter))
    .setPostSubmit(() => {
      void (async () => {
        const exported = editTree.exportData()
        if (!Array.isArray(exported)) return
        await syncChartToFirestore(exported as Data, familyId, userId)
        onReload()
      })()
    })

  card.setOnCardClick((_e: MouseEvent, d: { data: { id: string; _new_rel_data?: unknown; to_add?: boolean } }) => {
    const datum = d.data
    if (datum._new_rel_data || datum.to_add) {
      const fullDatum = chart.store.getDatum(datum.id)
      if (fullDatum) editTree.open(fullDatum)
      return
    }

    onSelectPerson?.(datum.id)
    if (editTree.isAddingRelative()) {
      editTree.addRelativeInstance.onCancel?.()
    }
    const fullDatum = chart.store.getDatum(datum.id)
    if (fullDatum) editTree.addRelative(fullDatum)
  })

  card.setOnCardUpdate(function (this: HTMLElement, d: { data: { id: string; _new_rel_data?: unknown } }) {
    this.setAttribute('data-id', d.data.id)
    if (d.data._new_rel_data) this.setAttribute('data-ghost', '1')
    else this.removeAttribute('data-ghost')
  })

  refreshEnhancements(chart, el, options)
}

export function fitChart(chart: Chart, initial = true): void {
  chart.updateTree({
    initial,
    tree_position: initial ? 'fit' : 'inherit',
    transition_time: initial ? 200 : 0,
  })
}

export function expandChart(chart: Chart): void {
  const mainId = chart.store.state.main_id
  const depths = mainId ? chart.getMaxDepth(mainId) : { ancestry: 20, progeny: 20 }
  chart.setAncestryDepth(depths.ancestry + 1).setProgenyDepth(depths.progeny + 1)
  chart.updateTree({ initial: false, tree_position: 'fit' })
}

export function collapseChart(chart: Chart, depth = 1): void {
  chart.setAncestryDepth(depth).setProgenyDepth(depth)
  chart.updateTree({ initial: false, tree_position: 'fit' })
}

function startConnectMode(chart: Chart, personId: string, relFilter: RelFilter): void {
  const editTree = chart.editTreeInstance
  if (!editTree) return
  const state = enhancementByChart.get(chart)
  if (state) state.relFilter = relFilter

  const datum = chart.store.getDatum(personId)
  if (!datum) return
  if (editTree.isAddingRelative()) editTree.addRelativeInstance.onCancel?.()
  editTree.addRelative(datum)
}

export function startAddChild(chart: Chart, personId: string): void {
  startConnectMode(chart, personId, 'child')
}

export function startAddSpouse(chart: Chart, personId: string): void {
  startConnectMode(chart, personId, 'spouse')
}

export function startAddParent(chart: Chart, personId: string): void {
  startConnectMode(chart, personId, 'parent')
}

export function startAddSibling(chart: Chart, personId: string): void {
  startConnectMode(chart, personId, 'sibling')
}

export function startConnectModeForPerson(chart: Chart, personId: string): void {
  startConnectMode(chart, personId, 'all')
}
