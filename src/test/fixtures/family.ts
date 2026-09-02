import type { Person, Relationship } from '../../types'

export const TEST_FAMILY_ID = 'test-family'

export function person(
  id: string,
  givenNames: string,
  overrides: Partial<Person> = {},
): Person {
  return {
    id,
    familyId: TEST_FAMILY_ID,
    givenNames,
    familyName: 'Test',
    maidenName: null,
    gender: 'unknown',
    birth: null,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: null,
    notes: null,
    importKey: null,
    ...overrides,
  }
}

export function parentChild(parentId: string, childId: string, id?: string): Relationship {
  return {
    id: id ?? `${parentId}-${childId}`,
    familyId: TEST_FAMILY_ID,
    type: 'parent_child',
    personAId: parentId,
    personBId: childId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
  }
}

export function spouse(aId: string, bId: string, id?: string): Relationship {
  return {
    id: id ?? `spouse-${aId}-${bId}`,
    familyId: TEST_FAMILY_ID,
    type: 'spouse',
    personAId: aId,
    personBId: bId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
  }
}

export const fullPersonFields: Person = person('full', 'Full Fields', {
  maidenName: 'Maiden',
  gender: 'female',
  birth: { year: 1950, month: 3, day: 15, precision: 'day' },
  death: null,
  birthPlace: 'Amsterdam',
  deathPlace: null,
  isLiving: true,
  photoBase64: 'data:image/jpeg;base64,abc',
  notes: 'Important notes',
  importKey: 'import-1',
  treeOffsetX: 10,
  treeOffsetY: 20,
})
