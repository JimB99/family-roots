import { readFileSync } from 'node:fs'
import { validateFamilyBackup } from '../src/features/backup/family-backup-schema.ts'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'

const path = process.argv[2] ?? 'c:/Users/JimBuisman/Downloads/aguilar-backup.json'
const raw = JSON.parse(readFileSync(path, 'utf8'))
const v = validateFamilyBackup(raw)
if (!v.ok) {
  console.error(v.error)
  process.exit(1)
}
const backup = v.backup
const graph = buildFamilyGraph(backup.family.id, backup.people, backup.relationships)
const model = projectFamilyGraph(graph)
const persons = model.nodes.filter((n) => n.kind === 'person')
const byComp = new Map()
for (const p of persons) byComp.set(p.componentId, (byComp.get(p.componentId) ?? 0) + 1)
const sorted = [...byComp.entries()].sort((a, b) => b[1] - a[1])
console.log('components', sorted.length)
console.log('top', sorted.slice(0, 5))
const layout = await computeTreeLayout(model)
console.log('width', Math.round(layout.bounds.maxX))
