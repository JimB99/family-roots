import { useEffect, useRef } from 'react'
import { createChart } from 'family-chart'
import { useNavigate } from 'react-router-dom'
import { pickMainPersonId, toFamilyChartData } from '../lib/tree'
import type { Person, Relationship } from '../types'

interface FamilyTreeProps {
  people: Person[]
  relationships: Relationship[]
  slug: string
}

export function FamilyTree({ people, relationships, slug }: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = containerRef.current
    if (!el || people.length === 0) return

    el.innerHTML = ''
    const data = toFamilyChartData(people, relationships)
    const mainId = pickMainPersonId(people, relationships)

    const chart = createChart(el, data)
    chart
      .setCardHtml()
      .setCardDisplay([['first name', 'last name'], ['lifespan']])
      .setCardImageField('avatar')
    chart.setTransitionTime(300).setOrientationVertical()

    if (mainId) chart.updateMainId(mainId)
    chart.updateTree({ initial: true, tree_position: 'fit' })

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const card = target.closest('[data-id]') as HTMLElement | null
      const id = card?.getAttribute('data-id')
      if (id) navigate(`/families/${slug}/person/${id}`)
    }

    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('click', onClick)
      el.innerHTML = ''
    }
  }, [people, relationships, slug, navigate])

  if (people.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-stone-500">
        No people in this family yet. Sign in and add someone from Admin.
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-[calc(100vh-4rem)] overflow-hidden" />
}
