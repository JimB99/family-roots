import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import { applyBranchContractLayout, applyBranchContractLayoutWithTrace } from '../src/features/tree/layout/branch-contract-layout.ts'
import { compactEmptyVerticalGaps } from '../src/features/tree/layout/compact-subtrees.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { assignGenerations, structureFromModel } from '../src/features/tree/layout/family-structure.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { PERSON_H, ROW_GAP } from '../src/features/tree/layout/layout-spacing.ts'

const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
const wide = person('wide', 'Wide', { birth: { year: 1930, precision: 'year' } })
const wideSp = person('wide-sp', 'WideSp', { birth: { year: 1931, precision: 'year' } })
const narrow = person('narrow', 'Narrow', { birth: { year: 1932, precision: 'year' } })
const narrowSp = person('narrow-sp', 'NarrowSp', { birth: { year: 1933, precision: 'year' } })
const kids = ['k1', 'k2', 'k3', 'k4', 'k5'].map((id, i) =>
  person(id, `K${i + 1}`, { birth: { year: 1960 + i, precision: 'year' } }),
)
const n1 = person('n1', 'N1', { birth: { year: 1965, precision: 'year' } })
const n1sp = person('n1sp', 'N1Sp', { birth: { year: 1966, precision: 'year' } })
const n2 = person('n2', 'N2', { birth: { year: 1967, precision: 'year' } })
const rels = [
  parentChild('gp', 'wide'),
  parentChild('gp', 'narrow'),
  spouse('wide', 'wide-sp'),
  spouse('narrow', 'narrow-sp'),
  spouse('n1', 'n1sp'),
  ...['k1', 'k2', 'k3', 'k4', 'k5'].flatMap((kid) => [
    parentChild('wide', kid),
    parentChild('wide-sp', kid),
  ]),
  parentChild('narrow', 'n1'),
  parentChild('narrow-sp', 'n1'),
  parentChild('narrow', 'n2'),
  parentChild('narrow-sp', 'n2'),
]
const graph = buildFamilyGraph(TEST_FAMILY_ID, [gp, wide, wideSp, narrow, narrowSp, ...kids, n1, n1sp, n2], rels)
const model = projectFamilyGraph(graph)
const structure = structureFromModel(model)
const persons = model.nodes.filter((n) => n.kind === 'person')
const personIds = persons.map((n) => n.id)
const gens = assignGenerations(personIds, structure)
const personHeight = persons[0]?.height ?? PERSON_H
const positioned = persons.map((person) => ({
  ...person,
  x: 0,
  y: (gens.get(person.id) ?? 0) * (personHeight + ROW_GAP),
}))

function coupleErr(layout, p1, p2, childIds) {
  const find = (id) =>
    layout.find((n) => n.personId === id || n.id === `person:${id}` || n.id === id)
  const mid = (ids) => {
    const ns = ids.map(find).filter(Boolean)
    return ns.reduce((s, n) => s + n.x + n.width / 2, 0) / ns.length
  }
  return Math.round(Math.abs(mid([p1, p2]) - mid(childIds)))
}

const laid = applyBranchContractLayout(positioned, structure, gens)
console.log('after branch contract', 'wide=' + coupleErr(laid, 'wide', 'wide-sp', ['k1', 'k2', 'k3', 'k4', 'k5']) + 'px')
const compact = compactEmptyVerticalGaps(laid)
console.log('after compactEmptyVerticalGaps', 'wide=' + coupleErr(compact, 'wide', 'wide-sp', ['k1', 'k2', 'k3', 'k4', 'k5']) + 'px')
const full = await computeTreeLayout(model)
console.log('after computeTreeLayout', 'wide=' + coupleErr(full.nodes, 'wide', 'wide-sp', ['k1', 'k2', 'k3', 'k4', 'k5']) + 'px')

const trace = applyBranchContractLayoutWithTrace(positioned, structure, gens)
for (const t of trace) {
  const we = coupleErr(t.nodes, 'wide', 'wide-sp', ['k1', 'k2', 'k3', 'k4', 'k5'])
  const ne = coupleErr(t.nodes, 'narrow', 'narrow-sp', ['n1', 'n2'])
  console.log(`${t.step.padEnd(28)} wide=${we}px narrow=${ne}px`)
}
