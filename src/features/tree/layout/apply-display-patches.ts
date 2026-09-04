import type { Person } from '../../../types'
import type { PositionedLayout, PositionedNode } from './layout-model'
import { personNodeDisplayFromPerson } from './person-node-display'

function displayFieldsEqual(node: PositionedNode, person: Person): boolean {
  const display = personNodeDisplayFromPerson(person)
  return (
    node.label === display.label &&
    node.givenNames === display.givenNames &&
    node.familyName === display.familyName &&
    node.subtitle === display.subtitle &&
    node.gender === display.gender &&
    node.birthYear === display.birthYear &&
    node.deathYear === display.deathYear &&
    node.isDeceased === display.isDeceased &&
    node.initials === display.initials
  )
}

/** Overlay draft/display person fields onto a structural layout without re-running ELK. */
export function applyDisplayPatches(
  layout: PositionedLayout,
  peopleById: ReadonlyMap<string, Person>,
): PositionedLayout {
  let changed = false
  const nodes = layout.nodes.map((node) => {
    if (node.kind !== 'person' || !node.personId) return node
    const person = peopleById.get(node.personId)
    if (!person || displayFieldsEqual(node, person)) return node
    changed = true
    return { ...node, ...personNodeDisplayFromPerson(person) }
  })
  return changed ? { ...layout, nodes } : layout
}
