import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateFamilyBackup } from '../../../features/backup/family-backup-schema'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { assignGenerations, structureFromModel } from './family-structure'
import { contractPipelineStepOrder } from './contract-layout-trace-steps'
import { formatContractLayoutTrace, traceLayoutComponentContractPipeline } from './contract-layout-trace'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

const VIKTORIA_ID = 'c2rhuEFVsjPMOFcbG9lB'
const MARKUS_ID = 'ARdnZDZVUlWu14bHVeHX'

const backupCandidates = [
  join(process.cwd(), 'test-data/aguilar-backup.json'),
  'c:/Users/JimBuisman/Downloads/aguilar-backup.json',
]

function loadAguilarBackup() {
  const path = backupCandidates.find((candidate) => existsSync(candidate))
  if (!path) return null
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const validated = validateFamilyBackup(raw)
  if (!validated.ok) throw new Error(validated.error)
  return { backup: validated.backup, path }
}

describe('contract layout pipeline trace (Aguilar)', () => {
  it('traces the real Aguilar backup when available', async () => {
    const loaded = loadAguilarBackup()
    if (!loaded) {
      expect(true).toBe(true)
      return
    }

    const { backup } = loaded
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
    const nadja = layout.nodes.find((entry) => entry.givenNames === 'Nadja' && entry.personId !== MARKUS_ID)
    const benjamin = layout.nodes.find(
      (entry) => entry.givenNames === 'Benjamin' && entry.personId !== MARKUS_ID,
    )
    if (nadja && benjamin) {
      expect(node(VIKTORIA_ID).x).toBeGreaterThan(nadja.x)
      expect(node(VIKTORIA_ID).x).toBeLessThan(benjamin.x)
    }

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
