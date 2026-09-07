import { applyBranchContractLayout } from './branch-contract-layout'
import { parentGeneration, type FamilyStructure } from './family-structure'
import type { LayoutNode, PositionedNode } from './layout-model'
import { meanOrNull } from './layout-order'
import { PERSON_H, ROW_GAP } from './layout-spacing'

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

export function layoutComponentWithContract(
  componentId: string,
  persons: LayoutNode[],
  unions: LayoutNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): { id: string; nodes: PositionedNode[]; width: number; height: number } {
  const personHeight = persons[0]?.height ?? PERSON_H

  if (persons.length === 0 && unions.length === 0) {
    return { id: componentId, nodes: [], width: 0, height: 0 }
  }

  const positioned: PositionedNode[] = persons.map((person) => ({
    ...person,
    x: 0,
    y: rowY(generations.get(person.id) ?? 0, personHeight),
  }))

  const laidOutPersons = applyBranchContractLayout(positioned, structure, generations)
  const byId = new Map(laidOutPersons.map((node) => [node.id, node]))

  const withUnions: PositionedNode[] = [...laidOutPersons]
  for (const union of unions) {
    const parents = (structure.unionParents.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const children = (structure.unionChildren.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const parentCenters = parents.map((node) => node.x + node.width / 2)
    const childCenters = children.map((node) => node.x + node.width / 2)
    const center = meanOrNull(parentCenters) ?? meanOrNull(childCenters) ?? 0
    const parentGen = parentGeneration(union.id, structure, generations)
    const y = rowY(parentGen, personHeight) + personHeight + (ROW_GAP - union.height) / 2
    withUnions.push({ ...union, x: center - union.width / 2, y })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of withUnions) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 0
    maxY = 0
  }

  const normalized = withUnions.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY }))
  return {
    id: componentId,
    nodes: normalized,
    width: maxX - minX,
    height: maxY - minY,
  }
}
