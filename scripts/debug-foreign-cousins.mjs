import { readFileSync } from 'node:fs'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { buildStructure, assignGenerations } from '../src/features/tree/layout/family-structure.ts'
import { applyBranchContractLayoutWithTrace } from '../src/features/tree/layout/branch-contract-layout.ts'
import { cousinGroupOrderViolations } from '../src/features/tree/layout/layout-invariants.ts'
import { shareNatalFamily } from '../src/features/tree/layout/legacy-pack-pedigree.ts'
import { downwardSet } from '../src/features/tree/layout/compact-subtrees.ts'
import { buildBranchForest } from '../src/features/tree/layout/branch-tree.ts'
import { branchSubtreeIds } from '../src/features/tree/layout/branch-shift.ts'

const backup = JSON.parse(
  readFileSync('c:/Users/JimBuisman/Downloads/aguilar-backup.json', 'utf8'),
)
const model = projectFamilyGraph(
  buildFamilyGraph('aguilar', backup.people, backup.relationships),
)
const structure = buildStructure(
  model.edges,
  new Map(model.nodes.map((n) => [n.id, n.kind])),
)
const gens = assignGenerations(
  model.nodes.filter((n) => n.kind === 'person').map((n) => n.id),
  structure,
)
const nodeById = new Map(model.nodes.map((n) => [n.id, n]))

const find = (name, birthYear) =>
  backup.people.find(
    (p) => p.givenNames === name && (birthYear == null || p.birth?.year === birthYear),
  )
const ids = {
  carmen: find('Carmen', 1957).id,
  markus: find('Markus').id,
  nadja: find('Nadja').id,
  viktoria: find('Viktoria').id,
  benjamin: find('Benjamin').id,
  juanAntonio: backup.people.find((p) => p.givenNames === 'Juan Antonio')?.id,
  adoracion: backup.people.find((p) => p.givenNames === 'Adoracion')?.id,
}
const name = (id) => backup.people.find((p) => p.id === id)?.givenNames ?? id

const layout = await computeTreeLayout(model)
console.log('cousinGroupOrderViolations', cousinGroupOrderViolations(layout, structure).slice(0, 5))

const px = (id) => layout.nodes.find((n) => n.personId === id)
const hubKids = ['nadja', 'viktoria', 'benjamin'].map((k) => ids[k])
const y = px(ids.nadja).y

// Find Markus hub branch in forest
const forest = buildBranchForest([...gens.keys()], structure, gens, nodeById)
let markusBranch = null
function walk(b) {
  const isHub = b.members.some((m) => m.endsWith(ids.carmen) || m.endsWith(ids.markus))
  if (isHub && b.directChildIds.some((c) => c.endsWith(ids.nadja))) markusBranch = b
  for (const cb of b.childBranches) walk(cb)
}
for (const b of forest.branches) walk(b)

const hubSubtree = markusBranch ? branchSubtreeIds(markusBranch, structure) : new Set()
console.log('\nMarkus hub branch row', markusBranch?.row, 'children', markusBranch?.directChildIds.map((c) => name(c.replace('person:', ''))))

// Hub band on child row
const hubRowNodes = layout.nodes.filter(
  (n) => n.kind === 'person' && Math.abs(n.y - y) < 1 && hubSubtree.has(`person:${n.personId}`),
)
const hubLeft = Math.min(...hubRowNodes.map((n) => n.x))
const hubRight = Math.max(...hubRowNodes.map((n) => n.x + n.width))
console.log('Hub subtree x band on child row', hubLeft, '-', hubRight)

const foreignOnRow = layout.nodes
  .filter((n) => n.kind === 'person' && Math.abs(n.y - y) < 1 && !hubSubtree.has(n.id))
  .sort((a, b) => a.x - b.x)

const overlappingForeign = foreignOnRow.filter(
  (n) => n.x + n.width > hubLeft + 0.5 && n.x < hubRight - 0.5,
)
console.log('\nForeign nodes overlapping hub band:', overlappingForeign.length)
for (const n of overlappingForeign.slice(0, 15)) {
  console.log(' ', name(n.personId), n.x, '-', n.x + n.width)
}

// Juan Antonio specifically
for (const key of ['juanAntonio', 'adoracion']) {
  const n = px(ids[key])
  if (!n) continue
  console.log(`\n${name(ids[key])}: x=${n.x} y=${n.y} overlaps hub=${n.x + n.width > hubLeft && n.x < hubRight}`)
}

// Trace key steps
const persons = model.nodes
  .filter((n) => n.kind === 'person')
  .map((n) => ({ ...n, x: 0, y: 0 }))
