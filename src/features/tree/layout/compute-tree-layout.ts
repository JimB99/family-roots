import { layoutComponentWithElk } from './elk-layout.ts'
import { assignGenerations, buildStructure } from './family-structure.ts'
import type {
  LayoutBounds,
  LayoutEdge,
  LayoutModel,
  PositionedLayout,
  PositionedNode,
} from './layout-model.ts'
import { COMPONENT_GAP, FAMILY_GAP, NODE_GAP, ROW_GAP, SIBLING_GAP } from './layout-spacing.ts'
import type { ComputeLayoutOptions } from './layout-options.ts'

export { FAMILY_GAP, NODE_GAP, ROW_GAP, SIBLING_GAP, COMPONENT_GAP }
export const BLOCK_GAP = FAMILY_GAP

export const EMPTY_LAYOUT: PositionedLayout = {
  nodes: [],
  edges: [],
  components: [],
  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
}

interface ComponentLayout {
  id: string
  nodes: PositionedNode[]
  width: number
  height: number
}

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

  const totalArea = ordered.reduce(
    (sum, c) => sum + (c.width + COMPONENT_GAP) * (c.height + COMPONENT_GAP),
    0,
  )
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

export async function computeTreeLayout(
  model: LayoutModel,
  options: ComputeLayoutOptions = {},
): Promise<PositionedLayout> {
  const quality = options.quality ?? 'export'
  const byComponent = new Map<string, { persons: PositionedNode[]; unions: PositionedNode[] }>()
  for (const node of model.nodes) {
    const entry = byComponent.get(node.componentId) ?? { persons: [], unions: [] }
    const positioned: PositionedNode = { ...node, x: 0, y: 0 }
    if (node.kind === 'union') entry.unions.push(positioned)
    else entry.persons.push(positioned)
    byComponent.set(node.componentId, entry)
  }

  const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
  const componentOfNode = new Map(model.nodes.map((node) => [node.id, node.componentId]))
  const edgesByComponent = new Map<string, LayoutEdge[]>()
  for (const edge of model.edges) {
    const componentId = componentOfNode.get(edge.sourceId) ?? componentOfNode.get(edge.targetId)
    if (componentId === undefined) continue
    const list = edgesByComponent.get(componentId)
    if (list) list.push(edge)
    else edgesByComponent.set(componentId, [edge])
  }

  const componentIds = [...byComponent.keys()].sort()
  const componentLayouts = await Promise.all(
    componentIds.map(async (componentId) => {
      const entry = byComponent.get(componentId)!
      const edges = edgesByComponent.get(componentId) ?? []
      const structure = buildStructure(edges, kindById)
      const personIds = entry.persons.map((node) => node.id).sort()
      const generations = assignGenerations(personIds, structure)
      return layoutComponentWithElk(
        componentId,
        entry.persons,
        entry.unions,
        structure,
        generations,
        quality,
      )
    }),
  )

  const packed = packComponents(componentLayouts)

  return {
    nodes: packed.nodes,
    edges: model.edges,
    components: packed.componentBounds.map((component) => ({
      id: component.id,
      nodeIds: model.nodes.filter((node) => node.componentId === component.id).map((node) => node.id),
      bounds: component.bounds,
    })),
    bounds: packed.bounds,
  }
}
