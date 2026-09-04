import type { LayoutEdge, LayoutModel, LayoutNodeKind } from './layout-model'

export interface FamilyStructure {
  unionParents: Map<string, string[]>
  unionChildren: Map<string, string[]>
  parentsOfPerson: Map<string, string[]>
  childrenOfPerson: Map<string, string[]>
  spouseLinks: Array<[string, string]>
}

export function pushTo(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key)
  if (list) {
    if (!list.includes(value)) list.push(value)
  } else {
    map.set(key, [value])
  }
}

export function buildStructure(edges: LayoutEdge[], kindById: Map<string, LayoutNodeKind>): FamilyStructure {
  const isUnion = (id: string) => kindById.get(id) === 'union'

  const unionParents = new Map<string, string[]>()
  const unionChildren = new Map<string, string[]>()
  const spouseLinks: Array<[string, string]> = []

  const sortedEdges = [...edges].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const edge of sortedEdges) {
    const sourceIsUnion = isUnion(edge.sourceId)
    const targetIsUnion = isUnion(edge.targetId)
    if (!sourceIsUnion && targetIsUnion) {
      pushTo(unionParents, edge.targetId, edge.sourceId)
    } else if (sourceIsUnion && !targetIsUnion) {
      pushTo(unionChildren, edge.sourceId, edge.targetId)
    } else if (!sourceIsUnion && !targetIsUnion && edge.type === 'spouse') {
      spouseLinks.push([edge.sourceId, edge.targetId])
    }
  }

  for (const [, parents] of unionParents) {
    parents.sort()
  }
  for (const [, children] of unionChildren) {
    children.sort()
  }

  const parentsOfPerson = new Map<string, string[]>()
  const childrenOfPerson = new Map<string, string[]>()
  for (const [unionId, children] of unionChildren) {
    const parents = unionParents.get(unionId) ?? []
    for (const child of children) {
      for (const parent of parents) {
        pushTo(parentsOfPerson, child, parent)
        pushTo(childrenOfPerson, parent, child)
      }
    }
  }

  return { unionParents, unionChildren, parentsOfPerson, childrenOfPerson, spouseLinks }
}

export function structureFromModel(model: LayoutModel): FamilyStructure {
  const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
  return buildStructure(model.edges, kindById)
}

export function assignGenerations(personIds: string[], structure: FamilyStructure): Map<string, number> {
  const gen = new Map<string, number>(personIds.map((id) => [id, 0]))
  const maxIterations = personIds.length + 2
  const unionIds = [...structure.unionChildren.keys()].sort()

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false

    for (const unionId of unionIds) {
      const children = structure.unionChildren.get(unionId) ?? []
      let parentGen = -1
      for (const parent of structure.unionParents.get(unionId) ?? []) {
        parentGen = Math.max(parentGen, gen.get(parent) ?? 0)
      }
      if (parentGen < 0) continue
      for (const child of children) {
        if ((gen.get(child) ?? 0) < parentGen + 1) {
          gen.set(child, parentGen + 1)
          changed = true
        }
      }
    }

    for (const [a, b] of structure.spouseLinks) {
      const target = Math.max(gen.get(a) ?? 0, gen.get(b) ?? 0)
      if ((gen.get(a) ?? 0) < target) {
        gen.set(a, target)
        changed = true
      }
      if ((gen.get(b) ?? 0) < target) {
        gen.set(b, target)
        changed = true
      }
    }

    if (!changed) break
  }

  return gen
}

export function parentGeneration(unionId: string, structure: FamilyStructure, generations: Map<string, number>): number {
  let parentGen = -1
  for (const parent of structure.unionParents.get(unionId) ?? []) {
    parentGen = Math.max(parentGen, generations.get(parent) ?? 0)
  }
  if (parentGen >= 0) return parentGen
  let childGen = Infinity
  for (const child of structure.unionChildren.get(unionId) ?? []) {
    childGen = Math.min(childGen, generations.get(child) ?? 0)
  }
  if (Number.isFinite(childGen) && childGen > 0) return childGen - 1
  return 0
}

export function unionsOfPerson(structure: FamilyStructure): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const [unionId, parents] of structure.unionParents) {
    for (const parent of parents) pushTo(result, parent, unionId)
  }
  return result
}
