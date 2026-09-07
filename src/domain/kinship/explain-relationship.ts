import type { Gender } from '../../types'
import type { FamilyGraph, PersonId } from '../types'
import { findBloodKinship } from './blood-kinship'
import { areInSameComponent, findMarriageKinship } from './marriage-kinship'
import { invertKinshipDescriptor } from './invert-kinship-descriptor'
import type { KinshipDescriptor, KinshipResult } from './types'

const UNRELATED: KinshipDescriptor = { category: 'unrelated' }
export function explainRelationship(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipResult {
  if (fromId === toId) {
    return {
      fromId,
      toId,
      fromTo: { category: 'self' },
      toFrom: { category: 'self' },
      path: { personIds: [fromId] },
    }
  }

  const marriage = findMarriageKinship(graph, fromId, toId)
  if (marriage?.fromTo.category === 'spouse') {
    return {
      fromId,
      toId,
      fromTo: marriage.fromTo,
      toFrom: marriage.toFrom,
      path: { personIds: [fromId, toId] },
    }
  }

  const blood = findBloodKinship(graph, fromId, toId)
  if (blood) {
    return {
      fromId,
      toId,
      fromTo: blood.fromTo,
      toFrom: blood.toFrom,
      path: blood.path,
      alternates: blood.alternates.length > 0 ? blood.alternates : undefined,
    }
  }

  if (marriage) {
    return {
      fromId,
      toId,
      fromTo: marriage.fromTo,
      toFrom: marriage.toFrom ?? invertKinshipDescriptor(marriage.fromTo),
      path: { personIds: [fromId, toId] },
    }
  }

  if (!areInSameComponent(graph, fromId, toId)) {
    return {
      fromId,
      toId,
      fromTo: UNRELATED,
      toFrom: UNRELATED,
      path: null,
    }
  }

  return {
    fromId,
    toId,
    fromTo: UNRELATED,
    toFrom: UNRELATED,
    path: null,
  }
}

export function targetGender(graph: FamilyGraph, personId: PersonId): Gender {
  return graph.peopleById.get(personId)?.gender ?? 'unknown'
}
