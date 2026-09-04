import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { computeTreeLayoutAsync } from './compute-layout-async'
import { layoutModelStructureKey } from './layout-structure-key'
import { projectFamilyGraph } from './project-family-graph'

function loadAguilarModel() {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    'aguilar-graph.fixture.json',
  )
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    people: Array<{ id: string; givenNames: string; familyName: string | null; birthYear: number | null }>
    relationships: Array<{ type: 'spouse' | 'parent_child'; a: string; b: string }>
  }
  const people = fixture.people.map((entry) =>
    person(entry.id, entry.givenNames, {
      familyName: entry.familyName,
      birth: entry.birthYear == null ? null : { year: entry.birthYear, precision: 'year' },
    }),
  )
  const relationships = fixture.relationships.map((entry) =>
    entry.type === 'spouse' ? spouse(entry.a, entry.b) : parentChild(entry.a, entry.b),
  )
  return projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
}

describe('layout performance', () => {
  it('lays out Aguilar interactively within 20 seconds', async () => {
    const model = loadAguilarModel()
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
