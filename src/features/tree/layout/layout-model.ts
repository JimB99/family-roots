import type { Person } from '../../../types'

export type LayoutNodeKind = 'person' | 'union'

export interface LayoutNode {
  id: string
  kind: LayoutNodeKind
  personId?: string
  label: string
  givenNames: string
  familyName: string | null
  subtitle: string | null
  gender: Person['gender']
  birthYear: number | null
  deathYear: number | null
  isDeceased: boolean
  initials: string
  width: number
  height: number
  componentId: string
}

export interface LayoutEdge {
  id: string
  type: 'spouse' | 'parent_child'
  sourceId: string
  targetId: string
  relationshipId?: string
}

export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface LayoutComponent {
  id: string
  nodeIds: string[]
  bounds: LayoutBounds
}

export interface LayoutModel {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  components: LayoutComponent[]
  bounds: LayoutBounds
}

export interface PositionedNode extends LayoutNode {
  x: number
  y: number
}

export interface PositionedLayout {
  nodes: PositionedNode[]
  edges: LayoutEdge[]
  components: LayoutComponent[]
  bounds: LayoutBounds
}
