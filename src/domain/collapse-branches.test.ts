import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hiddenPersonIds, isBranchCollapsed, toggleCollapsedPerson } from './collapse-branches.ts'
import { buildFamilyGraph } from './family-graph.ts'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family.ts'

describe('collapse branches', () => {
  const people = [
    person('antonio', 'Antonio'),
    person('josefa', 'Josefa'),
    person('carmen', 'Carmen'),
    person('markus', 'Markus'),
    person('jim', 'Jim'),
    person('inlaw', 'Inlaw'),
  ]
  const relationships = [
    spouse('antonio', 'josefa'),
    parentChild('antonio', 'carmen'),
    parentChild('josefa', 'carmen'),
    spouse('carmen', 'markus'),
    parentChild('carmen', 'jim'),
    parentChild('markus', 'jim'),
    spouse('jim', 'inlaw'),
  ]
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)

  it('hides descendants and their in-laws, not the folded couple', () => {
    const hidden = hiddenPersonIds(graph, new Set(['antonio']))
    assert.deepEqual([...hidden].sort(), ['carmen', 'inlaw', 'jim', 'markus'])
    assert.equal(hidden.has('antonio'), false)
    assert.equal(hidden.has('josefa'), false)
  })

  it('treats a person as collapsed when all their children are hidden', () => {
    const hidden = hiddenPersonIds(graph, new Set(['antonio']))
    assert.equal(isBranchCollapsed(graph, hidden, 'antonio'), true)
    assert.equal(isBranchCollapsed(graph, hidden, 'josefa'), true)
    assert.equal(isBranchCollapsed(graph, hidden, 'jim'), false)
  })

  it('expands when toggling a person whose children are already hidden', () => {
    const collapsed = toggleCollapsedPerson(graph, new Set(), 'antonio')
    assert.equal(collapsed.has('antonio'), true)
    const expanded = toggleCollapsedPerson(graph, collapsed, 'josefa')
    assert.equal(expanded.size, 0)
  })
})
