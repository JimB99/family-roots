import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkNode } from 'elkjs/lib/elk-api'
import { packPedigreeRows } from './compact-subtrees.ts'
import { buildElkGraph } from './elk-graph.ts'
import { parentGeneration, type FamilyStructure } from './family-structure.ts'
import type { LayoutNode, PositionedNode } from './layout-model.ts'
import { meanOrNull } from './layout-order.ts'
import type { LayoutQuality } from './layout-options.ts'
import { NODE_GAP, PERSON_H, ROW_GAP } from './layout-spacing.ts'

const elk = new ELK()

export async function runElkLayout(graph: ElkNode): Promise<ElkNode> {
  return elk.layout(graph)
}

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

function elkNode(laidOut: ElkNode, id: string): ElkNode | undefined {
  return laidOut.children?.find((child) => child.id === id)
}

export async function layoutComponentWithElk(
  componentId: string,
  persons: LayoutNode[],
  unions: LayoutNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  quality: LayoutQuality = 'export',
): Promise<{ id: string; nodes: PositionedNode[]; width: number; height: number }> {
  const personHeight = persons[0]?.height ?? PERSON_H
  const personById = new Map(persons.map((person) => [person.id, person]))

  if (persons.length === 0 && unions.length === 0) {
    return { id: componentId, nodes: [], width: 0, height: 0 }
  }

  const built = buildElkGraph(persons, unions, structure, generations, quality)
  const laidOut = built.graph.children?.length ? await runElkLayout(built.graph) : built.graph

  const positioned: PositionedNode[] = []
  for (const [elkId, members] of built.elkMembers) {
    const placed = elkNode(laidOut, elkId)
    const origin = placed?.x ?? 0
    let cursor = origin
    for (const memberId of members) {
      const person = personById.get(memberId)
      if (!person) continue
      const gen = generations.get(person.id) ?? 0
      positioned.push({
        ...person,
        x: cursor,
        y: rowY(gen, personHeight),
      })
      cursor += person.width + NODE_GAP
    }
  }

  const compactedPersons = packPedigreeRows(positioned, structure)
  const byId = new Map(compactedPersons.map((node) => [node.id, node]))

  const withUnions: PositionedNode[] = [...compactedPersons]
  for (const union of unions) {
    const parents = (structure.unionParents.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const children = (structure.unionChildren.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const parentCenters = parents.map((node) => node.x + node.width / 2)
    const childCenters = children.map((node) => node.x + node.width / 2)
    const fallback = elkNode(laidOut, union.id)
    const center =
      meanOrNull(parentCenters) ?? meanOrNull(childCenters) ?? (fallback?.x ?? 0) + union.width / 2
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
