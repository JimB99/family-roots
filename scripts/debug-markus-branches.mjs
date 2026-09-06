import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { buildStructure, assignGenerations } from '../src/features/tree/layout/family-structure.ts'
import { buildBranchForest } from '../src/features/tree/layout/branch-tree.ts'
import { branchSubtreeIds } from '../src/features/tree/layout/branch-shift.ts'

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../src/features/tree/layout/aguilar-graph.fixture.json'),
    'utf8',
  ),
)
const people = fixture.people.map((entry) =>
  person(entry.id, entry.givenNames, {
    familyName: entry.familyName,
    birth: entry.birthYear == null ? null : { year: entry.birthYear, precision: 'year' },
  }),
)
let relationships = fixture.relationships.map((entry) =>
  entry.type === 'spouse' ? spouse(entry.a, entry.b) : parentChild(entry.a, entry.b),
)
relationships = relationships.filter(
  (rel) =>
    !(rel.type === 'parent_child' && rel.personAId === '54f3eaf5c' && rel.personBId === '11480c3217'),
)
const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
const structure = buildStructure(
  model.edges,
  new Map(model.nodes.map((n) => [n.id, n.kind])),
)
const gens = assignGenerations(
  model.nodes.filter((n) => n.kind === 'person').map((n) => n.id),
  structure,
)
const nodeById = new Map(model.nodes.map((n) => [n.id, n]))
const forest = buildBranchForest([...gens.keys()], structure, gens, nodeById)
const name = (id) => fixture.people.find((p) => p.id === id)?.givenNames ?? id

function findBranch(predicate, branches = forest.branches) {
  for (const b of branches) {
    if (predicate(b)) return b
    const nested = findBranch(predicate, b.childBranches)
    if (nested) return nested
  }
  return null
}

const carmenBranch = findBranch((b) => b.members.some((m) => m.endsWith('54f3eaf5c')))
if (!carmenBranch) throw new Error('no carmen branch')

console.log('Carmen branch directChildIds:', carmenBranch.directChildIds.map((c) => name(c.replace('person:', ''))))
console.log('childBranches:')
for (const cb of carmenBranch.childBranches) {
  console.log(
    ' ',
    name(cb.anchorId.replace('person:', '')),
    'members',
    cb.members.map((m) => name(m.replace('person:', ''))),
    'directChildIds',
    cb.directChildIds.map((c) => name(c.replace('person:', ''))),
    'subtreeSize',
    branchSubtreeIds(cb, structure).size,
  )
}

const nadjaBranch = carmenBranch.childBranches.find((b) => b.members.some((m) => m.endsWith('b441f4fb')))
if (nadjaBranch) {
  console.log('\nNadja subtree ids:')
  for (const id of branchSubtreeIds(nadjaBranch, structure)) {
    console.log(' ', name(id.replace('person:', '')))
  }
}
