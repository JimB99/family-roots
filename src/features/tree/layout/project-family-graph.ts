import type { FamilyGraph } from '../../../domain/types'
import { parentIdsFromUnionId, parentIdsOfChild, unionIdFromParentIds } from '../../../domain/union-id'
import type { LayoutEdge, LayoutModel, LayoutNode } from './layout-model'
import {
  birthYearOf,
  deathYearOf,
  displayLabel,
  initialsFor,
  isDeceased,
  subtitleFor,
} from './person-node-display'

export const PERSON_W = 208
export const PERSON_H = 92
const UNION_W = 22
const UNION_H = 22

function unionNode(id: string, componentId: string): LayoutNode {
  return {
    id,
    kind: 'union',
    label: '',
    givenNames: '',
    familyName: null,
    subtitle: null,
    gender: 'unknown',
    birthYear: null,
    deathYear: null,
    isDeceased: false,
    initials: '',
    width: UNION_W,
    height: UNION_H,
    componentId,
  }
}

export interface ProjectOptions {
  retainUnionIds?: Iterable<string>
}

export function projectFamilyGraph(graph: FamilyGraph, options: ProjectOptions = {}): LayoutModel {
  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const componentNodeIds = new Map<string, string[]>()

  for (const component of graph.components) {
    componentNodeIds.set(component.representativeId, [])
  }

  const componentIdOf = (personId: string): string => {
    const component = graph.components.find((c) => c.memberIds.has(personId))
    return component?.representativeId ?? personId
  }

  for (const person of graph.peopleById.values()) {
    const componentId = componentIdOf(person.id)
    nodes.push({
      id: `person:${person.id}`,
      kind: 'person',
      personId: person.id,
      label: displayLabel(person),
      givenNames: person.givenNames?.trim() || 'Unknown',
      familyName: person.familyName?.trim() || null,
      subtitle: subtitleFor(person),
      gender: person.gender,
      birthYear: birthYearOf(person),
      deathYear: deathYearOf(person),
      isDeceased: isDeceased(person),
      initials: initialsFor(person),
      width: PERSON_W,
      height: PERSON_H,
      componentId,
    })
    componentNodeIds.get(componentId)?.push(`person:${person.id}`)
  }

  const addUnion = (unionId: string, parentIds: string[], componentId: string) => {
    if (!nodes.some((n) => n.id === unionId)) {
      nodes.push(unionNode(unionId, componentId))
      componentNodeIds.get(componentId)?.push(unionId)
    }
    for (const parentId of parentIds) {
      const edgeId = `edge:spouse-link:${parentId}:${unionId}`
      if (edges.some((edge) => edge.id === edgeId)) continue
      edges.push({
        id: edgeId,
        type: 'spouse',
        sourceId: `person:${parentId}`,
        targetId: unionId,
      })
    }
  }

  for (const person of graph.peopleById.values()) {
    const parentIds = parentIdsOfChild(graph, person.id)
    const unionId = unionIdFromParentIds(parentIds)
    if (!unionId) continue

    addUnion(unionId, parentIds, componentIdOf(person.id))
    edges.push({
      id: `edge:parent-child:${unionId}:${person.id}`,
      type: 'parent_child',
      sourceId: unionId,
      targetId: `person:${person.id}`,
    })
  }

  for (const unionId of options.retainUnionIds ?? []) {
    if (nodes.some((n) => n.id === unionId)) continue
    const parentIds = parentIdsFromUnionId(unionId).filter((id) => graph.peopleById.has(id))
    if (parentIds.length === 0) continue
    addUnion(unionId, parentIds, componentIdOf(parentIds[0]))
  }

  for (const rel of graph.relationshipsById.values()) {
    if (rel.type !== 'spouse') continue
    const a = `person:${rel.personAId}`
    const b = `person:${rel.personBId}`
    if (!edges.some((e) => e.type === 'spouse' && e.sourceId === a && e.targetId === b)) {
      edges.push({
        id: `edge:spouse:${rel.id}`,
        type: 'spouse',
        sourceId: a,
        targetId: b,
        relationshipId: rel.id,
      })
    }
  }

  const components = graph.components.map((component) => {
    const nodeIds = nodes.filter((n) => n.componentId === component.representativeId).map((n) => n.id)
    return {
      id: component.representativeId,
      nodeIds,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    }
  })

  return {
    nodes,
    edges,
    components,
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  }
}
