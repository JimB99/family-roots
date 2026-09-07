import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import {
  JOIN_DEEP_COUSIN_PEOPLE,
  JOIN_DEEP_COUSIN_RELATIONSHIPS,
} from '../src/test/fixtures/join-deep-cousin-scenario.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { assignGenerations, structureFromModel } from '../src/features/tree/layout/family-structure.ts'
import {
  analyzeLayout,
  branchColumnViolations,
  invariantFailures,
  topLevelForestBranchRowOverlapViolations,
} from '../src/features/tree/layout/layout-invariants.ts'
import { buildBranchForest } from '../src/features/tree/layout/branch-tree.ts'
import { applyBranchContractLayoutWithTrace } from '../src/features/tree/layout/branch-contract-layout.ts'
import { FAMILY_GAP, PERSON_H, ROW_GAP } from '../src/features/tree/layout/layout-spacing.ts'

const model = projectFamilyGraph(
  buildFamilyGraph(TEST_FAMILY_ID, JOIN_DEEP_COUSIN_PEOPLE, JOIN_DEEP_COUSIN_RELATIONSHIPS),
)
const layout = await computeTreeLayout(model)
const structure = structureFromModel(model)
const report = analyzeLayout(layout, structure)
const failures = invariantFailures(report, {})

console.log('bounds', layout.bounds)
console.log('components', layout.components?.length ?? 'n/a')
console.log('overlap rows', report.overlapRows)
console.log('failure count', failures.length)
console.log('first 25 failures:')
for (const f of failures.slice(0, 25)) console.log(' ', f)

const persons = model.nodes.filter((n) => n.kind === 'person')
const gens = assignGenerations(persons.map((n) => n.id), structure)
const nodeById = new Map(persons.map((n) => [n.id, n]))
const forest = buildBranchForest(persons.map((n) => n.id), structure, gens, nodeById)
const bc = branchColumnViolations(layout, forest.branches, structure)
console.log('branch column violations', bc.length)
for (const v of bc.slice(0, 20)) console.log(' ', v)
const top = topLevelForestBranchRowOverlapViolations(layout, forest.branches, structure)
console.log('top level overlaps', top.length)
for (const v of top.slice(0, 15)) console.log(' ', v)

const byY = new Map()
for (const n of layout.nodes.filter((n) => n.kind === 'person')) {
  const y = Math.round(n.y)
  if (!byY.has(y)) byY.set(y, [])
  byY.get(y).push(n)
}

console.log('\nRow issues (overlap or gap > FAMILY_GAP+500):')
for (const [y, nodes] of [...byY.entries()].sort((a, b) => a[0] - b[0])) {
  const sorted = nodes.sort((a, b) => a.x - b.x)
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width)
    if (gap < -1) {
      console.log(`OVERLAP y=${y}`, sorted[i - 1].personId, '->', sorted[i].personId, `gap=${Math.round(gap)}`)
    }
    if (gap > FAMILY_GAP + 500) {
      console.log(`HUGE GAP y=${y}`, sorted[i - 1].personId, '->', sorted[i].personId, `gap=${Math.round(gap)}`)
    }
  }
}

const n = (id) => layout.nodes.find((x) => x.personId === id)
console.log('gens pa', gens.get('pa'), 'pb', gens.get('pb'), 'a1', gens.get('a1'), 'b1', gens.get('b1'))
console.log('top branches', forest.branches.length)
for (const b of forest.branches) {
  console.log(
    b.id,
    'anchor',
    b.anchorId,
    'row',
    b.row,
    'children',
    b.directChildIds.join(','),
    'childBranches',
    b.childBranches.length,
  )
}

const gen1Y = n('a1')?.y
const gen1 = layout.nodes
  .filter((x) => x.kind === 'person' && x.y === gen1Y)
  .sort((a, b) => a.x - b.x)
  .map((x) => `${x.personId}@${Math.round(x.x)}`)
console.log(gen1.join(' | '))

const positioned = persons.map((n) => ({
  ...n,
  x: 0,
  y: (gens.get(n.id) ?? 0) * (PERSON_H + ROW_GAP),
}))
const trace = applyBranchContractLayoutWithTrace(positioned, structure, gens)
for (const step of trace) {
  const pick = (id) => Math.round(step.nodes.find((n) => n.personId === id)?.x ?? -1)
  console.log(
    step.step,
    'pa',
    pick('pa'),
    'a1',
    pick('a1'),
    'a2',
    pick('a2'),
    'a3',
    pick('a3'),
    'b3',
    pick('b3'),
    'b1',
    pick('b1'),
  )
}

import { applyJoinParentPlacement } from '../src/features/tree/layout/join-parent-placement.ts'
const gen1Row = 1
const rowPersonIds = persons.map((n) => n.id).filter((id) => (gens.get(id) ?? 0) === gen1Row)
console.log('gen1 row person count', rowPersonIds.length)
const positioned2 = persons.map((n) => ({
  ...n,
  x: 0,
  y: (gens.get(n.id) ?? 0) * (PERSON_H + ROW_GAP),
}))
applyBranchContractLayoutWithTrace(positioned2, structure, gens)
const applied = applyJoinParentPlacement(positioned2, structure, gens)
console.log('join parent applied standalone?', applied)
