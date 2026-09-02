import type {
  LayoutBounds,
  LayoutEdge,
  LayoutModel,
  LayoutNodeKind,
  PositionedLayout,
  PositionedNode,
} from './layout-model'

export const ROW_GAP = 112
export const NODE_GAP = 44
export const BLOCK_GAP = 88
export const COMPONENT_GAP = 140

interface Structure {
  unionParents: Map<string, string[]>
  unionChildren: Map<string, string[]>
  parentsOfPerson: Map<string, string[]>
  childrenOfPerson: Map<string, string[]>
  spouseLinks: Array<[string, string]>
}

function pushTo(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key)
  if (list) {
    if (!list.includes(value)) list.push(value)
  } else {
    map.set(key, [value])
  }
}

function buildStructure(edges: LayoutEdge[], kindById: Map<string, LayoutNodeKind>): Structure {
  const isUnion = (id: string) => kindById.get(id) === 'union'

  const unionParents = new Map<string, string[]>()
  const unionChildren = new Map<string, string[]>()
  const spouseLinks: Array<[string, string]> = []

  for (const edge of edges) {
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

function assignGenerations(personIds: string[], structure: Structure): Map<string, number> {
  const gen = new Map<string, number>(personIds.map((id) => [id, 0]))
  const maxIterations = personIds.length + 2

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false

    for (const [unionId, children] of structure.unionChildren) {
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
    // Keep the lexicographically smaller id as root so blocks are stable.
    if (rootA < rootB) this.parent.set(rootB, rootA)
    else this.parent.set(rootA, rootB)
  }
}

interface SortKey {
  birthYear: number
  id: string
}

function comparePersons(a: SortKey, b: SortKey): number {
  if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function meanOrNull(values: number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

/**
 * Places nodes along a row honouring the given order while pulling each toward
 * its desired centre. Runs a left-to-right separation pass followed by a
 * right-to-left pull-back that never violates the separation minimums.
 */
function resolveRow(
  order: string[],
  widths: Map<string, number>,
  gapBetween: (leftId: string, rightId: string) => number,
  desiredCenter: Map<string, number | null>,
  currentX: Map<string, number>,
): void {
  if (order.length === 0) return

  const minX: number[] = []
  const placed: number[] = []

  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    const width = widths.get(id) ?? 0
    const desired = desiredCenter.get(id)
    const preferred = desired === null || desired === undefined ? currentX.get(id) ?? 0 : desired - width / 2
    if (i === 0) {
      placed.push(preferred)
      minX.push(-Infinity)
      continue
    }
    const prevId = order[i - 1]
    const limit = placed[i - 1] + (widths.get(prevId) ?? 0) + gapBetween(prevId, id)
    minX.push(limit)
    placed.push(Math.max(preferred, limit))
  }

  for (let i = order.length - 2; i >= 0; i--) {
    const id = order[i]
    const nextId = order[i + 1]
    const width = widths.get(id) ?? 0
    const upperLimit = placed[i + 1] - width - gapBetween(id, nextId)
    placed[i] = Math.max(minX[i], Math.min(placed[i], upperLimit))
  }

  for (let i = 0; i < order.length; i++) {
    currentX.set(order[i], placed[i])
  }
}

interface ComponentLayout {
  id: string
  nodes: PositionedNode[]
  width: number
  height: number
}

function layoutComponent(
  componentId: string,
  personNodes: PositionedNode[],
  unionNodes: PositionedNode[],
  structure: Structure,
): ComponentLayout {
  const personIds = personNodes.map((n) => n.id).sort()
  const nodeById = new Map<string, PositionedNode>()
  for (const node of [...personNodes, ...unionNodes]) nodeById.set(node.id, node)

  const gen = assignGenerations(personIds, structure)

  const sortKey = new Map<string, SortKey>()
  for (const node of personNodes) {
    sortKey.set(node.id, {
      birthYear: node.birthYear ?? Number.POSITIVE_INFINITY,
      id: node.id,
    })
  }

  const dsu = new DisjointSet()
  for (const id of personIds) dsu.find(id)
  for (const [a, b] of structure.spouseLinks) {
    if (!sortKey.has(a) || !sortKey.has(b)) continue
    if ((gen.get(a) ?? 0) !== (gen.get(b) ?? 0)) continue
    dsu.union(a, b)
  }

  const blockMembers = new Map<string, string[]>()
  for (const id of personIds) {
    const root = dsu.find(id)
    pushTo(blockMembers, root, id)
  }
  for (const [, members] of blockMembers) {
    members.sort((a, b) => comparePersons(sortKey.get(a)!, sortKey.get(b)!))
  }

  const blockOf = new Map<string, string>()
  for (const [root, members] of blockMembers) {
    for (const member of members) blockOf.set(member, root)
  }

  const blockGen = new Map<string, number>()
  for (const [root, members] of blockMembers) {
    let value = 0
    for (const member of members) value = Math.max(value, gen.get(member) ?? 0)
    blockGen.set(root, value)
  }

  const generations = [...new Set([...blockGen.values()])].sort((a, b) => a - b)
  const rows = new Map<number, string[]>()
  for (const generation of generations) rows.set(generation, [])
  for (const [root] of blockMembers) {
    rows.get(blockGen.get(root)!)!.push(root)
  }

  for (const [, blocks] of rows) {
    blocks.sort((a, b) => {
      const keyA = sortKey.get(blockMembers.get(a)![0])!
      const keyB = sortKey.get(blockMembers.get(b)![0])!
      return comparePersons(keyA, keyB)
    })
  }

  const indexInRow = () => {
    const index = new Map<string, number>()
    for (const [, blocks] of rows) {
      blocks.forEach((block, i) => index.set(block, i))
    }
    return index
  }

  const parentBlocks = (block: string): string[] => {
    const result = new Set<string>()
    for (const member of blockMembers.get(block) ?? []) {
      for (const parent of structure.parentsOfPerson.get(member) ?? []) {
        const parentBlock = blockOf.get(parent)
        if (parentBlock) result.add(parentBlock)
      }
    }
    return [...result]
  }

  const childBlocks = (block: string): string[] => {
    const result = new Set<string>()
    for (const member of blockMembers.get(block) ?? []) {
      for (const child of structure.childrenOfPerson.get(member) ?? []) {
        const childBlock = blockOf.get(child)
        if (childBlock) result.add(childBlock)
      }
    }
    return [...result]
  }

  for (let sweep = 0; sweep < 4; sweep++) {
    const downward = sweep % 2 === 0
    const ordered = downward ? generations : [...generations].reverse()
    for (const generation of ordered) {
      const blocks = rows.get(generation)
      if (!blocks || blocks.length < 2) continue
      const index = indexInRow()
      const previous = new Map(blocks.map((block, i) => [block, i]))
      const bary = new Map<string, number>()
      for (const block of blocks) {
        const neighbours = downward ? parentBlocks(block) : childBlocks(block)
        const positions = neighbours
          .map((n) => index.get(n))
          .filter((v): v is number => v !== undefined)
        const mean = meanOrNull(positions)
        bary.set(block, mean ?? previous.get(block)!)
      }
      blocks.sort((a, b) => {
        const diff = bary.get(a)! - bary.get(b)!
        if (diff !== 0) return diff
        return previous.get(a)! - previous.get(b)!
      })
    }
  }

  const personWidth = new Map<string, number>()
  for (const node of personNodes) personWidth.set(node.id, node.width)

  // Blocks (a person plus their partners) move as one rigid unit so couples can
  // never drift apart while rows are being straightened.
  const blockWidth = new Map<string, number>()
  const offsetInBlock = new Map<string, number>()
  for (const [root, members] of blockMembers) {
    let cursor = 0
    for (const member of members) {
      offsetInBlock.set(member, cursor)
      cursor += (personWidth.get(member) ?? 0) + NODE_GAP
    }
    blockWidth.set(root, Math.max(0, cursor - NODE_GAP))
  }

  const blockX = new Map<string, number>()
  for (const generation of generations) {
    let cursor = 0
    for (const block of rows.get(generation) ?? []) {
      blockX.set(block, cursor)
      cursor += (blockWidth.get(block) ?? 0) + BLOCK_GAP
    }
  }

  const personX = (id: string): number =>
    (blockX.get(blockOf.get(id)!) ?? 0) + (offsetInBlock.get(id) ?? 0)
  const personCenter = (id: string): number => personX(id) + (personWidth.get(id) ?? 0) / 2

  const blockGap = () => BLOCK_GAP

  for (let pass = 0; pass < 6; pass++) {
    const downward = pass % 2 === 0
    const ordered = downward ? generations : [...generations].reverse()
    for (const generation of ordered) {
      const blocks = rows.get(generation) ?? []
      if (blocks.length === 0) continue

      const desired = new Map<string, number | null>()
      for (const block of blocks) {
        const offsets: number[] = []
        for (const member of blockMembers.get(block) ?? []) {
          const neighbours = downward
            ? structure.parentsOfPerson.get(member) ?? []
            : structure.childrenOfPerson.get(member) ?? []
          const positions = neighbours
            .filter((n) => blockOf.has(n))
            .map((n) => personCenter(n))
          const mean = meanOrNull(positions)
          if (mean === null) continue
          // Convert the member's target centre into a target for the whole block.
          offsets.push(
            mean - (offsetInBlock.get(member) ?? 0) - (personWidth.get(member) ?? 0) / 2,
          )
        }
        const blockLeft = meanOrNull(offsets)
        desired.set(block, blockLeft === null ? null : blockLeft + (blockWidth.get(block) ?? 0) / 2)
      }

      resolveRow(blocks, blockWidth, blockGap, desired, blockX)
    }
  }

  const x = new Map<string, number>()
  for (const id of personIds) x.set(id, personX(id))
  const centerOf = (id: string) => personCenter(id)

  const rowY = (generation: number) => {
    const index = generations.indexOf(generation)
    const personHeight = personNodes[0]?.height ?? 92
    return index * (personHeight + ROW_GAP)
  }

  const positioned: PositionedNode[] = []
  for (const node of personNodes) {
    positioned.push({ ...node, x: x.get(node.id) ?? 0, y: rowY(gen.get(node.id) ?? 0) })
  }

  for (const node of unionNodes) {
    const parents = structure.unionParents.get(node.id) ?? []
    const children = structure.unionChildren.get(node.id) ?? []
    const parentCenters = parents.filter((p) => x.has(p)).map((p) => centerOf(p))
    const childCenters = children.filter((c) => x.has(c)).map((c) => centerOf(c))
    const center = meanOrNull(parentCenters) ?? meanOrNull(childCenters) ?? 0

    let parentGen = 0
    for (const parent of parents) parentGen = Math.max(parentGen, gen.get(parent) ?? 0)
    const personHeight = personNodes[0]?.height ?? 92
    const y = rowY(parentGen) + personHeight + (ROW_GAP - node.height) / 2

    positioned.push({ ...node, x: center - node.width / 2, y })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of positioned) {
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

  const normalized = positioned.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY }))

  return {
    id: componentId,
    nodes: normalized,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Packs components into shelves so that large numbers of small or disconnected
 * components wrap into a roughly square block instead of one very wide strip.
 */
function packComponents(components: ComponentLayout[]): {
  nodes: PositionedNode[]
  componentBounds: Array<{ id: string; bounds: LayoutBounds }>
  bounds: LayoutBounds
} {
  const ordered = [...components].sort((a, b) => {
    const areaA = a.width * a.height
    const areaB = b.width * b.height
    if (areaB !== areaA) return areaB - areaA
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const totalArea = ordered.reduce((sum, c) => sum + (c.width + COMPONENT_GAP) * (c.height + COMPONENT_GAP), 0)
  const widest = ordered.reduce((max, c) => Math.max(max, c.width), 0)
  const targetWidth = Math.max(widest, Math.sqrt(totalArea) * 1.4)

  const nodes: PositionedNode[] = []
  const componentBounds: Array<{ id: string; bounds: LayoutBounds }> = []

  let cursorX = 0
  let shelfY = 0
  let shelfHeight = 0
  let maxRight = 0

  for (const component of ordered) {
    if (cursorX > 0 && cursorX + component.width > targetWidth) {
      cursorX = 0
      shelfY += shelfHeight + COMPONENT_GAP
      shelfHeight = 0
    }
    for (const node of component.nodes) {
      nodes.push({ ...node, x: node.x + cursorX, y: node.y + shelfY })
    }
    componentBounds.push({
      id: component.id,
      bounds: {
        minX: cursorX,
        minY: shelfY,
        maxX: cursorX + component.width,
        maxY: shelfY + component.height,
      },
    })
    maxRight = Math.max(maxRight, cursorX + component.width)
    shelfHeight = Math.max(shelfHeight, component.height)
    cursorX += component.width + COMPONENT_GAP
  }

  return {
    nodes,
    componentBounds,
    bounds: { minX: 0, minY: 0, maxX: maxRight, maxY: shelfY + shelfHeight },
  }
}

export function computeTreeLayout(model: LayoutModel): PositionedLayout {
  const byComponent = new Map<string, { persons: PositionedNode[]; unions: PositionedNode[] }>()
  for (const node of model.nodes) {
    const entry = byComponent.get(node.componentId) ?? { persons: [], unions: [] }
    const positioned: PositionedNode = { ...node, x: 0, y: 0 }
    if (node.kind === 'union') entry.unions.push(positioned)
    else entry.persons.push(positioned)
    byComponent.set(node.componentId, entry)
  }

  const kindById = new Map(model.nodes.map((n) => [n.id, n.kind]))
  const componentOfNode = new Map(model.nodes.map((n) => [n.id, n.componentId]))
  const edgesByComponent = new Map<string, LayoutEdge[]>()
  for (const edge of model.edges) {
    const componentId = componentOfNode.get(edge.sourceId) ?? componentOfNode.get(edge.targetId)
    if (componentId === undefined) continue
    const list = edgesByComponent.get(componentId)
    if (list) list.push(edge)
    else edgesByComponent.set(componentId, [edge])
  }

  const componentLayouts: ComponentLayout[] = []
  for (const [componentId, entry] of byComponent) {
    const structure = buildStructure(edgesByComponent.get(componentId) ?? [], kindById)
    componentLayouts.push(layoutComponent(componentId, entry.persons, entry.unions, structure))
  }

  const packed = packComponents(componentLayouts)

  return {
    nodes: packed.nodes,
    edges: model.edges,
    components: packed.componentBounds.map((c) => ({
      id: c.id,
      nodeIds: model.nodes.filter((n) => n.componentId === c.id).map((n) => n.id),
      bounds: c.bounds,
    })),
    bounds: packed.bounds,
  }
}
