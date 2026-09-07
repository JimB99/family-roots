import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import {
  DEEP_COUSIN_COLUMN_PEOPLE,
  DEEP_COUSIN_COLUMN_RELATIONSHIPS,
} from '../src/test/fixtures/deep-cousin-column-scenario.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { buildBranchForest } from '../src/features/tree/layout/branch-tree.ts'
import { assignGenerations, structureFromModel } from '../src/features/tree/layout/family-structure.ts'
import { FAMILY_GAP, SIBLING_GAP } from '../src/features/tree/layout/layout-spacing.ts'

import { applyBranchContractLayoutWithTrace } from '../src/features/tree/layout/branch-contract-layout.ts'
import { PERSON_H, ROW_GAP } from '../src/features/tree/layout/layout-spacing.ts'

const model = projectFamilyGraph(
  buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
)
const layout = await computeTreeLayout(model)
const structure = structureFromModel(model)
const persons = model.nodes.filter((n) => n.kind === 'person')
const gens = assignGenerations(persons.map((n) => n.id), structure)
const nodeById = new Map(persons.map((n) => [n.id, n]))
const forest = buildBranchForest(persons.map((n) => n.id), structure, gens, nodeById)

const n = (id) => {
  const node = layout.nodes.find((x) => x.personId === id)
  if (!node) throw new Error(`missing ${id}`)
  return node
}
const gap = (a, b) => n(b).x - (n(a).x + n(a).width)

console.log(`Expected: SIBLING_GAP=${SIBLING_GAP} FAMILY_GAP=${FAMILY_GAP}`)
console.log('c2->c3 (gen2 cousins):', gap('c2', 'c3'))
console.log('f2->f3a (gen3 under c2/c3):', gap('f2', 'f3a'))
console.log('c1->c2 (gen2 cousins):', gap('c1', 'c2'))
console.log('ben->f2c (gen4):', gap('ben', 'f2c'))

for (const id of ['c1', 'c2', 'c3', 'd1', 'mark', 'marksp', 'f2', 'f3a', 'f3e', 'ben', 'f2c', 'e1']) {
  const node = n(id)
  console.log(`${id}: x=${Math.round(node.x)} y=${Math.round(node.y)}`)
}

function printBranch(b, depth = 0) {
  const pad = '  '.repeat(depth)
  const members = b.members.map((m) => m.replace('person:', '')).join(',')
  console.log(`${pad}${b.id} row=${b.row} children=[${b.directChildIds.join(',')}]`)
  for (const c of b.childBranches) printBranch(c, depth + 1)
}
console.log('\nFOREST under ana branch:')
const ana = forest.branches.find((b) => b.anchorId.includes('ana') || b.members.some((m) => m.includes('ana')))
if (ana) printBranch(ana)

const positioned = persons.map((n) => ({
  ...n,
  x: 0,
  y: (gens.get(n.id) ?? 0) * (PERSON_H + ROW_GAP),
}))
const trace = applyBranchContractLayoutWithTrace(positioned, structure, gens)
console.log('\nTRACE')
for (const step of trace) {
  const pick = (id) => Math.round(step.nodes.find((n) => n.personId === id)?.x ?? -1)
  console.log(
    step.step,
    'c1',
    pick('c1'),
    'c2',
    pick('c2'),
    'f2',
    pick('f2'),
    'f3a',
    pick('f3a'),
    'ben',
    pick('ben'),
    'f2c',
    pick('f2c'),
  )
}
