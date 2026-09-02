import type { FamilyGraph } from '../../../domain/types'
import type { Person } from '../../../types'
import type { LayoutEdge, LayoutModel, LayoutNode } from './layout-model'

export const PERSON_W = 208
export const PERSON_H = 92
const UNION_W = 22
const UNION_H = 22

function unionIdForSpouses(ids: string[]): string {
  return `union:${[...ids].sort().join('|')}`
}

function singleParentUnionId(parentId: string): string {
  return `union:single:${parentId}`
}

function birthYear(person: Person): number | null {
  return person.birth?.year ?? null
}

function deathYear(person: Person): number | null {
  return person.death?.year ?? null
}

function displayLabel(person: Person): string {
  const parts = [person.givenNames, person.familyName].filter(Boolean)
  return parts.join(' ') || 'Unknown'
}

function initialsFor(person: Person): string {
  const given = person.givenNames?.trim().charAt(0) ?? ''
  const family = person.familyName?.trim().charAt(0) ?? ''
  const value = `${given}${family}`.toUpperCase()
  return value || '?'
}

function subtitleFor(person: Person): string | null {
  const born = birthYear(person)
  const died = deathYear(person)
  if (born && died) return `${born} – ${died}`
  if (born) return `b. ${born}`
  if (died) return `d. ${died}`
  if (person.maidenName) return `née ${person.maidenName}`
  return null
}

function isDeceased(person: Person): boolean {
  if (person.isLiving === true) return false
  return person.isLiving === false || Boolean(person.death)
}

export function projectFamilyGraph(graph: FamilyGraph): LayoutModel {
  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const componentNodeIds = new Map<string, string[]>()

  for (const component of graph.components) {
    componentNodeIds.set(component.representativeId, [])
  }

  for (const person of graph.peopleById.values()) {
    const component = graph.components.find((c) => c.memberIds.has(person.id))
    const componentId = component?.representativeId ?? person.id
    nodes.push({
      id: `person:${person.id}`,
      kind: 'person',
      personId: person.id,
      label: displayLabel(person),
      subtitle: subtitleFor(person),
      gender: person.gender,
      birthYear: birthYear(person),
      deathYear: deathYear(person),
      isDeceased: isDeceased(person),
      initials: initialsFor(person),
      width: PERSON_W,
      height: PERSON_H,
      componentId,
    })
    componentNodeIds.get(componentId)?.push(`person:${person.id}`)
  }

  const unionByChild = new Map<string, string>()

  for (const person of graph.peopleById.values()) {
    const parents = [...(graph.parentsOf.get(person.id) ?? [])]
    if (parents.length === 0) continue

    const spouses = parents.flatMap((p) => [...(graph.spousesOf.get(p) ?? [])])
    const parentSet = new Set(parents)
    for (const s of spouses) {
      if (graph.parentsOf.get(person.id)?.has(s)) parentSet.add(s)
    }
    const parentIds = [...parentSet].sort()
    const unionId =
      parentIds.length >= 2 ? unionIdForSpouses(parentIds) : singleParentUnionId(parentIds[0])

    if (!nodes.some((n) => n.id === unionId)) {
      const component = graph.components.find((c) => c.memberIds.has(person.id))
      nodes.push({
        id: unionId,
        kind: 'union',
        label: '',
        subtitle: null,
        gender: 'unknown',
        birthYear: null,
        deathYear: null,
        isDeceased: false,
        initials: '',
        width: UNION_W,
        height: UNION_H,
        componentId: component?.representativeId ?? person.id,
      })
      componentNodeIds.get(component?.representativeId ?? person.id)?.push(unionId)
    }

    for (const parentId of parentIds) {
      edges.push({
        id: `edge:spouse-link:${parentId}:${unionId}`,
        type: 'spouse',
        sourceId: `person:${parentId}`,
        targetId: unionId,
      })
    }

    edges.push({
      id: `edge:parent-child:${unionId}:${person.id}`,
      type: 'parent_child',
      sourceId: unionId,
      targetId: `person:${person.id}`,
    })
    unionByChild.set(person.id, unionId)
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

