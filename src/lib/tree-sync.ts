import type { Data } from 'family-chart'
import {
  deleteRelationship,
  getPeopleForFamily,
  getRelationshipsForFamily,
  savePerson,
  saveRelationship,
} from './firestore'
import { datumToPersonInput } from './tree'
import type { Relationship } from '../types'

function relKey(type: string, a: string, b: string): string {
  if (type === 'spouse') {
    return `spouse:${[a, b].sort().join('|')}`
  }
  return `parent_child:${a}|${b}`
}

function edgesFromChart(data: Data): Array<{ type: 'spouse' | 'parent_child'; a: string; b: string }> {
  const edges: Array<{ type: 'spouse' | 'parent_child'; a: string; b: string }> = []
  const seen = new Set<string>()

  for (const datum of data) {
    for (const spouseId of datum.rels.spouses ?? []) {
      const key = relKey('spouse', datum.id, spouseId)
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({ type: 'spouse', a: datum.id, b: spouseId })
      }
    }
    for (const childId of datum.rels.children ?? []) {
      const key = relKey('parent_child', datum.id, childId)
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({ type: 'parent_child', a: datum.id, b: childId })
      }
    }
  }

  return edges
}

function isFirestoreId(id: string, knownIds: Set<string>): boolean {
  return knownIds.has(id)
}

export async function syncChartToFirestore(
  chartData: Data,
  familyId: string,
  userId: string,
): Promise<void> {
  const existingPeople = await getPeopleForFamily(familyId)
  const existingRels = await getRelationshipsForFamily(familyId)
  const knownIds = new Set(existingPeople.map((p) => p.id))
  const idRemap = new Map<string, string>()

  for (const datum of chartData) {
    if (knownIds.has(datum.id)) {
      const input = datumToPersonInput(datum, familyId)
      await savePerson(datum.id, input, userId)
      continue
    }

    const input = datumToPersonInput(datum, familyId)
    const newId = await savePerson(null, input, userId)
    idRemap.set(datum.id, newId)
    knownIds.add(newId)
  }

  const resolveId = (id: string) => idRemap.get(id) ?? id

  const expectedEdges = edgesFromChart(
    chartData.map((d) => ({
      ...d,
      id: resolveId(d.id),
      rels: {
        parents: (d.rels.parents ?? []).map(resolveId),
        spouses: (d.rels.spouses ?? []).map(resolveId),
        children: (d.rels.children ?? []).map(resolveId),
      },
    })),
  ).filter((e) => isFirestoreId(e.a, knownIds) && isFirestoreId(e.b, knownIds))

  const expectedKeys = new Set(expectedEdges.map((e) => relKey(e.type, e.a, e.b)))
  const existingByKey = new Map<string, Relationship>()

  for (const rel of existingRels) {
    const key = relKey(rel.type, rel.personAId, rel.personBId)
    existingByKey.set(key, rel)
    if (!expectedKeys.has(key)) {
      await deleteRelationship(rel.id)
    }
  }

  for (const edge of expectedEdges) {
    const key = relKey(edge.type, edge.a, edge.b)
    if (existingByKey.has(key)) continue
    await saveRelationship(null, {
      familyId,
      type: edge.type,
      personAId: edge.a,
      personBId: edge.b,
      marriage: null,
      marriagePlace: null,
      endDate: null,
      endReason: null,
      confidence: 'manual',
      importMeta: null,
    })
  }
}
