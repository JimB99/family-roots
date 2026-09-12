import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateFamilyBackup } from '../../../features/backup/family-backup-schema'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { assignGenerations, structureFromModel } from './family-structure'
import { contractPipelineStepOrder } from './contract-layout-trace-steps'
import { formatContractLayoutTrace, traceLayoutComponentContractPipeline } from './contract-layout-trace'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

const REGRESSION_BACKUP_PATH = join(process.cwd(), 'test-data/regression-family-backup.json')

const VIKTORIA_ID = 'c2rhuEFVsjPMOFcbG9lB'
const NADJA_ID = 'fq5BYflcV2GP4hve6H5i'
const BENJAMIN_ID = 'BOjDu3te5oDQOekeyzvR'

function loadRegressionFamilyBackup() {
  const raw = JSON.parse(readFileSync(REGRESSION_BACKUP_PATH, 'utf8'))
  const validated = validateFamilyBackup(raw)
  if (!validated.ok) throw new Error(validated.error)
  return validated.backup
}

describe('contract layout pipeline trace (regression family)', () => {
  it('traces the large regression family backup', async () => {
    const backup = loadRegressionFamilyBackup()
    const graph = buildFamilyGraph(backup.family.id, backup.people, backup.relationships)
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)

    const trace = traceLayoutComponentContractPipeline(persons, unions, structure, generations)
    const layout = await computeTreeLayout(model)

    expect(trace.deferJoinHorizontalPack).toBe(true)
    expect(trace.stages.map((stage) => stage.step)).toEqual(
      contractPipelineStepOrder(true),
    )
    expect(trace.stages.at(-1)!.step).toBe('withUnions')
    expect(formatContractLayoutTrace(trace)).toContain('pipeline: join')

    const finalStage = trace.stages.at(-1)!
    const finalPersons = layout.nodes.filter((node) => node.kind === 'person')
    for (const person of finalPersons) {
      const traced = finalStage.nodes.find((node) => node.id === person.personId)
      expect(traced, `missing ${person.personId}`).toBeDefined()
      expect(traced!.x).toBe(Math.round(person.x))
      expect(traced!.y).toBe(Math.round(person.y))
    }

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }
    const nadja = node(NADJA_ID)
    const benjamin = node(BENJAMIN_ID)
    expect(node(VIKTORIA_ID).x).toBeGreaterThan(nadja.x)
    expect(node(VIKTORIA_ID).x).toBeLessThan(benjamin.x)

    const joinPack = trace.stages.find((stage) => stage.step === 'joinPackDescendants')
    const joinParent = trace.stages.find((stage) => stage.step === 'joinParentPlacement')
    const withUnionsStage = trace.stages.find((stage) => stage.step === 'withUnions')
    if (joinPack && joinParent && withUnionsStage) {
      expect(joinPack.metrics.width).toBeLessThan(40_642)
      expect(joinPack.metrics.maxCousinSlack).toBeLessThan(joinParent.metrics.maxCousinSlack)
      expect(withUnionsStage.metrics.width).toBeLessThan(42_234)
    }
  })
})
