import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api'
import type { LayoutNode } from './layout-model'
import { parentGeneration, type FamilyStructure } from './family-structure'
import { comparePersons, type SortKey } from './layout-order'
import { ELK_THOROUGHNESS, type LayoutQuality } from './layout-options'
import { NODE_GAP, PERSON_H, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export function elkLayoutOptions(quality: LayoutQuality = 'export'): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.partitioning.activate': 'true',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    'elk.spacing.nodeNode': String(SIBLING_GAP),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(ROW_GAP),
    'elk.layered.mergeEdges': 'true',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.thoroughness': ELK_THOROUGHNESS[quality],
    'elk.randomSeed': '1',
    'elk.separateConnectedComponents': 'false',
  }
}

/** @deprecated Use elkLayoutOptions('export') */
export const ELK_LAYOUT_OPTIONS = elkLayoutOptions('export')

export interface ElkGraphBuild {
  graph: ElkNode
  personGenerations: Map<string, number>
  unionPartitions: Map<string, number>
  successorOf: Map<string, string>
  personToElkId: Map<string, string>
  elkMembers: Map<string, string[]>
}

class DisjointSet {
  private parent = new Map<string, string>()

  find(id: string): string {
    const current = this.parent.get(id)
    if (current === undefined) {
      this.parent.set(id, id)
      return id
    }
    if (current === id) return id
    const root = this.find(current)
    this.parent.set(id, root)
    return root
  }

  union(a: string, b: string) {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return
    if (rootA < rootB) this.parent.set(rootB, rootA)
    else this.parent.set(rootA, rootB)
  }
}

function sortKeyFor(node: LayoutNode): SortKey {
  return { birthYear: node.birthYear ?? Number.POSITIVE_INFINITY, id: node.id }
}

function childBearingUnionCount(personId: string, structure: FamilyStructure): number {
  let count = 0
  for (const [unionId, parents] of structure.unionParents) {
    if (!parents.includes(personId)) continue
    if ((structure.unionChildren.get(unionId) ?? []).length > 0) count += 1
  }
  return count
}

export function marriageChains(
  personIds: string[],
  structure: FamilyStructure,
  nodeById: Map<string, LayoutNode>,
): string[][] {
  const dsu = new DisjointSet()
  for (const id of personIds) dsu.find(id)
  for (const parents of structure.unionParents.values()) {
    const present = parents.filter((id) => personIds.includes(id))
    for (let i = 1; i < present.length; i++) dsu.union(present[0], present[i])
  }
  for (const [a, b] of structure.spouseLinks) {
    if (!personIds.includes(a) || !personIds.includes(b)) continue
    dsu.union(a, b)
  }

  const grouped = new Map<string, string[]>()
  for (const id of personIds) {
    const root = dsu.find(id)
    const list = grouped.get(root) ?? []
    list.push(id)
    grouped.set(root, list)
  }

  const ordered: string[][] = []
  for (const members of grouped.values()) {
    if (members.length <= 1) {
      ordered.push(members)
      continue
    }
    if (members.length === 2) {
      ordered.push(
        [...members].sort((a, b) =>
          comparePersons(sortKeyFor(nodeById.get(a)!), sortKeyFor(nodeById.get(b)!)),
        ),
      )
      continue
    }
    let hub = members[0]
    let best = -1
    for (const id of members) {
      const count = childBearingUnionCount(id, structure)
      const hasParents = (structure.parentsOfPerson.get(id) ?? []).length > 0
      const score = count * 2 + (hasParents ? 1 : 0)
      const hubKey = sortKeyFor(nodeById.get(hub)!)
      const idKey = sortKeyFor(nodeById.get(id)!)
      if (score > best || (score === best && comparePersons(idKey, hubKey) < 0)) {
        best = score
        hub = id
      }
    }
    const others = members
      .filter((id) => id !== hub)
      .sort((a, b) => comparePersons(sortKeyFor(nodeById.get(a)!), sortKeyFor(nodeById.get(b)!)))
    const split = Math.ceil(others.length / 2)
    ordered.push([...others.slice(0, split), hub, ...others.slice(split)])
  }
  return ordered
}

