import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { person, spouse, parentChild, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { applyDisplayPatches } from './apply-display-patches'
import { layoutModelStructureKey } from './layout-structure-key'
import { projectFamilyGraph } from './project-family-graph'

describe('layoutModelStructureKey', () => {
  it('is unchanged when only display names change', () => {
    const base = person('p1', 'Alice', { familyName: 'Smith' })
    const renamed = { ...base, givenNames: 'Alicia' }
    const rel = spouse('p1', 'p2')
    const other = person('p2', 'Bob')

    const keyBefore = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [base, other], [rel])),
    )
    const keyAfter = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [renamed, other], [rel])),
    )
    expect(keyBefore).toBe(keyAfter)
  })

  it('changes when birth year changes', () => {
    const base = person('p1', 'Alice', { birth: { year: 1950, precision: 'year' } })
    const updated = person('p1', 'Alice', { birth: { year: 1951, precision: 'year' } })
    const rel = parentChild('p1', 'c1')
    const child = person('c1', 'Child')

    const keyBefore = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [base, child], [rel])),
    )
    const keyAfter = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [updated, child], [rel])),
    )
    expect(keyBefore).not.toBe(keyAfter)
  })

  it('is unchanged when death year or notes change', () => {
    const base = person('p1', 'Alice', { death: null, notes: null })
    const updated = person('p1', 'Alice', {
      death: { year: 2020, precision: 'year' },
      notes: 'Updated notes',
    })
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [base], []))
    const keyBefore = layoutModelStructureKey(model)
    const keyAfter = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [updated], [])),
    )
    expect(keyBefore).toBe(keyAfter)
  })

  it('changes when a relationship is added', () => {
    const a = person('a', 'A')
    const b = person('b', 'B')
    const keySolo = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [a, b], [])),
    )
    const keyCouple = layoutModelStructureKey(
      projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [a, b], [spouse('a', 'b')])),
    )
    expect(keySolo).not.toBe(keyCouple)
  })
})

describe('applyDisplayPatches', () => {
  it('updates labels without changing positions', () => {
    const base = person('p1', 'Alice', { familyName: 'Smith' })
    const renamed = { ...base, givenNames: 'Alicia' }
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [base], []))
    const layout = {
      nodes: model.nodes.map((node) => ({ ...node, x: 10, y: 20 })),
      edges: model.edges,
      components: model.components,
      bounds: model.bounds,
    }

    const patched = applyDisplayPatches(layout, new Map([['p1', renamed]]))
    const node = patched.nodes.find((n) => n.personId === 'p1')
    expect(node).toBeDefined()
    expect(node!.label).toBe('Alicia Smith')
    expect(node!.x).toBe(10)
    expect(node!.y).toBe(20)
  })
})
