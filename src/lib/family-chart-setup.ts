import type { Chart, Data } from 'family-chart'
import { createChart } from 'family-chart'
import type { NavigateFunction } from 'react-router-dom'
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
  onViewPerson?: (personId: string) => void
}

export function prepareChartContainer(el: HTMLDivElement, heightPx: number): void {
  el.innerHTML = ''
  el.className = 'family-tree-canvas f3 f3-cont h-full w-full'
  el.style.height = `${Math.max(heightPx, 320)}px`
  el.style.minHeight = `${Math.max(heightPx, 320)}px`
}

export function setupFamilyChart({
  el,
  people,
  relationships,
  rootPersonId,
  slug,
  familyId,
  editMode,
  isEditor,
  userId,
  navigate,
  onReload,
  onViewPerson,
}: ChartSetupOptions): Chart {
  const data = toFamilyChartData(people, relationships)
  const chart = createChart(el, data)

  const card = chart
    .setCardHtml()
    .setCardDisplay([['first name', 'last name'], ['lifespan']])
    .setCardImageField('avatar')

  chart
    .setTransitionTime(300)
    .setOrientationVertical()
    .setDuplicateBranchToggle(true)
    .setCardXSpacing(200)
    .setCardYSpacing(110)

  if (rootPersonId) chart.updateMainId(rootPersonId)

  const editing = editMode && isEditor && userId

  if (editing) {
    const editTree = chart.editTree()
    editTree
      .setEdit()
      .setAddRelLabels({
        father: '+ Father',
        mother: '+ Mother',
        spouse: '+ Spouse',
        son: '+ Son',
        daughter: '+ Daughter',
      })
      .setPostSubmit(() => {
        void (async () => {
          const exported = editTree.exportData()
          if (!Array.isArray(exported)) return
          await syncChartToFirestore(exported as Data, familyId, userId)
          onReload()
        })()
      })

    editTree.setCardClickOpen(card)
  } else {
    card.setOnCardClick((_e: MouseEvent, d: { data: { id: string } }) => {
      if (onViewPerson) onViewPerson(d.data.id)
      else navigate(`/families/${slug}/person/${d.data.id}`)
    })
  }

  return chart
}

export function fitChart(chart: Chart, delayMs = 0): void {
  const run = () => chart.updateTree({ initial: true, tree_position: 'fit' })
  if (delayMs > 0) setTimeout(run, delayMs)
  else run()
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