export function elkIdForMembers(members: string[]): string {
  if (members.length === 1) return members[0]
  return `block:${members.join('|')}`
}

export function personPartition(generation: number): number {
  return generation
}

export function unionPartition(parentGen: number): number {
  return parentGen * 2 + 1
}

function chainWidth(members: string[], nodeById: Map<string, LayoutNode>): number {
  let width = 0
  for (let i = 0; i < members.length; i++) {
    if (i > 0) width += NODE_GAP
    width += nodeById.get(members[i])?.width ?? PERSON_W
  }
  return width
}

export function buildElkGraph(
  persons: LayoutNode[],
  unions: LayoutNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  quality: LayoutQuality = 'export',
): ElkGraphBuild {
  const nodeById = new Map<string, LayoutNode>([...persons, ...unions].map((node) => [node.id, node]))
  const successorOf = new Map<string, string>()
  const personToElkId = new Map<string, string>()
  const elkMembers = new Map<string, string[]>()

  const personsByGen = new Map<number, string[]>()
  for (const person of persons) {
    const gen = generations.get(person.id) ?? 0
    const list = personsByGen.get(gen) ?? []
    list.push(person.id)
    personsByGen.set(gen, list)
  }

  for (const ids of [...personsByGen.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])) {
    const genChains = marriageChains(ids, structure, nodeById)
    genChains.sort((a, b) =>
      comparePersons(sortKeyFor(nodeById.get(a[0])!), sortKeyFor(nodeById.get(b[0])!)),
    )
    for (const chain of genChains) {
      const elkId = elkIdForMembers(chain)
      elkMembers.set(elkId, chain)
      for (const id of chain) personToElkId.set(id, elkId)
      for (let i = 1; i < chain.length; i++) successorOf.set(chain[i], chain[i - 1])
    }
  }

  const unionPartitions = new Map<string, number>()
  const elkNodes: ElkNode[] = []

  for (const [elkId, members] of [...elkMembers.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const gen = generations.get(members[0]) ?? 0
    elkNodes.push({
      id: elkId,
      width: chainWidth(members, nodeById),
      height: nodeById.get(members[0])?.height ?? PERSON_H,
      layoutOptions: {
        'elk.partitioning.partition': String(gen),
      },
    })
  }

  const elkEdges: ElkExtendedEdge[] = []
  const seen = new Set<string>()
  const childEdges: Array<{ unionId: string; childId: string; sort: SortKey }> = []
  for (const [unionId, children] of structure.unionChildren) {
    for (const childId of children) {
      const child = nodeById.get(childId)
      if (!child) continue
      childEdges.push({ unionId, childId, sort: sortKeyFor(child) })
    }
  }
  childEdges.sort((a, b) => {
    if (a.unionId !== b.unionId) return a.unionId < b.unionId ? -1 : 1
    return comparePersons(a.sort, b.sort)
  })

  for (const { unionId, childId } of childEdges) {
    const childElk = personToElkId.get(childId)
    if (!childElk) continue
    const parents = structure.unionParents.get(unionId) ?? []
    const parentBlocks = new Set(
      parents.map((id) => personToElkId.get(id)).filter((id): id is string => id != null),
    )
    if (parentBlocks.size === 0) continue
    for (const parentElk of [...parentBlocks].sort()) {
      const key = `${parentElk}->${childElk}`
      if (seen.has(key)) continue
      seen.add(key)
      elkEdges.push({
        id: `elk:${parentElk}:${childElk}`,
        sources: [parentElk],
        targets: [childElk],
      })
    }
    unionPartitions.set(unionId, unionPartition(parentGeneration(unionId, structure, generations)))
  }

  return {
    graph: {
      id: 'root',
      layoutOptions: { ...elkLayoutOptions(quality) },
      children: elkNodes,
      edges: elkEdges,
    },
    personGenerations: generations,
    unionPartitions,
    successorOf,
    personToElkId,
    elkMembers,
  }
}
