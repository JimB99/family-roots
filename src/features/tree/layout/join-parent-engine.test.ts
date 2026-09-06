/**
 * Engine vs approved join-parent edge-case golden layouts.
 */
import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { JOIN_PARENT_CASE_IDS } from '../../../test/fixtures/join-parent-edge-cases'
import { buildJoinParentCaseGraph } from '../../../test/fixtures/join-parent-case-graphs'
import { JOIN_PARENT_EDGE_CASES_GOLDEN } from '../../../test/fixtures/join-parent-edge-cases.golden'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { computeTreeLayout } from './compute-tree-layout'
import { joinParentGoldenDiffs } from './join-parent-contract-reference'
import { projectFamilyGraph } from './project-family-graph'
import { PERSON_H, ROW_GAP } from './layout-spacing'

const ROW_STEP = PERSON_H + ROW_GAP

function layoutPersonNodes(layout: Awaited<ReturnType<typeof computeTreeLayout>>) {
  return layout.nodes.filter((node) => node.kind === 'person')
}

describe('join-parent layout engine vs contract', () => {
  for (const caseId of JOIN_PARENT_CASE_IDS) {
    it(`${caseId} matches frozen golden coordinates`, async () => {
      const graphSpec = buildJoinParentCaseGraph(caseId)
      const graph = buildFamilyGraph(TEST_FAMILY_ID, graphSpec.people, graphSpec.relationships)
      const model = projectFamilyGraph(graph)
      const layout = await computeTreeLayout(model)
      const golden = JOIN_PARENT_EDGE_CASES_GOLDEN[caseId]

      const actual = layoutPersonNodes(layout).map((node) => {
        const gen = Math.round(node.y / ROW_STEP) as 0 | 1 | 2
        return {
          id: node.personId ?? node.id,
          gen,
          x: Math.round(node.x),
          y: Math.round(node.y),
          cx: Math.round(node.x + node.width / 2),
          cy: Math.round(node.y + node.height / 2),
          leftEdge: Math.round(node.x),
          rightEdge: Math.round(node.x + node.width),
        }
      })

      const diffs = joinParentGoldenDiffs(actual, golden)
      expect(diffs, diffs.join('\n')).toEqual([])
    })
  }
})
