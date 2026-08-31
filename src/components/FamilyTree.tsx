import { useEffect, useRef } from 'react'
import type { Chart, Data } from 'family-chart'
import { createChart } from 'family-chart'
import { useNavigate } from 'react-router-dom'
import { syncChartToFirestore } from '../lib/tree-sync'
import { pickMainPersonId, toFamilyChartData } from '../lib/tree'
import type { Person, Relationship } from '../types'

interface FamilyTreeProps {
  people: Person[]
  relationships: Relationship[]
  slug: string
  familyId: string
  editMode: boolean
  isEditor: boolean
  userId: string | null
  onReload: () => void
  onSelectPerson?: (personId: string) => void
}

export function FamilyTree({
  people,
  relationships,
  slug,
  familyId,
  editMode,
  isEditor,
  userId,
  onReload,
  onSelectPerson,
}: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = containerRef.current
    if (!el || people.length === 0) return

    el.innerHTML = ''
    const data = toFamilyChartData(people, relationships)
    const mainId = pickMainPersonId(people, relationships)

    const chart = createChart(el, data)
    chartRef.current = chart

    const card = chart
      .setCardHtml()
      .setCardDisplay([['first name', 'last name'], ['lifespan']])
      .setCardImageField('avatar')

    chart.setTransitionTime(300).setOrientationVertical()

    if (mainId) chart.updateMainId(mainId)

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

      if (onSelectPerson) {
        card.setOnCardClick((_e: MouseEvent, d: { data: { id: string } }) => {
          onSelectPerson(d.data.id)
        })
      } else {
        editTree.setCardClickOpen(card)
      }
    } else {
      card.setOnCardClick((_e: MouseEvent, d: { data: { id: string } }) => {
        navigate(`/families/${slug}/person/${d.data.id}`)
      })
    }

    chart.updateTree({ initial: true, tree_position: 'fit' })

    return () => {
      chartRef.current = null
      el.innerHTML = ''
    }
  }, [people, relationships, slug, familyId, editMode, isEditor, userId, navigate, onReload, onSelectPerson])

  if (people.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-stone-500">
        No people in this family yet. Sign in and add someone from Manage.
      </div>
    )
  }

  return <div ref={containerRef} className="w-full flex-1 min-h-[calc(100vh-8rem)] overflow-hidden" />
}
