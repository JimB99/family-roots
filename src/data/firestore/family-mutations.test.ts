import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Person, Relationship } from '../../types'

const { getPersonById, listRelationshipsForFamily, deletePersonCascade } = vi.hoisted(() => ({
  getPersonById: vi.fn(),
  listRelationshipsForFamily: vi.fn(),
  deletePersonCascade: vi.fn(),
}))

vi.mock('./person-repository', () => ({
  getPersonById,
  deletePersonCascade,
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
}))

vi.mock('./relationship-repository', () => ({
  listRelationshipsForFamily,
  createRelationship: vi.fn(),
  deleteRelationshipById: vi.fn(),
  replaceRelationshipAtomic: vi.fn(),
}))

import { deletePersonWithRelationships } from './family-mutations'

describe('deletePersonWithRelationships', () => {
  const person: Person = {
    id: 'p1',
    familyId: 'fam',
    givenNames: 'Ada',
    familyName: 'Lovelace',
    maidenName: null,
    gender: 'female',
    birth: null,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: null,
    notes: null,
    importKey: null,
    treeOffsetX: null,
    treeOffsetY: null,
    createdBy: null,
  }

  const relationships: Relationship[] = [
    {
      id: 'r1',
      familyId: 'fam',
      type: 'parent_child',
      personAId: 'p2',
      personBId: 'p1',
      marriage: null,
      marriagePlace: null,
      endDate: null,
      endReason: null,
      confidence: 'manual',
      importMeta: null,
    },
    {
      id: 'r2',
      familyId: 'fam',
      type: 'spouse',
      personAId: 'p1',
      personBId: 'p3',
      marriage: null,
      marriagePlace: null,
      endDate: null,
      endReason: null,
      confidence: 'manual',
      importMeta: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    deletePersonCascade.mockResolvedValue(undefined)
  })

  it('uses provided relationships instead of querying Firestore', async () => {
    await deletePersonWithRelationships('fam', 'p1', { person, relationships })

    expect(listRelationshipsForFamily).not.toHaveBeenCalled()
    expect(getPersonById).not.toHaveBeenCalled()
    expect(deletePersonCascade).toHaveBeenCalledWith('p1', ['r1', 'r2'])
  })

  it('falls back to Firestore when relationships are not provided', async () => {
    getPersonById.mockResolvedValue(person)
    listRelationshipsForFamily.mockResolvedValue(relationships)

    await deletePersonWithRelationships('fam', 'p1')

    expect(getPersonById).toHaveBeenCalledWith('p1')
    expect(listRelationshipsForFamily).toHaveBeenCalledWith('fam')
    expect(deletePersonCascade).toHaveBeenCalledWith('p1', ['r1', 'r2'])
  })
})
