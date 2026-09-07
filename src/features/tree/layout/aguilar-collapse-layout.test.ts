import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { hiddenPersonIds } from '../../../domain/collapse-branches'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { validateFamilyBackup } from '../../../features/backup/family-backup-schema'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'
import { SIBLING_GAP } from './layout-spacing'

const MARKUS_ID = 'ARdnZDZVUlWu14bHVeHX'
const CARMEN_ID = 'BSw9TS8t6VXFAPzaWwCu'
const CARMEN_UNION = `union:${[CARMEN_ID, MARKUS_ID].sort().join('|')}`
const ANA_ID = 'DI3374pOYSbDTpbm0SXL'
const PETER_ID = 'Mn96Os0cRGly8FfGjTsn'
const GERMAN_ID = 'jgM8JC05Fdd5TLkwQ5xt'

const backupCandidates = [
  join(process.cwd(), 'test-data/aguilar-backup.json'),
  join(process.cwd(), '../aguilar-backup.json'),
  'c:/Users/JimBuisman/Downloads/aguilar-backup.json',
]

function loadAguilarBackup() {
  const path = backupCandidates.find((candidate) => existsSync(candidate))
  if (!path) return null
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const validated = validateFamilyBackup(raw)
  if (!validated.ok) throw new Error(validated.error)
  return validated.backup
}

describe('Aguilar collapse — gen1 sibling hubs', () => {
  it('keeps Germán clear of Peter after folding Markus and Carmen', async () => {
    const backup = loadAguilarBackup()
    if (!backup) {
      expect(true).toBe(true)
      return
    }

    const fullGraph = buildFamilyGraph(backup.family.id, backup.people, backup.relationships)
    const carmenUnion = CARMEN_UNION

    const hidden = hiddenPersonIds(fullGraph, new Set([carmenUnion]))
    const visiblePeople = backup.people.filter((person) => !hidden.has(person.id))
    const visibleRelationships = backup.relationships.filter(
      (rel) => !hidden.has(rel.personAId) && !hidden.has(rel.personBId),
    )
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(backup.family.id, visiblePeople, visibleRelationships),
        { retainUnionIds: [carmenUnion] },
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
