/**
 * Export Aguilar real-family layout pipeline canvas from a family backup JSON.
 * Usage: npm run export:aguilar-canvas [path-to-backup.json]
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
const cursorCanvasesDir = join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  '.cursor/projects/c-Users-JimBuisman-Desktop-Private/canvases',
)

const defaultPaths = [
  join(repoRoot, 'test-data/aguilar-backup.json'),
  'c:/Users/JimBuisman/Downloads/aguilar-backup.json',
]

function resolveBackupPath(argPath) {
  if (argPath && existsSync(argPath)) return resolve(argPath)
  for (const candidate of defaultPaths) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    'Aguilar backup not found. Pass path as argument or place at test-data/aguilar-backup.json',
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
    code: 'AGU-PIPE',
    title: 'Aguilar layout pipeline — real family backup',
    scenarioCode: 'Aguilar',
    stepCount: trace.stages.length,
    pipelinePath: trace.deferJoinHorizontalPack ? 'join' : 'column',
    nodeCount: persons.length,
    exportedAt: new Date().toISOString(),
  },
  stages: trace.stages,
  displayEdges: displayEdgesFromRelationships(backup.relationships),
}

writeCanvasFromTemplate('aguilar-layout-pipeline.canvas.tsx', payload, cursorCanvasesDir)
