import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import type { Relationship } from '../../../types'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { computeTreeLayoutAsync } from './compute-layout-async'
import { layoutModelStructureKey } from './layout-structure-key'
import { projectFamilyGraph } from './project-family-graph'

function loadLargeSyntheticModel() {
  const people = [person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })]
  const relationships: Relationship[] = []

  for (let branch = 0; branch < 100; branch++) {
    const parentId = `p${branch}`
    people.push(person(parentId, `P${branch}`, { birth: { year: 1930 + branch, precision: 'year' } }))
    relationships.push(parentChild('gp', parentId))
    for (let child = 0; child < 3; child++) {
      const childId = `p${branch}-c${child}`
      people.push(person(childId, `P${branch}C${child}`, { birth: { year: 1960 + child, precision: 'year' } }))
      relationships.push(parentChild(parentId, childId))
    }
  }

  return projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
}

describe('layout performance', () => {
  it('lays out a large synthetic tree interactively within 20 seconds', async () => {
    const model = loadLargeSyntheticModel()
    const started = performance.now()
    const layout = await computeTreeLayoutAsync(model, { quality: 'interactive' })
    expect(performance.now() - started).toBeLessThan(20_000)
    expect(layout.nodes.length).toBeGreaterThan(300)
  })

  it('structure key is stable when only display names change', () => {
    const base = person('p1', 'Alice', { familyName: 'Smith', birth: { year: 1950, precision: 'year' } })
    const renamed = { ...base, givenNames: 'Alicia' }
    const other = person('p2', 'Bob')
    const rel = spouse('p1', 'p2')
    const keyBefore = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [base, other], [rel])),
    )
    const keyAfter = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [renamed, other], [rel])),
    )
    expect(keyAfter).toBe(keyBefore)
  })
})
