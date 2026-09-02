import type { RelationshipType } from '../types'

export function relationshipKey(
  type: RelationshipType,
  personAId: string,
  personBId: string,
): string {
  if (type === 'spouse') {
    const [a, b] = [personAId, personBId].sort()
    return `spouse:${a}|${b}`
  }
  return `parent_child:${personAId}|${personBId}`
}
