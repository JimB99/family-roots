/**
 * Export large regression-family layout pipeline canvas from anonymized backup JSON.
 * Usage: npm run export:regression-family-canvas [path-to-backup.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateFamilyBackup } from '../src/features/backup/family-backup-schema.ts'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { assignGenerations, structureFromModel } from '../src/features/tree/layout/family-structure.ts'
import {
  formatContractLayoutTrace,
  traceLayoutComponentContractPipeline,
} from '../src/features/tree/layout/contract-layout-trace.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const templatesDir = join(__dirname, 'canvas-templates')
const defaultBackupPath = join(repoRoot, 'test-data/regression-family-backup.json')
const cursorCanvasesDir =
  process.env.CURSOR_CANVASES_DIR ?? join(repoRoot, 'canvases')

function resolveBackupPath(argPath) {
  if (argPath && existsSync(argPath)) return resolve(argPath)
  if (existsSync(defaultBackupPath)) return defaultBackupPath
  throw new Error(
    'Regression family backup not found. Pass path as argument or place at test-data/regression-family-backup.json',
  )
}

function displayEdgesFromRelationships(relationships) {
  return relationships.flatMap((r) => {
    if (r.type === 'spouse') return [{ type: 'spouse', from: r.personAId, to: r.personBId }]
    if (r.type === 'parent_child') return [{ type: 'parent_child', from: r.personAId, to: r.personBId }]
    return []
  })
}

function writeCanvasFromTemplate(templateName, payload, targetDir) {
  const templatePath = join(templatesDir, templateName)
  const template = readFileSync(templatePath, 'utf8')
  const block = `const PIPELINE = ${JSON.stringify(payload, null, 2)};`
  const canvas = template.replace('__PIPELINE__', block)
  mkdirSync(targetDir, { recursive: true })
  const outFile = join(targetDir, templateName)
  writeFileSync(outFile, canvas)
  console.log(`Wrote ${outFile}`)
}

const backupPath = resolveBackupPath(process.argv[2])
console.log(`Loading ${backupPath}`)
const raw = JSON.parse(readFileSync(backupPath, 'utf8'))
const validated = validateFamilyBackup(raw)
if (!validated.ok) throw new Error(validated.error)
const backup = validated.backup

const graph = buildFamilyGraph(backup.family.id, backup.people, backup.relationships)
const model = projectFamilyGraph(graph)
const structure = structureFromModel(model)
const persons = model.nodes.filter((node) => node.kind === 'person')
const unions = model.nodes.filter((node) => node.kind === 'union')
const generations = assignGenerations(persons.map((node) => node.id), structure)

console.log(`Tracing ${persons.length} people…`)
const trace = traceLayoutComponentContractPipeline(persons, unions, structure, generations)
console.log(formatContractLayoutTrace(trace))

const payload = {
  meta: {
    code: 'REG-PIPE',
    title: 'Regression family layout pipeline — large anonymized backup',
    scenarioCode: 'RegressionFamily',
    stepCount: trace.stages.length,
    pipelinePath: trace.deferJoinHorizontalPack ? 'join' : 'column',
    nodeCount: persons.length,
    exportedAt: new Date().toISOString(),
  },
  stages: trace.stages,
  displayEdges: displayEdgesFromRelationships(backup.relationships),
}

writeCanvasFromTemplate('regression-family-layout-pipeline.canvas.tsx', payload, cursorCanvasesDir)
