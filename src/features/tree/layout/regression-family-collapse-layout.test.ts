import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hiddenPersonIds } from '../../../domain/collapse-branches'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { validateFamilyBackup } from '../../../features/backup/family-backup-schema'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'
import { SIBLING_GAP } from './layout-spacing'

const REGRESSION_BACKUP_PATH = join(process.cwd(), 'test-data/regression-family-backup.json')

const MARKUS_ID = 'ARdnZDZVUlWu14bHVeHX'
const CLARA_ID = 'BSw9TS8t6VXFAPzaWwCu'
const CLARA_UNION = `union:${[CLARA_ID, MARKUS_ID].sort().join('|')}`
const ANA_ID = 'DI3374pOYSbDTpbm0SXL'
const PETER_ID = 'Mn96Os0cRGly8FfGjTsn'
const GERMAN_ID = 'jgM8JC05Fdd5TLkwQ5xt'

function loadRegressionFamilyBackup() {
  const raw = JSON.parse(readFileSync(REGRESSION_BACKUP_PATH, 'utf8'))
  const validated = validateFamilyBackup(raw)
  if (!validated.ok) throw new Error(validated.error)
  return validated.backup
}

describe('regression family collapse — gen1 sibling hubs', () => {
  it('keeps Hugo clear of Peter after folding Alex and Clara', async () => {
    const backup = loadRegressionFamilyBackup()

    const fullGraph = buildFamilyGraph(backup.family.id, backup.people, backup.relationships)
    const claraUnion = CLARA_UNION

    const hidden = hiddenPersonIds(fullGraph, new Set([claraUnion]))
    const visiblePeople = backup.people.filter((person) => !hidden.has(person.id))
    const visibleRelationships = backup.relationships.filter(
      (rel) => !hidden.has(rel.personAId) && !hidden.has(rel.personBId),
    )
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(backup.family.id, visiblePeople, visibleRelationships),
        { retainUnionIds: [claraUnion] },
      ),
    )

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    const ana = node(ANA_ID)
    const peter = node(PETER_ID)
    const german = node(GERMAN_ID)
    const clusterGap = german.x - Math.max(ana.x + ana.width, peter.x + peter.width)

    expect(clusterGap).toBeGreaterThanOrEqual(SIBLING_GAP - 0.5)
    expect(german.x).toBeGreaterThanOrEqual(peter.x + peter.width - 0.5)
    expect(german.x).toBeGreaterThan(peter.x)
  })
})
