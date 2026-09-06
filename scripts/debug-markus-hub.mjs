import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { buildStructure, assignGenerations } from '../src/features/tree/layout/family-structure.ts'
import { buildBranchForest } from '../src/features/tree/layout/branch-tree.ts'
import {
  hasHalfSiblingChildrenOnHub,
  unionIdForChildOnRow,
} from '../src/features/tree/layout/layout-order.ts'
import { applyBranchContractLayoutWithTrace } from '../src/features/tree/layout/branch-contract-layout.ts'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/features/tree/layout/aguilar-graph.fixture.json',
)
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
const people = fixture.people.map((entry) =>
  person(entry.id, entry.givenNames, {
    familyName: entry.familyName,
    birth: entry.birthYear == null ? null : { year: entry.birthYear, precision: 'year' },
  }),
)
let relationships = fixture.relationships.map((entry) =>
  entry.type === 'spouse' ? spouse(entry.a, entry.b) : parentChild(entry.a, entry.b),
)
// Live backup: Viktoria is Markus-only child (half-sibling)
relationships = relationships.filter(
  (rel) =>
    !(rel.type === 'parent_child' && rel.personAId === '54f3eaf5c' && rel.personBId === '11480c3217'),
)

const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))

const ids = {
  carmen: '54f3eaf5c',
  markus: '990389013',
  nadja: 'b441f4fb',
  viktoria: '11480c3217',
  benjamin: '275d2456e',
  matthias: '4d916feae',
  jim: '644ac9549',
  johanna: '918022ad',
}
const hubKids = [ids.nadja, ids.viktoria, ids.benjamin, ids.matthias, ids.jim, ids.johanna]
const name = (id) => fixture.people.find((p) => p.id === id)?.givenNames ?? id

const structure = buildStructure(
  model.edges,
  new Map(model.nodes.map((n) => [n.id, n.kind])),
)
const gens = assignGenerations(
  model.nodes.filter((n) => n.kind === 'person').map((n) => n.id),
  structure,
)
const nodeById = new Map(model.nodes.map((n) => [n.id, n]))

const hubMembers = [`person:${ids.carmen}`, `person:${ids.markus}`]
const childIds = hubKids.map((id) => `person:${id}`)
console.log('=== LIVE-CORRECT Viktoria parents (Markus only) ===')
console.log(
  'Viktoria parents',
  (structure.parentsOfPerson.get(`person:${ids.viktoria}`) ?? []).map((p) =>
    name(p.replace('person:', '')),
  ),
)
for (const cid of childIds) {
  console.log(name(cid.replace('person:', '')), unionIdForChildOnRow(cid, new Set(hubMembers), structure))
}
console.log('hasHalfSiblingChildrenOnHub', hasHalfSiblingChildrenOnHub(childIds, hubMembers, structure))

const forest = buildBranchForest([...gens.keys()], structure, gens, nodeById)
function walk(b, depth = 0) {
  const hasHub = b.members.some((m) => m.endsWith(ids.carmen) || m.endsWith(ids.markus))
  if (hasHub) {
    console.log(
      ' '.repeat(depth),
      name(b.anchorId.replace('person:', '')),
      'row',
      b.row,
      'kids',
      b.directChildIds.map((c) => name(c.replace('person:', ''))).join(', '),
      'nested',
      b.childBranches.length,
    )
    for (const cb of b.childBranches) walk(cb, depth + 1)
  } else {
    for (const cb of b.childBranches) walk(cb, depth)
  }
}
console.log('\n=== Branch tree ===')
for (const b of forest.branches) walk(b)

const layout = await computeTreeLayout(model)
const px = (id) => layout.nodes.find((n) => n.personId === id)
console.log('\n=== Final layout order ===')
for (const id of hubKids) {
  const n = px(id)
  console.log(name(id), 'x', n?.x)
}
console.log(
  'order:',
  hubKids
    .map((id) => ({ id, x: px(id)?.x ?? -1 }))
    .sort((a, b) => a.x - b.x)
    .map((e) => name(e.id))
    .join(' < '),
)

const personNodes = model.nodes
  .filter((n) => n.kind === 'person')
  .map((n) => ({ ...n, x: 0, y: 0 }))
const traces = applyBranchContractLayoutWithTrace(personNodes, structure, gens)
for (const { step } of traces) {
  const trace = traces.find((t) => t.step === step)
  if (!trace) continue
  const slice = trace.nodes
    .filter((n) => hubKids.includes(n.personId ?? ''))
    .sort((a, b) => a.x - b.x)
  if (slice.length === 0) continue
  console.log(
    step + ':',
    slice.map((n) => `${name(n.personId ?? '')}@${Math.round(n.x)}`).join(' | '),
  )
}

// Who occupies x between Nadja and Benjamin in final layout?
const nadja = px(ids.nadja)
const benjamin = px(ids.benjamin)
if (nadja && benjamin) {
  const lo = Math.min(nadja.x, benjamin.x)
  const hi = Math.max(nadja.x, benjamin.x)
  const between = layout.nodes
    .filter((n) => n.kind === 'person' && Math.abs(n.y - nadja.y) < 1 && n.x >= lo && n.x <= hi)
    .sort((a, b) => a.x - b.x)
  console.log(`\n=== Same row between Nadja and Benjamin x-range [${lo}, ${hi}] ===`)
  for (const n of between) {
    console.log(name(n.personId ?? ''), n.x)
  }
}