const traces = applyBranchContractLayoutWithTrace(persons, structure, gens)
for (const step of ['enforceRowMinimumGaps', 'repackHalfSiblingHubRows', 'alignUnionChildGroups']) {
  const trace = traces.find((t) => t.step === step)
  const slice = trace.nodes
    .filter((n) => hubKids.includes(n.personId ?? ''))
    .sort((a, b) => a.x - b.x)
  const ja = trace.nodes.find((n) => n.personId === ids.juanAntonio)
  const ad = trace.nodes.find((n) => n.personId === ids.adoracion)
  console.log(`\n${step}:`)
  console.log('  hub', slice.map((n) => `${name(n.personId)}@${Math.round(n.x)}`).join(' | '))
  if (ja) console.log('  Juan Antonio', Math.round(ja.x), 'overlaps hub band?', ja.x + ja.width > hubLeft && ja.x < hubRight)
  if (ad) console.log('  Adoracion', Math.round(ad.x))
}

// Check shareNatalFamily between Juan Antonio and Nadja
console.log(
  '\nshareNatalFamily(JuanAntonio, Nadja)',
  shareNatalFamily([`person:${ids.juanAntonio}`], [`person:${ids.nadja}`], structure),
)

// Subtree bounds overlap (all generations)
function boundsForIds(idSet) {
  const nodes = layout.nodes.filter((n) => idSet.has(n.id))
  if (nodes.length === 0) return null
  return {
    left: Math.min(...nodes.map((n) => n.x)),
    right: Math.max(...nodes.map((n) => n.x + n.width)),
    top: Math.min(...nodes.map((n) => n.y)),
    bottom: Math.max(...nodes.map((n) => n.y + n.height)),
  }
}
const jaIds = new Set([`person:${ids.juanAntonio}`, `person:${ids.adoracion}`])
for (const id of downwardSet([`person:${ids.juanAntonio}`], structure)) jaIds.add(id)

const hubBounds = boundsForIds(hubSubtree)
const jaBounds = boundsForIds(jaIds)
console.log('\nHub subtree bounds', hubBounds)
console.log('Juan Antonio subtree bounds', jaBounds)
if (hubBounds && jaBounds) {
  const xOverlap = hubBounds.right > jaBounds.left && jaBounds.right > hubBounds.left
  const yOverlap = hubBounds.bottom > jaBounds.top && jaBounds.bottom > hubBounds.top
  console.log('Subtree overlap x', xOverlap, 'y', yOverlap)
  if (xOverlap) {
    console.log('x gap (ja.left - hub.right)', jaBounds.left - hubBounds.right)
  }
}

// Who is still inside hub sibling band (direct children only)?
if (markusBranch) {
  const ordered = markusBranch.directChildIds
  let bandLeft = Infinity
  let bandRight = -Infinity
  for (const childId of ordered) {
    const nested = markusBranch.childBranches.find((cb) => cb.anchorId === childId || cb.members.includes(childId))
    const nodesOnRow = layout.nodes.filter(
      (n) =>
        n.kind === 'person' &&
        Math.abs(n.y - y) < 1 &&
        (nested ? branchSubtreeIds(nested, structure).has(n.id) : n.id.endsWith(childId.replace('person:', ''))),
    )
    if (nodesOnRow.length === 0) continue
    bandLeft = Math.min(bandLeft, ...nodesOnRow.map((n) => n.x))
    bandRight = Math.max(bandRight, ...nodesOnRow.map((n) => n.x + n.width))
  }
  console.log('\nSibling band (direct children columns)', bandLeft, '-', bandRight)
  const betweenForeign = foreignOnRow.filter((n) => n.x + n.width > bandLeft && n.x < bandRight)
  console.log('Foreign inside sibling band', betweenForeign.map((n) => name(n.personId)).join(', ') || '(none)')
}

// Parent row: foreign cousins overlapping Carmen+Markus span
const carmenNode = px(ids.carmen)
const markusNode = px(ids.markus)
const parentY = carmenNode.y
const parentRow = layout.nodes
  .filter((n) => n.kind === 'person' && Math.abs(n.y - parentY) < 1)
  .sort((a, b) => a.x - b.x)
const cmLeft = Math.min(carmenNode.x, markusNode.x)
const cmRight = Math.max(carmenNode.x + carmenNode.width, markusNode.x + markusNode.width)
const parentForeign = parentRow.filter(
  (n) => n.personId !== ids.carmen && n.personId !== ids.markus,
)
const parentOverlap = parentForeign.filter(
  (n) => n.x + n.width > cmLeft + 0.5 && n.x < cmRight - 0.5,
)
console.log('\nParent row y', parentY, 'Carmen-Markus span', cmLeft, '-', cmRight)
console.log(
  'Foreign overlapping parent couple:',
  parentOverlap.map((n) => `${name(n.personId)}@${Math.round(n.x)}`).join(' | ') || '(none)',
)
const nearParent = parentRow.filter((n) => n.x >= cmLeft - 400 && n.x <= cmRight + 1200)
console.log(
  'Parent row near Carmen-Markus:',
  nearParent.map((n) => `${name(n.personId)}@${Math.round(n.x)}`).join(' | '),
)
