import type { LayoutNode } from './layout-model'
import { type FamilyStructure } from './family-structure'
import { comparePersons, type SortKey } from './layout-order'

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

function parentSetKey(personId: string, structure: FamilyStructure): string {
  return [...(structure.parentsOfPerson.get(personId) ?? [])].sort().join('|')
}

function shareNatalParents(a: string, b: string, structure: FamilyStructure): boolean {
  const aParents = structure.parentsOfPerson.get(a) ?? []
  const bParents = structure.parentsOfPerson.get(b) ?? []
  if (aParents.length === 0 || bParents.length === 0) return false
  return aParents.some((parent) => bParents.includes(parent))
}

export interface MarriageChainOptions {
  /** Do not merge spouse links between partners from different natal sibling clusters. */
  excludeCrossFamilySpouseLinks?: boolean
}

export function marriageChains(
  personIds: string[],
  structure: FamilyStructure,
  nodeById: Map<string, LayoutNode>,
  options: MarriageChainOptions = {},
): string[][] {
  const dsu = new DisjointSet()
  for (const id of personIds) dsu.find(id)
  for (const parents of structure.unionParents.values()) {
    const present = parents.filter((id) => personIds.includes(id))
    for (let i = 1; i < present.length; i++) dsu.union(present[0], present[i])
  }
  for (const [a, b] of structure.spouseLinks) {
    if (!personIds.includes(a) || !personIds.includes(b)) continue
  if (options.excludeCrossFamilySpouseLinks) {
    const aParents = structure.parentsOfPerson.get(a) ?? []
    const bParents = structure.parentsOfPerson.get(b) ?? []
    if (aParents.length > 0 && bParents.length > 0 && !shareNatalParents(a, b, structure)) continue
  }
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

export function natalClusterKey(personId: string, structure: FamilyStructure): string {
  return parentSetKey(personId, structure)
}

export function natalClustersAtRow(
  personIds: string[],
  row: number,
  structure: FamilyStructure,
  generations: Map<string, number>,
): string[][] {
  const rowPersons = personIds.filter((id) => (generations.get(id) ?? 0) === row)
  const clusters = new Map<string, string[]>()
  for (const id of rowPersons) {
    const key = natalClusterKey(id, structure)
    const list = clusters.get(key) ?? []
    list.push(id)
    clusters.set(key, list)
  }
  return [...clusters.values()]
}
