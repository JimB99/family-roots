import { deleteRelationship, saveRelationship } from './firestore'
import { displayName } from './tree'
import type { Person, Relationship } from '../types'

interface LinkEndpoint {
  personAId: string
  personBId: string
}

export function getMarriageCandidateFromLink(
  linkDatum: {
    spouse?: boolean
    source?: unknown
    target?: unknown
  },
  peopleById: Map<string, Person>,
): LinkEndpoint | null {
  if (linkDatum.spouse) return null

  const target = linkDatum.target as { data?: { id?: string; rels?: { parents?: string[] } } } | undefined
  const childId = target?.data?.id
  if (!childId) return null

  const child = peopleById.get(childId)
  if (!child) return null

  const parents = target?.data?.rels?.parents ?? []
  if (parents.length >= 2) {
    return { personAId: parents[0], personBId: parents[1] }
  }

  const source = linkDatum.source as Array<{ data?: { id?: string } }> | { data?: { id?: string } } | undefined
  const parentId = Array.isArray(source)
    ? source.find((node) => parents.includes(node.data?.id ?? ''))?.data?.id
    : source?.data?.id

  if (parentId && childId !== parentId) {
    return { personAId: parentId, personBId: childId }
  }

  return null
}

export async function convertParentChildToMarriage(
  candidate: LinkEndpoint,
  familyId: string,
  relationships: Relationship[],
  peopleById: Map<string, Person>,
): Promise<boolean> {
  const personA = peopleById.get(candidate.personAId)
  const personB = peopleById.get(candidate.personBId)
  if (!personA || !personB) return false

  const labelA = displayName(personA)
  const labelB = displayName(personB)
  const confirmed = window.confirm(
    `Convert the connection between ${labelA} and ${labelB} to a marriage?`,
  )
  if (!confirmed) return false

  const existingSpouse = relationships.find(
    (rel) =>
      rel.type === 'spouse' &&
      ((rel.personAId === candidate.personAId && rel.personBId === candidate.personBId) ||
        (rel.personAId === candidate.personBId && rel.personBId === candidate.personAId)),
  )
  if (existingSpouse) return false

  const parentChildRels = relationships.filter(
    (rel) =>
      rel.type === 'parent_child' &&
      ((rel.personAId === candidate.personAId && rel.personBId === candidate.personBId) ||
        (rel.personAId === candidate.personBId && rel.personBId === candidate.personAId)),
  )

  for (const rel of parentChildRels) {
    await deleteRelationship(rel.id)
  }

  await saveRelationship(null, {
    familyId,
    type: 'spouse',
    personAId: candidate.personAId,
    personBId: candidate.personBId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
  })

  return true
}
