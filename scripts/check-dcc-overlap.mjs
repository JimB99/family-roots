import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import {
  DEEP_COUSIN_COLUMN_PEOPLE,
  DEEP_COUSIN_COLUMN_RELATIONSHIPS,
} from '../src/test/fixtures/deep-cousin-column-scenario.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import { structureFromModel } from '../src/features/tree/layout/family-structure.ts'
import { analyzeLayout } from '../src/features/tree/layout/layout-invariants.ts'

const model = projectFamilyGraph(
  buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
)
const layout = await computeTreeLayout(model)
const report = analyzeLayout(layout, structureFromModel(model))
console.log('overlapRows', report.overlapRows)
for (const y of report.overlapRows) {
  const row = layout.nodes
    .filter((n) => n.kind === 'person' && Math.abs(n.y - y) < 0.5)
    .sort((a, b) => a.x - b.x)
  for (const n of row) {
    console.log(`  y=${y} ${n.personId} x=${Math.round(n.x)}..${Math.round(n.x + n.width)}`)
  }
}
