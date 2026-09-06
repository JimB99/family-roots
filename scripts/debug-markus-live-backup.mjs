import { readFileSync } from 'node:fs'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'

const backup = JSON.parse(
  readFileSync('c:/Users/JimBuisman/Downloads/aguilar-backup.json', 'utf8'),
)

const model = projectFamilyGraph(
  buildFamilyGraph('aguilar', backup.people, backup.relationships),
)
const layout = await computeTreeLayout(model)

const find = (name, birthYear) =>
  backup.people.find(
    (p) => p.givenNames === name && (birthYear == null || p.birth?.year === birthYear),
  )
const ids = {
  nadja: find('Nadja').id,
  viktoria: find('Viktoria').id,
  benjamin: find('Benjamin').id,
  markus: find('Markus').id,
  carmen: find('Carmen', 1957).id,
}

const node = (id) => layout.nodes.find((n) => n.personId === id)
for (const [label, id] of Object.entries(ids)) {
  const n = node(id)
  console.log(label, n?.x, n?.y)
}

const nadja = node(ids.nadja)
const viktoria = node(ids.viktoria)
const benjamin = node(ids.benjamin)
console.log('\nOrder check:', {
  viktoriaBetween: viktoria.x > nadja.x && viktoria.x < benjamin.x,
  nadjaX: nadja.x,
  viktoriaX: viktoria.x,
  benjaminX: benjamin.x,
})

const lo = Math.min(nadja.x, benjamin.x)
const hi = Math.max(nadja.x, benjamin.x)
const between = layout.nodes
  .filter(
    (n) =>
      n.kind === 'person' &&
      Math.abs(n.y - nadja.y) < 1 &&
      n.x >= lo - 1 &&
      n.x <= hi + 1,
  )
  .sort((a, b) => a.x - b.x)
console.log(
  '\nBetween Nadja and Benjamin:',
  between
    .map((n) => {
      const p = backup.people.find((person) => person.id === n.personId)
      return `${p?.givenNames}@${Math.round(n.x)}`
    })
    .join(' | '),
)

const hubNames = ['Nadja', 'Viktoria', 'Benjamin', 'Matthias', 'Jim', 'Johanna']
const hubNodes = hubNames.map((name) => node(find(name).id))
const row = layout.nodes
  .filter((n) => n.kind === 'person' && Math.abs(n.y - hubNodes[0].y) < 1)
  .sort((a, b) => a.x - b.x)
console.log('\nRow size', row.length, 'y=', hubNodes[0].y)
console.log(
  'Hub order:',
  hubNodes
    .map((n) => `${backup.people.find((p) => p.id === n.personId)?.givenNames}@${Math.round(n.x)}`)
    .join(' < '),
)
const v = hubNodes[1]
let vOverlaps = 0
for (const n of row) {
  if (n.personId === v.personId) continue
  if (n.x + n.width > v.x + 0.5 && v.x + v.width > n.x + 0.5) {
    vOverlaps++
    const p = backup.people.find((x) => x.id === n.personId)
    console.log(
      'Viktoria overlaps',
      p?.givenNames,
      `[${Math.round(n.x)}-${Math.round(n.x + n.width)}] vs Viktoria [${Math.round(v.x)}-${Math.round(v.x + v.width)}]`,
    )
  }
}
console.log('Viktoria overlap count', vOverlaps)
