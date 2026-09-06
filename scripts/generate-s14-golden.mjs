/**
 * Regenerate three-gen-layout-contract.golden.ts from current engine output.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFamilyGraph } from '../src/domain/family-graph.ts'
import {
  S14_BRANCH_ORDER,
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../src/test/fixtures/three-gen-layout-contract.ts'
import { computeTreeLayout } from '../src/features/tree/layout/compute-tree-layout.ts'
import {
  enginePlacements,
  normalizeEnginePlacements,
} from '../src/features/tree/layout/layout-contract-assertions.ts'
import { buildContractReferenceLayout } from '../src/features/tree/layout/layout-contract-reference.ts'
import { projectFamilyGraph } from '../src/features/tree/layout/project-family-graph.ts'

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/test/fixtures/three-gen-layout-contract.golden.ts',
)

const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
const layout = await computeTreeLayout(projectFamilyGraph(graph))
const reference = buildContractReferenceLayout()

function branchForId(id) {
  if (id.startsWith('g0-')) return 'g0'
  if (id.startsWith('b1-')) return 'b1'
  if (id.startsWith('b2-')) return 'b2'
  if (id.startsWith('b3-')) return 'b3'
  if (id.startsWith('b4-')) return 'b4'
  if (id.startsWith('b5-')) return 'b5'
  return 'b2'
}

function genForId(id) {
  if (id.startsWith('g0-')) return 0
  if (id.includes('-c')) return 2
  return 1
}

const normalized = normalizeEnginePlacements(enginePlacements(layout)).map((p) => {
  const ref = reference.find((entry) => entry.id === p.id)
  return {
    id: p.id,
    x: Math.round(p.x),
    y: Math.round(p.y),
    cx: Math.round(p.cx),
    cy: Math.round(p.cy),
    leftEdge: Math.round(p.leftEdge),
    rightEdge: Math.round(p.rightEdge),
    gen: genForId(p.id),
    birth: ref?.birth ?? 0,
    branch: branchForId(p.id),
    role: ref?.role ?? '',
  }
})

const body = `/**
 * Frozen golden coordinates for the approved S14 three-generation layout.
 *
 * ## Stewardship policy — read before changing this file
 *
 * Regenerated from the layout engine after b2 multi-spouse children are packed
 * as siblings under the full three-parent chain.
 *
 * If a test comparing layout output to this golden fails:
 * 1. **Do not** blindly update these coordinates to make the test pass.
 * 2. Investigate whether the layout engine change is incorrect, or the contract truly changed.
 * 3. Update this file **only** after manual review, a written explanation, and explicit confirmation
 *    that the approved layout contract itself changed.
 *
 * Regenerate candidates: \`npx tsx scripts/generate-s14-golden.mjs\`
 */
import type { S14BranchId } from './three-gen-layout-contract'

export interface GoldenPersonPlacement {
  id: string
  x: number
  y: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
  gen: 0 | 1 | 2
  birth: number
  branch: S14BranchId
  role: string
}

export const THREE_GEN_CONTRACT_GOLDEN: GoldenPersonPlacement[] = ${JSON.stringify(normalized, null, 2)}

export const S14_BRANCH_ORDER = ${JSON.stringify([...S14_BRANCH_ORDER])} as const
`

writeFileSync(outPath, body)
console.log(`Wrote ${outPath} (${normalized.length} people)`)
