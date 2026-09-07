/**
 * Export real engine layouts for layout scenario gallery canvas.
 * Usage: npm run export:layout-canvas
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, cpSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import { TEST_FAMILY_ID } from '../src/test/fixtures/family.ts'
import { buildJoinParentCaseGraph } from '../src/test/fixtures/join-parent-case-graphs.ts'
import { JOIN_PARENT_CASE_IDS, JOIN_PARENT_CASES } from '../src/test/fixtures/join-parent-edge-cases.ts'
import { JOIN_PARENT_EDGE_CASES_GOLDEN } from '../src/test/fixtures/join-parent-edge-cases.golden.ts'
import { LAYOUT_SCENARIO_REGISTRY } from '../src/test/fixtures/layout-scenario-registry.ts'
import {
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../src/test/fixtures/three-gen-layout-contract.ts'
import { THREE_GEN_CONTRACT_GOLDEN } from '../src/test/fixtures/three-gen-layout-contract.golden.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import {
  contractRuleViolations,
  goldenPlacementDiffs,
} from '../src/features/tree/layout/layout-contract-assertions.ts'
import { structureFromModel, assignGenerations } from '../src/features/tree/layout/family-structure.ts'
import {
  analyzeLayout,
  coupleCenteringError,
  invariantFailures,
} from '../src/features/tree/layout/layout-invariants.ts'
import { joinParentGoldenDiffs } from '../src/features/tree/layout/join-parent-contract-reference.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'
import {
  formatColumnLayoutTrace,
  traceLayoutComponentColumnPipeline,
} from '../src/features/tree/layout/column-layout-trace.ts'
import {
  formatJoinLayoutTrace,
  traceLayoutComponentJoinPipeline,
} from '../src/features/tree/layout/join-layout-trace.ts'
import { PERSON_H, ROW_GAP } from '../src/features/tree/layout/layout-spacing.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const cursorCanvasesDir = join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  '.cursor/projects/c-Users-JimBuisman-Desktop-Private/canvases',
)
const templatesDir = join(__dirname, 'canvas-templates')
const outPath = join(cursorCanvasesDir, 'layout-scenario-engine-data.json')
const ROW_STEP = PERSON_H + ROW_GAP

async function layoutOf(people, relationships, options = {}) {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  const model = projectFamilyGraph(graph, options)
  const layout = await computeTreeLayout(model)
  const structure = structureFromModel(model)
  return { layout, structure, model }
}

function centerX(layout, personId) {
  const node = layout.nodes.find((n) => n.personId === personId)
  return node ? node.x + node.width / 2 : 0
}

function coupleMid(layout, leftId, rightId) {
  return (centerX(layout, leftId) + centerX(layout, rightId)) / 2
}

function clusterMid(layout, ids) {
  const centers = ids.map((id) => centerX(layout, id))
  return centers.reduce((sum, value) => sum + value, 0) / centers.length
}

function rowBounds(layout, ids) {
  const nodes = ids
    .map((id) => layout.nodes.find((n) => n.personId === id))
    .filter(Boolean)
  if (nodes.length === 0) return null
  const left = Math.min(...nodes.map((n) => n.x))
  const right = Math.max(...nodes.map((n) => n.x + n.width))
  return { left, right, mid: (left + right) / 2 }
}

function childOrder(layout, ids) {
  return ids
    .map((id) => ({ id, x: layout.nodes.find((n) => n.personId === id)?.x ?? 0 }))
    .sort((a, b) => a.x - b.x)
    .map((entry) => entry.id)
}

function serializeScenario(def, layout, relationships, extraMeta = {}) {
  const nodes = layout.nodes
    .filter((n) => n.kind === 'person')
    .map((n) => ({
      id: n.personId,
      label: n.givenNames,
      x: Math.round(n.x),
      y: Math.round(n.y),
      w: Math.round(n.width),
      h: Math.round(n.height),
    }))
  const displayEdges = relationships.flatMap((r) => {
    if (r.type === 'spouse') return [{ type: 'spouse', from: r.personAId, to: r.personBId }]
    if (r.type === 'parent_child') return [{ type: 'parent_child', from: r.personAId, to: r.personBId }]
    return []
  })
  return {
    meta: {
      id: def.id,
      code: def.code,
      title: def.title,
      group: def.group,
      ...extraMeta,
    },
    nodes,
    displayEdges,
    bounds: layout.bounds,
  }
}

function enrichCousinScenario(id, layout, structure, base) {
  if (id === 's11f') {
    return {
      ...base,
      meta: {
        ...base.meta,
        childOrder: childOrder(layout, ['ab1', 'ab2', 'ab3', 'cd1', 'cd2']),
        centering: {
          aAspMid: coupleMid(layout, 'a', 'asp'),
          aChildrenMid: clusterMid(layout, ['ab1', 'ab2', 'ab3']),
          aErr: coupleCenteringError(layout, structure, ['a', 'asp'], ['ab1', 'ab2', 'ab3']),
          bBsMid: coupleMid(layout, 'b', 'bsp'),
          bChildrenMid: clusterMid(layout, ['cd1', 'cd2']),
          bErr: coupleCenteringError(layout, structure, ['b', 'bsp'], ['cd1', 'cd2']),
        },
      },
    }
  }
  if (id === 's12bThreeGen') {
    const parentRow = rowBounds(layout, ['a', 'asp', 'b', 'bsp', 'c', 'csp'])
    const gfGmMid = coupleMid(layout, 'gf', 'gm')
    return {
      ...base,
      meta: {
        ...base.meta,
        centering: {
          gfGmMid,
          parentRowMid: parentRow?.mid,
          gfOverParentRowErr: gfGmMid != null && parentRow ? Math.abs(gfGmMid - parentRow.mid) : null,
          aErr: coupleCenteringError(layout, structure, ['a', 'asp'], ['a1']),
          bErr: coupleCenteringError(layout, structure, ['b', 'bsp'], ['b1']),
          cErr: coupleCenteringError(layout, structure, ['c', 'csp'], ['c1', 'c2', 'c3', 'c4', 'c5']),
          aMid: coupleMid(layout, 'a', 'asp'),
          aChildrenMid: clusterMid(layout, ['a1']),
          bMid: coupleMid(layout, 'b', 'bsp'),
          bChildrenMid: clusterMid(layout, ['b1']),
          cMid: coupleMid(layout, 'c', 'csp'),
          cChildrenMid: clusterMid(layout, ['c1', 'c2', 'c3', 'c4', 'c5']),
        },
        spans: {
          parentRow,
          childRow: rowBounds(layout, ['a1', 'b1', 'c1', 'c2', 'c3', 'c4', 'c5']),
        },
      },
    }
  }
  if (id === 's12c') {
    return {
      ...base,
      meta: {
        ...base.meta,
        centering: {
          wideErr: coupleCenteringError(layout, structure, ['wide', 'wide-sp'], ['k1', 'k2', 'k3', 'k4', 'k5']),
          narrowErr: coupleCenteringError(layout, structure, ['narrow', 'narrow-sp'], ['n1', 'n1sp', 'n2']),
          wideMid: coupleMid(layout, 'wide', 'wide-sp'),
          wideChildrenMid: clusterMid(layout, ['k1', 'k2', 'k3', 'k4', 'k5']),
          narrowMid: coupleMid(layout, 'narrow', 'narrow-sp'),
          narrowChildrenMid: clusterMid(layout, ['n1', 'n1sp', 'n2']),
          gpMid: clusterMid(layout, ['gp']),
          parentRowMid: (coupleMid(layout, 'wide', 'wide-sp') + coupleMid(layout, 'narrow', 'narrow-sp')) / 2,
          gpOverParentRowErr: Math.abs(
            clusterMid(layout, ['gp']) -
              (coupleMid(layout, 'wide', 'wide-sp') + coupleMid(layout, 'narrow', 'narrow-sp')) / 2,
          ),
        },
      },
    }
  }
  return base
}

function displayEdgesFromRelationships(relationships) {
  return relationships.flatMap((r) => {
    if (r.type === 'spouse') return [{ type: 'spouse', from: r.personAId, to: r.personBId }]
    if (r.type === 'parent_child') return [{ type: 'parent_child', from: r.personAId, to: r.personBId }]
    return []
  })
}

function statusFromFailures(failures) {
  return failures.length === 0 ? 'pass' : 'fail'
}

function writeCanvasFromTemplate(templateName, enginePayload, targetDir, placeholder = '__ENGINE__', constantName = 'ENGINE') {
  const templatePath = join(templatesDir, templateName)
  if (!existsSync(templatePath)) {
    console.warn(`Missing template ${templatePath}`)
    return
  }
  const template = readFileSync(templatePath, 'utf8')
  const engineBlock = `const ${constantName} = ${JSON.stringify(enginePayload, null, 2)};`
  const canvas = template.replace(placeholder, engineBlock)
  const outFile = join(targetDir, templateName)
  writeFileSync(outFile, canvas)
  console.log(`Wrote ${outFile}`)
}

function syncCanvasTypeStubs(targetDir) {
  if (resolve(targetDir) === resolve(cursorCanvasesDir)) return

  const tsconfigSrc = join(cursorCanvasesDir, 'tsconfig.json')
  const tsconfigDest = join(targetDir, 'tsconfig.json')
  if (existsSync(tsconfigSrc)) {
    writeFileSync(tsconfigDest, readFileSync(tsconfigSrc, 'utf8'))
    console.log(`Copied ${tsconfigDest}`)
  }

  for (const rel of ['node_modules/cursor', 'node_modules/@types']) {
    const src = join(cursorCanvasesDir, rel)
    const dest = join(targetDir, rel)
    if (!existsSync(src)) continue
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(src, dest, { recursive: true })
    console.log(`Copied ${dest}`)
  }
}

const scenarios = {}
let passCount = 0
let failCount = 0

for (const def of LAYOUT_SCENARIO_REGISTRY) {
  const { layout, structure } = await layoutOf(def.people, def.relationships, def.projectOptions)
  const report = analyzeLayout(layout, structure)
  const failures =
    def.invariantOptions === false ? [] : invariantFailures(report, def.invariantOptions ?? {})
  const status = statusFromFailures(failures)
  if (status === 'pass') passCount++
  else failCount++

  let serialized = serializeScenario(def, layout, def.relationships, {
    status,
    failures,
    nodeCount: layout.nodes.filter((n) => n.kind === 'person').length,
    width: Math.round(layout.bounds.maxX - layout.bounds.minX),
  })
  serialized = enrichCousinScenario(def.id, layout, structure, serialized)
  scenarios[def.id] = serialized
}

for (const caseId of JOIN_PARENT_CASE_IDS) {
  const meta = JOIN_PARENT_CASES.find((entry) => entry.id === caseId)
  const graphSpec = buildJoinParentCaseGraph(caseId)
  const { layout } = await layoutOf(graphSpec.people, graphSpec.relationships)
  const golden = JOIN_PARENT_EDGE_CASES_GOLDEN[caseId]
  const actual = layout.nodes
    .filter((node) => node.kind === 'person')
    .map((node) => {
      const gen = Math.round(node.y / ROW_STEP)
      return {
        id: node.personId ?? node.id,
        gen,
        x: Math.round(node.x),
        y: Math.round(node.y),
        cx: Math.round(node.x + node.width / 2),
        cy: Math.round(node.y + node.height / 2),
        leftEdge: Math.round(node.x),
        rightEdge: Math.round(node.x + node.width),
      }
    })
  const failures = joinParentGoldenDiffs(actual, golden)
  const status = statusFromFailures(failures)
  if (status === 'pass') passCount++
  else failCount++

  scenarios[caseId] = serializeScenario(
    {
      id: caseId,
      code: meta?.testId,
      title: meta?.title ?? caseId,
      group: 'join',
    },
    layout,
    graphSpec.relationships,
    {
      status,
      failures: failures.slice(0, 8),
      failureCount: failures.length,
      nodeCount: layout.nodes.filter((n) => n.kind === 'person').length,
      width: Math.round(layout.bounds.maxX - layout.bounds.minX),
    },
  )
}

{
  const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
  const model = projectFamilyGraph(graph)
  const layout = await computeTreeLayout(model)
  const ruleViolations = contractRuleViolations(layout)
  const goldenDiffs = goldenPlacementDiffs(layout, THREE_GEN_CONTRACT_GOLDEN)
  const failures = [
    ...ruleViolations.map((v) => `[${v.rule}] ${v.detail}`),
    ...goldenDiffs.slice(0, 5),
  ]
  if (goldenDiffs.length > 5) failures.push(`…and ${goldenDiffs.length - 5} more golden diffs`)
  const status = statusFromFailures(failures)
  if (status === 'pass') passCount++
  else failCount++

  scenarios.s14 = serializeScenario(
    {
      id: 's14',
      code: 'S14',
      title: 'Three-generation layout contract (five gen-1 branches)',
      group: 'contract',
    },
    layout,
    S14_RELATIONSHIPS,
    {
      status,
      failures,
      failureCount: ruleViolations.length + goldenDiffs.length,
      nodeCount: layout.nodes.filter((n) => n.kind === 'person').length,
      width: Math.round(layout.bounds.maxX - layout.bounds.minX),
    },
  )
}

const payload = {
  exportedAt: new Date().toISOString(),
  summary: { total: passCount + failCount, pass: passCount, fail: failCount },
  scenarios,
}

writeFileSync(outPath, JSON.stringify(payload, null, 2))
console.log(`Wrote ${outPath}`)

mkdirSync(cursorCanvasesDir, { recursive: true })
writeCanvasFromTemplate('layout-scenario-gallery.canvas.tsx', payload, cursorCanvasesDir)

const cousinPayload = {
  exportedAt: payload.exportedAt,
  summary: payload.summary,
  scenarios: {
    s11f: scenarios.s11f,
    s12bThreeGen: scenarios.s12bThreeGen,
    s12c: scenarios.s12c,
  },
}
writeCanvasFromTemplate('cousin-layout-decisions.canvas.tsx', cousinPayload, cursorCanvasesDir)

if (scenarios.deepCousinColumn) {
  writeCanvasFromTemplate(
    'deep-cousin-column-scenario.canvas.tsx',
    scenarios.deepCousinColumn,
    cursorCanvasesDir,
    '__SCENARIO__',
    'SCENARIO',
  )
}

if (scenarios.joinDeepCousin) {
  writeCanvasFromTemplate(
    'join-deep-cousin-scenario.canvas.tsx',
    scenarios.joinDeepCousin,
    cursorCanvasesDir,
    '__SCENARIO__',
    'SCENARIO',
  )

  const jdcDef = LAYOUT_SCENARIO_REGISTRY.find((def) => def.id === 'joinDeepCousin')
  if (jdcDef) {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, jdcDef.people, jdcDef.relationships)
    const model = projectFamilyGraph(graph, jdcDef.projectOptions)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const trace = traceLayoutComponentJoinPipeline(persons, unions, structure, generations)
    console.log(`JDC join-layout pipeline:\n${formatJoinLayoutTrace(trace)}`)
    writeCanvasFromTemplate(
      'jdc-layout-pipeline.canvas.tsx',
      {
        meta: {
          code: 'JDC-PIPE',
          title: 'JDC join-parent pipeline — step through each phase',
          scenarioCode: 'JDC',
          stepCount: trace.stages.length,
          exportedAt: payload.exportedAt,
        },
        stages: trace.stages,
        displayEdges: displayEdgesFromRelationships(jdcDef.relationships),
      },
      cursorCanvasesDir,
      '__PIPELINE__',
      'PIPELINE',
    )
  }
}

if (scenarios.wideFourGenPedigree) {
  writeCanvasFromTemplate(
    'wide-four-gen-pedigree-scenario.canvas.tsx',
    scenarios.wideFourGenPedigree,
    cursorCanvasesDir,
    '__SCENARIO__',
    'SCENARIO',
  )

  const w3gDef = LAYOUT_SCENARIO_REGISTRY.find((def) => def.id === 'wideFourGenPedigree')
  if (w3gDef) {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, w3gDef.people, w3gDef.relationships)
    const model = projectFamilyGraph(graph, w3gDef.projectOptions)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const trace = traceLayoutComponentColumnPipeline(persons, unions, structure, generations)
    console.log(`W3G column-layout pipeline:\n${formatColumnLayoutTrace(trace)}`)
    writeCanvasFromTemplate(
      'w3g-layout-pipeline.canvas.tsx',
      {
        meta: {
          code: 'W3G-PIPE',
          title: 'W3G column-layout pipeline — step through each phase',
          scenarioCode: 'W3G',
          stepCount: trace.stages.length,
          exportedAt: payload.exportedAt,
        },
        stages: trace.stages,
        displayEdges: displayEdgesFromRelationships(w3gDef.relationships),
      },
      cursorCanvasesDir,
      '__PIPELINE__',
      'PIPELINE',
    )
  }
}

for (const [key, data] of Object.entries(scenarios)) {
  console.log(`${key}: ${data.meta.status} · ${data.meta.nodeCount} nodes · ${data.meta.width}px wide`)
}
console.log(`Summary: ${passCount} pass, ${failCount} fail`)
