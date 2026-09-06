/**
 * Engine vs approved S14 layout contract.
 *
 * Failures here mean the layout engine does not yet match the approved contract.
 * Do not weaken these assertions to greenwash regressions — fix the engine or,
 * with manual review, update the golden reference in `three-gen-layout-contract.golden.ts`.
 */
import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import {
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../../../test/fixtures/three-gen-layout-contract'
import { THREE_GEN_CONTRACT_GOLDEN } from '../../../test/fixtures/three-gen-layout-contract.golden'
import { computeTreeLayout } from './compute-tree-layout'
import {
  contractRuleViolations,
  formatViolations,
  goldenPlacementDiffs,
} from './layout-contract-assertions'
import { projectFamilyGraph } from './project-family-graph'

describe('S14 layout engine vs contract', () => {
  it('matches approved placement rules and golden coordinates', async () => {
    const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
    const model = projectFamilyGraph(graph)
    const layout = await computeTreeLayout(model)

    const ruleViolations = contractRuleViolations(layout)
    const goldenDiffs = goldenPlacementDiffs(layout, THREE_GEN_CONTRACT_GOLDEN)

    expect(
      ruleViolations,
      `contract rule violations:\n${formatViolations(ruleViolations)}`,
    ).toEqual([])
    expect(goldenDiffs, `golden coordinate diffs:\n${goldenDiffs.join('\n')}`).toEqual([])
  })
})
